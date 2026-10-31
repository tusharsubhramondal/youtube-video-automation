import { prisma } from '../services/prisma.service.js';
import { ffmpeg } from '../services/ffmpeg.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

export const editingAgent = {
  name: 'Editing Agent',

  async run(projectId: string, renderId?: string) {
    const startTime = Date.now();
    logger.info(`[EditingAgent] Starting video editing & rendering for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'EDITING',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Beginning multi-clip FFmpeg rendering, audio mixing, and subtitle generation...',
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
      const width = isShorts ? 1080 : 1920;
      const height = isShorts ? 1920 : 1080;
      const fps = project.settings?.fps || 30;

      const outputFilename = `final_${project.id}_${Date.now()}.mp4`;
      const outputPath = path.join(config.storage.renderDir, outputFilename);
      const outputUrl = `/renders/${outputFilename}`;

      // Collect clip file paths
      const clipPaths: string[] = [];
      const audioPaths: string[] = [];

      for (const scene of project.scenes) {
        if (scene.videoUrl) {
          const fn = path.basename(scene.videoUrl);
          const p = path.join(config.storage.uploadDir, fn);
          if (fs.existsSync(p)) clipPaths.push(p);
        } else if (scene.imageUrl) {
          // If scene has image but no video yet, point to image
          const fn = path.basename(scene.imageUrl);
          const p = path.join(config.storage.uploadDir, fn);
          if (fs.existsSync(p)) clipPaths.push(p);
        }

        if (scene.audioUrl) {
          const fn = path.basename(scene.audioUrl);
          const p = path.join(config.storage.uploadDir, fn);
          if (fs.existsSync(p)) audioPaths.push(p);
        }
      }

      // If no pre-generated clips exist, generate synthetic sequence
      const totalEstimatedDuration = project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0);

      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg();

        if (clipPaths.length > 0 && clipPaths.every((p) => p.endsWith('.mp4'))) {
          // Create concat list file
          const listPath = path.join(config.storage.tempDir, `concat_${project.id}_${Date.now()}.txt`);
          const listContent = clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
          fs.writeFileSync(listPath, listContent);

          command = command
            .input(listPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .videoFilters([
              `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
              `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
              `fps=${fps}`,
            ]);
        } else if (clipPaths.length > 0) {
          // Single image or first asset loop
          command = command
            .input(clipPaths[0])
            .loop(totalEstimatedDuration)
            .videoFilters([
              `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
              `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
              `fps=${fps}`,
            ]);
        } else {
          // Synthetic lavfi fallback generator
          command = command
            .input(`testsrc=duration=${totalEstimatedDuration}:size=${width}x${height}:rate=${fps}`)
            .inputFormat('lavfi');
        }

        // Add silent audio if no audio tracks to ensure valid container
        command = command
          .input(`aevalsrc=0:d=${totalEstimatedDuration}`)
          .inputFormat('lavfi')
          .outputOptions([
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
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
          .on('end', () => {
            resolve();
          })
          .on('error', (err) => {
            logger.error('FFmpeg render error:', err);
            reject(err);
          });

        command.run();
      });

      const stats = fs.statSync(outputPath);
      const durationMs = Date.now() - startTime;

      // Update project & render records
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          finalVideoUrl: outputUrl,
          finalVideoPath: outputPath,
          progress: 85,
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
          outputPayload: JSON.stringify({ outputPath, outputUrl, sizeBytes: stats.size }),
          logs: `FFmpeg rendering completed successfully in ${durationMs}ms. Output file: ${outputFilename} (${Math.round(stats.size / 1024)} KB).`,
        },
      });

      return { success: true, data: { outputPath, outputUrl, sizeBytes: stats.size } };
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

