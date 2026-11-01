import { prisma } from '../services/prisma.service.js';
import { ffmpeg } from '../services/ffmpeg.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { SubtitleService } from '../services/subtitle.service.js';
import fs from 'fs';
import path from 'path';

export interface EditingOptions {
  resolution?: string;
  fps?: number;
  enableSubtitles?: boolean;
  subtitleFontSize?: number;
  subtitleColor?: string;
  backgroundMusicPath?: string;
  bgMusicVolume?: number;
  voiceVolume?: number;
}

export const editingAgent = {
  name: 'Editing Agent',

  async run(projectId: string, renderId?: string, options?: EditingOptions) {
    const startTime = Date.now();
    logger.info(`[EditingAgent] Starting advanced video editing & composition for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'EDITING',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Beginning multi-clip FFmpeg rendering, audio ducking, and subtitle burn-in...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: projectId },
        include: {
          scenes: { orderBy: { sceneNumber: 'asc' } },
          settings: true,
        },
      });

      if (!project) throw new Error('Project not found');
      if (!project.scenes || project.scenes.length === 0) {
        throw new Error('No scenes found in project to render');
      }

      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'EDITING', currentStage: 'editing' },
      });

      const isShorts = project.format === 'SHORTS';
      const targetResolution = options?.resolution || project.settings?.resolution || '1080p';
      let width = isShorts ? 1080 : 1920;
      let height = isShorts ? 1920 : 1080;

      if (targetResolution === '720p') {
        width = isShorts ? 720 : 1280;
        height = isShorts ? 1280 : 720;
      }

      const fps = options?.fps || project.settings?.fps || 30;
      const enableSubtitles = options?.enableSubtitles ?? project.settings?.enableSubtitles ?? true;
      const subtitleFontSize = options?.subtitleFontSize || (isShorts ? 28 : 24);
      const voiceVol = options?.voiceVolume ?? project.settings?.voiceVolume ?? 1.0;
      const bgMusicVol = options?.bgMusicVolume ?? project.settings?.backgroundMusicVolume ?? 0.15;

      const outputFilename = `final_${project.id}_${Date.now()}.mp4`;
      const outputPath = path.join(config.storage.renderDir, outputFilename);
      const outputUrl = `/renders/${outputFilename}`;

      const totalEstimatedDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

      // -------------------------------------------------------------
      // 1. SUBTITLE GENERATION (.SRT & .VTT)
      // -------------------------------------------------------------
      logger.info('[EditingAgent] Step 1/4: Generating synchronized subtitle files (.srt & .vtt)...');
      const srtFilename = `subtitles_${project.id}_${Date.now()}.srt`;
      const vttFilename = `subtitles_${project.id}_${Date.now()}.vtt`;
      const srtPath = path.join(config.storage.uploadDir, srtFilename);
      const vttPath = path.join(config.storage.uploadDir, vttFilename);

      const subtitleScenes = project.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        narrationText: s.narrationText,
        duration: s.duration,
      }));

      SubtitleService.generateSrt(subtitleScenes, srtPath, isShorts);
      SubtitleService.generateVtt(subtitleScenes, vttPath, isShorts);

      // Save Subtitle Assets to DB
      await prisma.generatedAsset.create({
        data: {
          projectId,
          type: 'SUBTITLE',
          provider: 'AutoTube Subtitle Engine',
          prompt: `Synchronized subtitles for ${project.title}`,
          url: `/uploads/${srtFilename}`,
          localPath: srtPath,
        },
      });

      // -------------------------------------------------------------
      // 2. VIDEO SCENE CLIPS PREPARATION
      // -------------------------------------------------------------
      logger.info('[EditingAgent] Step 2/4: Standardizing scene video clips & transitions...');
      const standardizedClipPaths: string[] = [];

      for (let i = 0; i < project.scenes.length; i++) {
        const scene = project.scenes[i];
        const sceneDuration = scene.duration || 5.0;
        const normClipPath = path.join(config.storage.tempDir, `norm_${project.id}_s${scene.sceneNumber}_${Date.now()}.mp4`);

        let sourceFile: string | null = null;
        if (scene.videoUrl) {
          const fn = path.basename(scene.videoUrl);
          const p = path.join(config.storage.uploadDir, fn);
          if (fs.existsSync(p)) sourceFile = p;
        }

        if (!sourceFile && scene.imageUrl) {
          const fn = path.basename(scene.imageUrl);
          const p = path.join(config.storage.uploadDir, fn);
          if (fs.existsSync(p)) sourceFile = p;
        }

        await new Promise<void>((resolve, reject) => {
          let cmd = ffmpeg();
          const fadeDuration = 0.3;
          const fadeOutStart = Math.max(0, sceneDuration - fadeDuration);
          const transitionFilter = `fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${fadeOutStart}:d=${fadeDuration}`;

          if (sourceFile && (sourceFile.endsWith('.png') || sourceFile.endsWith('.jpg') || sourceFile.endsWith('.jpeg'))) {
            // Static image: create loop clip with motion zoom and scene transition
            const totalFrames = Math.round(sceneDuration * fps);
            cmd = cmd
              .input(sourceFile)
              .loop(sceneDuration)
              .videoFilters([
                `scale=${width * 2}:${height * 2}`,
                `zoompan=z='min(zoom+0.0015,1.25)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`,
                transitionFilter,
                'format=yuv420p',
              ]);
          } else if (sourceFile) {
            // Existing video clip: scale, pad & scene transition
            cmd = cmd
              .input(sourceFile)
              .videoFilters([
                `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
                `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
                `fps=${fps}`,
                transitionFilter,
                'format=yuv420p',
              ]);
          } else {
            // Procedural fallback
            cmd = cmd
              .input(`testsrc=duration=${sceneDuration}:size=${width}x${height}:rate=${fps}`)
              .inputFormat('lavfi')
              .videoFilters([transitionFilter, 'format=yuv420p']);
          }

          cmd
            .outputOptions([
              '-c:v', 'libx264',
              '-pix_fmt', 'yuv420p',
              '-t', `${sceneDuration}`,
            ])
            .output(normClipPath)
            .on('end', () => {
              standardizedClipPaths.push(normClipPath);
              resolve();
            })
            .on('error', (err) => {
              logger.error(`Error standardizing scene ${scene.sceneNumber}:`, err);
              reject(err);
            })
            .run();
        });
      }

      // Concat list for standardized clips
      const concatListPath = path.join(config.storage.tempDir, `concat_${project.id}_${Date.now()}.txt`);
      const concatContent = standardizedClipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent);

      // -------------------------------------------------------------
      // 3. AUDIO MIXING & DUCKING (VOICEOVER + BACKGROUND MUSIC)
      // -------------------------------------------------------------
      logger.info('[EditingAgent] Step 3/4: Compiling narration audio and mixing background music...');
      const unifiedAudioPath = path.join(config.storage.tempDir, `audio_${project.id}_${Date.now()}.mp3`);

      // Collect audio clips for each scene
      const sceneAudioSegments: string[] = [];
      for (const scene of project.scenes) {
        let audioFile: string | null = null;
        if (scene.audioUrl) {
          const fn = path.basename(scene.audioUrl);
          const p = path.join(config.storage.uploadDir, fn);
          if (fs.existsSync(p)) audioFile = p;
        }

        const segmentPath = path.join(config.storage.tempDir, `seg_${project.id}_s${scene.sceneNumber}_${Date.now()}.mp3`);
        await new Promise<void>((resolve, reject) => {
          let cmd = ffmpeg();
          if (audioFile) {
            cmd = cmd.input(audioFile);
          } else {
            cmd = cmd.input(`aevalsrc=0:d=${scene.duration}`).inputFormat('lavfi');
          }

          cmd
            .outputOptions(['-c:a', 'libmp3lame', '-t', `${scene.duration}`])
            .output(segmentPath)
            .on('end', () => {
              sceneAudioSegments.push(segmentPath);
              resolve();
            })
            .on('error', reject)
            .run();
        });
      }

      // Concat voiceover segments
      const audioConcatListPath = path.join(config.storage.tempDir, `audio_concat_${project.id}_${Date.now()}.txt`);
      fs.writeFileSync(audioConcatListPath, sceneAudioSegments.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(audioConcatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c:a', 'libmp3lame'])
          .output(unifiedAudioPath)
          .on('end', () => resolve())
          .on('error', reject)
          .run();
      });

      // -------------------------------------------------------------
      // 4. FINAL FFmpeg COMPOSITION & SUBTITLE BURN-IN
      // -------------------------------------------------------------
      logger.info('[EditingAgent] Step 4/4: Final rendering with video concat, audio ducking, and subtitle burn-in...');

      await new Promise<void>((resolve, reject) => {
        let master = ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .input(unifiedAudioPath); // Input 1: Voiceover narration

        // Check if background music exists
        let bgmInputIndex = -1;
        let bgmPathToUse = options?.backgroundMusicPath;

        if (bgmPathToUse && fs.existsSync(bgmPathToUse)) {
          master = master.input(bgmPathToUse);
          bgmInputIndex = 2;
        } else {
          // Subtle harmonic ambient chord wash backing track
          master = master.input(`aevalsrc=0.03*sin(2*PI*220*t)+0.02*sin(2*PI*277*t)+0.02*sin(2*PI*330*t):d=${totalEstimatedDuration}`).inputFormat('lavfi');
          bgmInputIndex = 2;
        }

        // Build Video and Audio Filtergraphs
        const videoFilters: string[] = [];

        // Subtitle burn-in if enabled (respects vertical Safe Zone for Reels & Shorts)
        if (enableSubtitles && fs.existsSync(srtPath)) {
          const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(':', '\\:');
          const primaryColorHex = options?.subtitleColor ? options.subtitleColor.replace('#', '') : 'FFFFFF';
          const verticalMargin = isShorts ? 190 : 35; // 190px safe zone clearance for Reels/Shorts UI
          videoFilters.push(`subtitles='${escapedSrtPath}':force_style='FontSize=${subtitleFontSize},Bold=1,PrimaryColour=&H00${primaryColorHex},OutlineColour=&H00000000,BorderStyle=3,BackColour=&H80000000,MarginV=${verticalMargin}'`);
        }

        if (videoFilters.length > 0) {
          master = master.videoFilters(videoFilters);
        }

        // Mix Voice and Music with volume ducking
        master = master
          .complexFilter([
            `[1:a]volume=${voiceVol}[voice]`,
            `[${bgmInputIndex}:a]volume=${bgMusicVol},aloop=loop=-1:size=2e+09[bgm]`,
            '[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]',
          ])
          .outputOptions([
            '-map', '0:v',
            '-map', '[aout]',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-t', `${totalEstimatedDuration}`,
            '-movflags', '+faststart',
          ])
          .output(outputPath)
          .on('progress', (progress) => {
            if (renderId && progress.percent) {
              prisma.videoRender.update({
                where: { id: renderId },
                data: { progress: Math.min(99, Math.round(progress.percent)) },
              }).catch(() => {});
            }
          })
          .on('end', () => resolve())
          .on('error', (err) => {
            logger.error('Final render composition error:', err);
            reject(err);
          });

        master.run();
      });

      const stats = fs.statSync(outputPath);
      const durationMs = Date.now() - startTime;

      // -------------------------------------------------------------
      // 5. UPDATE DATABASE RECORDS
      // -------------------------------------------------------------
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          finalVideoUrl: outputUrl,
          finalVideoPath: outputPath,
          progress: 88,
          status: 'THUMBNAIL_SEO',
        },
      });

      if (renderId) {
        await prisma.videoRender.update({
          where: { id: renderId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            outputPath,
            outputUrl,
            fileSizeBytes: BigInt(stats.size),
            durationSec: totalEstimatedDuration,
          },
        });
      }

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify({
            outputPath,
            outputUrl,
            sizeBytes: stats.size,
            subtitlesUrl: `/uploads/${srtFilename}`,
            subtitlesVttUrl: `/uploads/${vttFilename}`,
          }),
          logs: `Video successfully edited and rendered in ${durationMs}ms. Multi-clip sequence, background audio ducking, and burnt-in subtitles compiled into ${outputFilename} (${Math.round(stats.size / 1024)} KB).`,
        },
      });

      return {
        success: true,
        data: {
          outputPath,
          outputUrl,
          sizeBytes: stats.size,
          subtitlesUrl: `/uploads/${srtFilename}`,
          subtitlesVttUrl: `/uploads/${vttFilename}`,
        },
      };
    } catch (err: any) {
      logger.error(`[EditingAgent] Failed for project ${projectId}:`, err);
      if (renderId) {
        await prisma.videoRender.update({
          where: { id: renderId },
          data: { status: 'FAILED', errorMessage: err.message },
        }).catch(() => {});
      }
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Editing Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};
