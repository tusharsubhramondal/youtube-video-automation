import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  Film,
  Image as ImageIcon,
  Search,
  Share2,
  Clock,
  Cpu,
  FolderOpen,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Download,
  Volume2,
} from 'lucide-react';
import { projectService, agentService, metaService, renderService } from '../services/api';
import { VideoProject } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { WorkflowProgress } from '../components/project/WorkflowProgress';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<VideoProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);
  const [publishedReels, setPublishedReels] = useState<any[]>([]);
  const [isPublishingReel, setIsPublishingReel] = useState<string | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleRemixAudio = async () => {
    if (!project) return;
    setIsRemixing(true);
    try {
      await renderService.triggerRender(project.id);
      navigate(`/project/${project.id}/preview`);
    } catch (err: any) {
      console.error('Failed to trigger re-mix render:', err);
      alert('Failed to start render: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRemixing(false);
    }
  };

  const togglePlayAudio = (url: string) => {
    if (playingAudioUrl === url && audioElement) {
      audioElement.pause();
      setPlayingAudioUrl(null);
      setAudioElement(null);
      return;
    }
    if (audioElement) {
      audioElement.pause();
    }
    const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
    const audio = new Audio(fullUrl);
    audio.play();
    audio.onended = () => {
      setPlayingAudioUrl(null);
      setAudioElement(null);
    };
    setAudioElement(audio);
    setPlayingAudioUrl(url);
  };

  const loadProject = async (projectId: string, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    localStorage.setItem('activeProjectId', id);
    loadProject(id);
    loadReels(id);

    // Real-time live status polling every 2.5s while project is processing
    const interval = setInterval(async () => {
      try {
        const data = await projectService.getProjectById(id);
        setProject((prev) => {
          // If status completed or failed, stop polling
          if (data.status === 'PUBLISHED' || data.status === 'READY_TO_PUBLISH' || data.status === 'FAILED') {
            clearInterval(interval);
          }
          return data;
        });
      } catch (e) {
        // silent polling error catch
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [id]);

  const loadReels = async (projectId: string) => {
    try {
      const list = await metaService.getReels(projectId);
      setPublishedReels(list || []);
    } catch {}
  };

  const handlePublishReel = async (platform: 'INSTAGRAM_REELS' | 'FACEBOOK_REELS') => {
    if (!project) return;
    const platformLabel = platform === 'INSTAGRAM_REELS' ? 'Instagram Reels' : 'Facebook Page Reels';
    if (!confirm(`Publish this ${project.format === 'SHORTS' ? 'vertical Reel' : 'video'} to ${platformLabel}?`)) return;

    setIsPublishingReel(platform);
    try {
      await metaService.publishReel({
        projectId: project.id,
        platform,
        userApproved: true,
        title: project.seoTitle || project.title,
        caption: project.seoDescription || project.title,
      });
      alert(`Successfully published to ${platformLabel}!`);
      await loadReels(project.id);
    } catch (err: any) {
      alert(`Publishing failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsPublishingReel(null);
    }
  };

  const handleRunFullPipeline = async () => {
    if (!project) return;
    setIsRunningPipeline(true);
    try {
      await agentService.runPipeline(project.id);
      await loadProject(project.id);
    } catch (err) {
      console.error('Error running pipeline:', err);
      alert('Pipeline execution encountered an error. Check Agent Monitor for logs.');
    } finally {
      setIsRunningPipeline(false);
    }
  };

  if (isLoading || !project) {
    return <div className="p-12 text-center text-slate-400">Loading project studio...</div>;
  }

  let keywordsList: string[] = [];
  if (project.keywords) {
    try {
      keywordsList = JSON.parse(project.keywords);
    } catch {
      keywordsList = project.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    }
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={project.format === 'SHORTS' ? 'purple' : 'info'}>
              {project.format === 'SHORTS' ? 'Shorts 9:16' : 'Landscape 16:9'}
            </Badge>
            <Badge variant="default">{project.category}</Badge>
            <Badge variant="purple">{project.visualStyle}</Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{project.title}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Topic: <span className="text-slate-200">{project.topic}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Cpu className="w-4 h-4 text-brand-400" />}
            onClick={() => navigate(`/project/${project.id}/agents`)}
          >
            Agent Monitor
          </Button>

          <Button
            variant="secondary"
            isLoading={isRemixing}
            icon={<Volume2 className="w-4 h-4 text-emerald-400" />}
            onClick={handleRemixAudio}
            title="Fast re-render: Mix audio, visuals and subtitles without regenerating AI images or text"
          >
            Re-Mix Audio & Render
          </Button>

          <Button
            variant="primary"
            isLoading={isRunningPipeline}
            icon={<Sparkles className="w-4 h-4" />}
            onClick={handleRunFullPipeline}
          >
            Run Full Pipeline
          </Button>
        </div>
      </div>

      {/* Production Stepper */}
      <WorkflowProgress
        project={project}
        onStageClick={(stage: string) => {
          if (stage === 'script' || stage === 'image' || stage === 'video' || stage === 'voice') {
            navigate(`/project/${project.id}/scenes`);
          } else if (stage === 'editing') {
            navigate(`/project/${project.id}/preview`);
          } else if (stage === 'thumbnail') {
            navigate(`/project/${project.id}/thumbnails`);
          } else if (stage === 'seo') {
            navigate(`/project/${project.id}/seo`);
          } else if (stage === 'publishing') {
            navigate('/youtube');
          } else {
            navigate(`/project/${project.id}/agents`);
          }
        }}
      />

      {/* Studio Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          hoverable
          onClick={() => navigate(`/project/${project.id}/scenes`)}
          className="p-4 text-center space-y-2 hover:border-brand-500/50"
        >
          <Layers className="w-6 h-6 mx-auto text-brand-400" />
          <h4 className="text-xs font-bold text-white">Scene Editor</h4>
          <p className="text-[10px] text-slate-400">{project.scenes?.length || 0} Scenes</p>
        </Card>

        <Card
          hoverable
          onClick={() => navigate(`/project/${project.id}/assets`)}
          className="p-4 text-center space-y-2 hover:border-brand-500/50"
        >
          <FolderOpen className="w-6 h-6 mx-auto text-sky-400" />
          <h4 className="text-xs font-bold text-white">Asset Library</h4>
          <p className="text-[10px] text-slate-400">{project.assets?.length || 0} Files</p>
        </Card>

        <Card
          hoverable
          onClick={() => navigate(`/project/${project.id}/preview`)}
          className="p-4 text-center space-y-2 hover:border-brand-500/50"
        >
          <Film className="w-6 h-6 mx-auto text-emerald-400" />
          <h4 className="text-xs font-bold text-white">Video Preview</h4>
          <p className="text-[10px] text-slate-400">{project.finalVideoUrl ? 'Ready' : 'Not Rendered'}</p>
        </Card>

        <Card
          hoverable
          onClick={() => navigate(`/project/${project.id}/thumbnails`)}
          className="p-4 text-center space-y-2 hover:border-brand-500/50"
        >
          <ImageIcon className="w-6 h-6 mx-auto text-pink-400" />
          <h4 className="text-xs font-bold text-white">Thumbnail</h4>
          <p className="text-[10px] text-slate-400">{project.thumbnailUrl ? 'Generated' : 'Pending'}</p>
        </Card>

        <Card
          hoverable
          onClick={() => navigate(`/project/${project.id}/seo`)}
          className="p-4 text-center space-y-2 hover:border-brand-500/50"
        >
          <Search className="w-6 h-6 mx-auto text-amber-400" />
          <h4 className="text-xs font-bold text-white">SEO Manager</h4>
          <p className="text-[10px] text-slate-400">{project.seoTitle ? 'Optimized' : 'Pending'}</p>
        </Card>

        <Card
          hoverable
          onClick={() => navigate('/youtube')}
          className="p-4 text-center space-y-2 hover:border-brand-500/50"
        >
          <Share2 className="w-6 h-6 mx-auto text-rose-400" />
          <h4 className="text-xs font-bold text-white">Publishing</h4>
          <p className="text-[10px] text-slate-400">OAuth Upload</p>
        </Card>
      </div>

      {/* Production Showcase (Final Video & Thumbnail) */}
      {(project.finalVideoUrl || project.thumbnailUrl) && (
        <Card className="p-6 border-brand-500/30 bg-gradient-to-r from-slate-900 via-brand-950/20 to-slate-900 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Film className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-base">Production Assets (Final Video & High-CTR Thumbnail)</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Your video is rendered with verified {project.format === 'SHORTS' ? '9:16 vertical Short/Reel' : '16:9 landscape'} aspect ratio.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {project.finalVideoUrl && (
                <a
                  href={`http://localhost:5000${project.finalVideoUrl}`}
                  download
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-brand-400" />
                  Download MP4
                </a>
              )}
              <Button
                size="sm"
                variant="primary"
                icon={<Share2 className="w-3.5 h-3.5" />}
                onClick={() => navigate('/youtube')}
              >
                Publish to YouTube
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Video Player */}
            {project.finalVideoUrl ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Rendered MP4 Preview:</span>
                <div className={`relative bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center ${project.format === 'SHORTS' ? 'max-w-[280px] mx-auto aspect-[9/16]' : 'w-full aspect-video'}`}>
                  <video
                    src={`http://localhost:5000${project.finalVideoUrl}`}
                    controls
                    preload="metadata"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <Film className="w-8 h-8 text-slate-600 animate-pulse" />
                <span>Video render pending... Run pipeline to compile video.</span>
              </div>
            )}

            {/* Thumbnail Showcase */}
            {project.thumbnailUrl ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">Generated YouTube Thumbnail:</span>
                <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video group">
                  <img
                    src={`http://localhost:5000${project.thumbnailUrl}`}
                    alt="Project Thumbnail"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-medium text-white line-clamp-1">{project.seoTitle || project.title}</span>
                  </div>
                </div>
                {project.thumbnailPrompt && (
                  <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-950 p-2 rounded border border-slate-800">
                    "{project.thumbnailPrompt}"
                  </p>
                )}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                <ImageIcon className="w-8 h-8 text-slate-600 animate-pulse" />
                <span>Thumbnail pending generation.</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Generated Scenes & Visuals Gallery */}
      {project.scenes && project.scenes.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Layers className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-base">
                  Generated Scenes, Visuals & Voiceover ({project.scenes.length} Scenes)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visual prompt generation, neural image synthesis, and scene narration audio.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw className="w-3 h-3" />}
              onClick={() => navigate(`/project/${project.id}/scenes`)}
            >
              Open Scene Editor
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
            {project.scenes.map((scene) => (
              <div
                key={scene.id}
                className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
              >
                {/* Scene Visual Preview */}
                <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                  {scene.imageUrl ? (
                    <img
                      src={`http://localhost:5000${scene.imageUrl}`}
                      alt={`Scene ${scene.sceneNumber}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 text-xs gap-1">
                      <ImageIcon className="w-6 h-6" />
                      <span>Generating visual...</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white text-[11px] font-bold border border-white/10">
                      Scene {scene.sceneNumber}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-slate-300 text-[10px] font-mono border border-white/10">
                      {scene.duration.toFixed(1)}s
                    </span>
                  </div>

                  {scene.audioUrl && (
                    <button
                      type="button"
                      onClick={() => togglePlayAudio(scene.audioUrl!)}
                      className="absolute bottom-2 right-2 p-2 rounded-full bg-brand-600/90 hover:bg-brand-500 text-white shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
                      title="Audition scene narration"
                    >
                      {playingAudioUrl === scene.audioUrl ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Narration & Prompts */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Spoken Voiceover:</span>
                    <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                      "{scene.narrationText}"
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Visual Prompt (AI):</span>
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">
                      {scene.visualPrompt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Project Overview Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Research Overview */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-semibold text-white text-sm">Research & Narrative Angle</h3>
            <Button
              size="sm"
              variant="outline"
              icon={<RotateCcw className="w-3 h-3" />}
              onClick={() => agentService.runAgent('RESEARCH', project.id).then(() => loadProject(project.id))}
            >
              Re-Research
            </Button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold mb-1">Viral Angle / Hook:</span>
              <p className="text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                {project.researchNotes || 'Pending Research Agent execution...'}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block font-semibold mb-1">Target Audience:</span>
              <p className="text-slate-300">
                {project.targetAudience || 'General audience'}
              </p>
            </div>

            {keywordsList.length > 0 && (
              <div>
                <span className="text-slate-400 block font-semibold mb-1.5">Identified SEO Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {keywordsList.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Technical Specs Card */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2">
            Production Specifications
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Aspect Ratio</span>
              <span className="text-slate-200 font-mono font-medium">
                {project.format === 'SHORTS' ? '9:16 (Vertical)' : '16:9 (Horizontal)'}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Target Duration</span>
              <span className="text-slate-200 font-mono font-medium">{project.targetDuration} seconds</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Visual Aesthetic</span>
              <span className="text-slate-200 font-medium">{project.visualStyle}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Narration Voice</span>
              <span className="text-slate-200 font-medium">{project.voiceStyle}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Total Scenes</span>
              <span className="text-slate-200 font-mono font-medium">{project.scenes?.length || 0}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400">Final MP4 Video</span>
              <span className="text-brand-400 font-medium">
                {project.finalVideoUrl ? 'Rendered' : 'Pending Render'}
              </span>
            </div>
          </div>
        </Card>

        {/* Multi-Platform Social Distribution Card */}
        <Card className="lg:col-span-3 space-y-4 border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-pink-950/60 text-pink-400 border border-pink-800/40">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Multi-Platform Distribution (Instagram, Facebook & YouTube)</h3>
                <p className="text-xs text-slate-400">
                  {project.format === 'SHORTS'
                    ? 'Publish this 9:16 vertical video directly as an Instagram Reel, Facebook Reel, or YouTube Short.'
                    : 'Publish video across your connected social platforms.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/settings/social')}
              >
                Manage Social Accounts
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. Instagram Reels */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-xs">Instagram Reels</span>
                  <Badge variant="purple" size="sm">9:16 Format</Badge>
                </div>
                <p className="text-[11px] text-slate-400">Publishes directly via Instagram Graph API container flow.</p>
              </div>

              <Button
                size="sm"
                variant="primary"
                disabled={!project.finalVideoUrl || isPublishingReel !== null}
                isLoading={isPublishingReel === 'INSTAGRAM_REELS'}
                onClick={() => handlePublishReel('INSTAGRAM_REELS')}
              >
                Publish to Instagram
              </Button>
            </div>

            {/* 2. Facebook Page Reels */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-xs">Facebook Page Reels</span>
                  <Badge variant="info" size="sm">Page Video API</Badge>
                </div>
                <p className="text-[11px] text-slate-400">Publishes to connected Facebook Page Reels feed.</p>
              </div>

              <Button
                size="sm"
                variant="primary"
                disabled={!project.finalVideoUrl || isPublishingReel !== null}
                isLoading={isPublishingReel === 'FACEBOOK_REELS'}
                onClick={() => handlePublishReel('FACEBOOK_REELS')}
              >
                Publish to Facebook
              </Button>
            </div>

            {/* 3. YouTube Shorts */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/90 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-white text-xs">YouTube Shorts</span>
                  <Badge variant="danger" size="sm">YouTube Data API</Badge>
                </div>
                <p className="text-[11px] text-slate-400">Uploads with verified OAuth to connected YouTube channel.</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={!project.finalVideoUrl}
                onClick={() => navigate('/youtube')}
              >
                Publish to YouTube
              </Button>
            </div>
          </div>

          {/* Published Reels History */}
          {publishedReels.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-xs font-semibold text-white block">Published Live Reels ({publishedReels.length}):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {publishedReels.map((r) => (
                  <div key={r.id} className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium text-white">{r.platform.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({new Date(r.publishedAt).toLocaleDateString()})</span>
                    </div>

                    {r.permalink ? (
                      <a
                        href={r.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 hover:text-brand-300 flex items-center gap-1 text-[11px]"
                      >
                        View Reel <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 text-[10px]">Processing</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
