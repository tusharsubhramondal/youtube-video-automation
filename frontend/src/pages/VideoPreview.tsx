import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Film,
  Play,
  Download,
  RotateCcw,
  Sparkles,
  Share2,
  CheckCircle2,
  Sliders,
  Clock,
  Subtitles,
  FileText,
  Volume2,
} from 'lucide-react';
import { projectService, renderService } from '../services/api';
import { VideoProject, VideoRender, GeneratedAsset } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const VideoPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projectId] = useState<string>(id || localStorage.getItem('activeProjectId') || '');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [activeRender, setActiveRender] = useState<VideoRender | null>(null);
  const [subtitleAsset, setSubtitleAsset] = useState<GeneratedAsset | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [resolution, setResolution] = useState('1080p');
  const [fps, setFps] = useState(30);
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [subtitleFontSize, setSubtitleFontSize] = useState(24);
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF');
  const [bgMusicVol, setBgMusicVol] = useState(0.15);
  const [voiceVol, setVoiceVol] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProject();
      loadSubtitles();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
      if (data.renders && data.renders.length > 0) {
        setActiveRender(data.renders[0]);
      }
      if (data.settings) {
        setResolution(data.settings.resolution || '1080p');
        setFps(data.settings.fps || 30);
        setEnableSubtitles(data.settings.enableSubtitles ?? true);
        setSubtitleFontSize(data.settings.subtitleFontSize || 24);
        setSubtitleColor(data.settings.subtitleColor || '#FFFFFF');
        setBgMusicVol(data.settings.backgroundMusicVolume ?? 0.15);
        setVoiceVol(data.settings.voiceVolume ?? 1.0);
      }
    } catch (err) {
      console.error('Failed to load project preview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubtitles = async () => {
    try {
      const sub = await renderService.getSubtitles(projectId);
      setSubtitleAsset(sub);
    } catch {
      // Subtitle asset may not be created yet
    }
  };

  const handleStartRender = async () => {
    if (!projectId) return;
    setIsRendering(true);
    try {
      const renderRecord = await renderService.triggerRender(projectId, {
        resolution,
        fps,
        enableSubtitles,
        subtitleFontSize,
        subtitleColor,
        bgMusicVolume: bgMusicVol,
        voiceVolume: voiceVol,
      });
      setActiveRender(renderRecord);

      // Poll render status every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const status = await renderService.getRenderStatus(renderRecord.id);
          setActiveRender(status);
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsRendering(false);
            await loadProject();
            await loadSubtitles();
          }
        } catch {
          clearInterval(pollInterval);
          setIsRendering(false);
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to trigger render:', err);
      setIsRendering(false);
      alert('Failed to start video rendering.');
    }
  };

  if (isLoading || !project) {
    return <div className="p-12 text-center text-slate-400">Loading video preview...</div>;
  }

  const isShorts = project.format === 'SHORTS';
  const vttUrl = subtitleAsset?.url ? subtitleAsset.url.replace('.srt', '.vtt') : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Final Video Preview & Render</h1>
            <Badge variant={isShorts ? 'purple' : 'info'}>
              {isShorts ? '9:16 Shorts' : '16:9 Landscape'}
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            FFmpeg multi-clip engine with audio ducking, synchronized subtitles, and 1080p rendering
          </p>
        </div>

        <div className="flex items-center gap-3">
          {subtitleAsset && (
            <a
              href={subtitleAsset.url}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-brand-400" />
              Download Subtitles (.SRT)
            </a>
          )}

          {project.finalVideoUrl && (
            <a
              href={project.finalVideoUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </a>
          )}

          <Button
            variant="primary"
            icon={<Share2 className="w-4 h-4" />}
            onClick={() => navigate('/youtube')}
          >
            Publish to YouTube
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Display */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 flex flex-col items-center justify-center bg-slate-950 min-h-[460px]">
            {project.finalVideoUrl ? (
              <div
                className={`relative rounded-xl overflow-hidden shadow-2xl bg-black ${
                  isShorts ? 'w-[320px] aspect-[9/16]' : 'w-full aspect-video'
                }`}
              >
                <video
                  src={project.finalVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  {vttUrl && (
                    <track
                      kind="subtitles"
                      src={vttUrl}
                      srcLang="en"
                      label="English"
                      default
                    />
                  )}
                </video>
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Film className="w-8 h-8 text-brand-400 opacity-60" />
                </div>
                <h3 className="text-lg font-bold text-white">Video Not Yet Rendered</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click the Render button to compile all scene clips, voiceover tracks, background music, and subtitles into a master MP4.
                </p>
                <Button
                  variant="primary"
                  icon={<Sparkles className="w-4 h-4" />}
                  isLoading={isRendering}
                  onClick={handleStartRender}
                >
                  Start FFmpeg Render
                </Button>
              </div>
            )}
          </Card>

          {/* Render progress bar if active */}
          {activeRender && (isRendering || activeRender.status === 'PROCESSING') && (
            <Card className="p-4 space-y-2 border-brand-500/50 bg-brand-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-400 animate-spin" />
                  FFmpeg Multi-Track Composition in Progress...
                </span>
                <span className="font-mono text-brand-300 font-bold">{activeRender.progress || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeRender.progress || 0}%` }}
                ></div>
              </div>
            </Card>
          )}
        </div>

        {/* Rendering Control Panel */}
        <div className="space-y-4">
          <Card className="space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              Render & Subtitle Settings
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">Target Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value="1080p">1080p Full HD ({isShorts ? '1080x1920' : '1920x1080'})</option>
                  <option value="720p">720p HD ({isShorts ? '720x1280' : '1280x720'})</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1">Frame Rate</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                >
                  <option value={30}>30 FPS (Standard)</option>
                  <option value={60}>60 FPS (Ultra Smooth)</option>
                </select>
              </div>

              {/* Subtitles Customization */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-white flex items-center gap-1.5 cursor-pointer">
                    <Subtitles className="w-3.5 h-3.5 text-brand-400" />
                    Burn-In Subtitles
                  </label>
                  <input
                    type="checkbox"
                    checked={enableSubtitles}
                    onChange={(e) => setEnableSubtitles(e.target.checked)}
                    className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
                  />
                </div>

                {enableSubtitles && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 block mb-1">Font Size</span>
                      <select
                        value={subtitleFontSize}
                        onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                      >
                        <option value={18}>Small (18pt)</option>
                        <option value={24}>Medium (24pt)</option>
                        <option value={30}>Large (30pt)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Text Color</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={subtitleColor}
                          onChange={(e) => setSubtitleColor(e.target.value)}
                          className="w-7 h-7 rounded bg-transparent cursor-pointer border border-slate-800"
                        />
                        <span className="font-mono text-[10px] text-slate-300">{subtitleColor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Mixing & Ducking */}
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Voice Narration Volume</span>
                  <span className="font-mono font-bold text-white">{Math.round(voiceVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={voiceVol}
                  onChange={(e) => setVoiceVol(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Background Music Ducking</span>
                  <span className="font-mono font-bold text-white">{Math.round(bgMusicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.02"
                  value={bgMusicVol}
                  onChange={(e) => setBgMusicVol(Number(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              variant="primary"
              icon={<RotateCcw className="w-4 h-4" />}
              isLoading={isRendering}
              onClick={handleStartRender}
            >
              {project.finalVideoUrl ? 'Re-Render Master MP4' : 'Render Video (FFmpeg)'}
            </Button>
          </Card>

          {/* Render Metadata */}
          {activeRender && (
            <Card className="space-y-2 text-xs">
              <h4 className="font-semibold text-slate-300">Last Render Details</h4>
              <div className="space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={activeRender.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                    {activeRender.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="font-mono text-slate-200">{activeRender.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frame Rate:</span>
                  <span className="font-mono text-slate-200">{activeRender.fps} fps</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
