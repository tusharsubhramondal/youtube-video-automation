import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
  Type,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { projectService, agentService } from '../services/api';
import { VideoProject } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const ThumbnailGenerator: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [projectId] = useState<string>(id || localStorage.getItem('activeProjectId') || '');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [prompt, setPrompt] = useState('');
  const [overlayText, setOverlayText] = useState('রহস্যের অন্তরাল!');
  const [textColor, setTextColor] = useState('#FFE600'); // vibrant high-CTR yellow
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center'>('bottom');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBaking, setIsBaking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [showLivePreview, setShowLivePreview] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
      if (data.thumbnailPrompt) {
        setPrompt(data.thumbnailPrompt);
      } else {
        setPrompt(`Ultra high-contrast dramatic YouTube thumbnail portrait about ${data.topic}, expressive emotion, neon volumetric studio lighting, 8k, award winning`);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    setIsGenerating(true);
    try {
      await agentService.runAgent('THUMBNAIL', projectId, {
        customPrompt: prompt,
        overlayText,
        textColor,
        position: textPosition,
      });
      setCacheBuster(Date.now());
      await loadProject();
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
      alert('Thumbnail generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBakeTextOnly = async () => {
    if (!projectId || !overlayText) return;
    setIsBaking(true);
    try {
      await agentService.runAgent('THUMBNAIL', projectId, {
        onlyOverlay: true,
        overlayText,
        textColor,
        position: textPosition,
      });
      setCacheBuster(Date.now());
      setShowLivePreview(false);
      await loadProject();
    } catch (err) {
      console.error('Failed to bake thumbnail text:', err);
      alert('Failed to update thumbnail text on image.');
    } finally {
      setIsBaking(false);
    }
  };

  if (isLoading || !project) {
    return <div className="p-12 text-center text-slate-400">Loading thumbnail studio...</div>;
  }

  const thumbUrlWithCache = project.thumbnailUrl
    ? `${project.thumbnailUrl}?t=${cacheBuster}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Thumbnail Generator</h1>
          </div>
          <p className="text-xs text-slate-400">
            Design high-CTR, psychological click-magnets with automated high-contrast typography burned directly onto image
          </p>
        </div>

        {project.thumbnailUrl && (
          <a
            href={thumbUrlWithCache || project.thumbnailUrl}
            download="thumbnail.png"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Thumbnail (With Text)
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thumbnail Preview Stage */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[420px]">
            {project.thumbnailUrl ? (
              <div className="w-full space-y-3">
                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
                  <img
                    src={thumbUrlWithCache || project.thumbnailUrl}
                    alt="YouTube Thumbnail"
                    className="w-full h-full object-cover"
                  />

                  {/* Temporary Floating Preview when user is tweaking live text before baking */}
                  {showLivePreview && overlayText && (
                    <div
                      className={`absolute inset-x-0 ${
                        textPosition === 'top'
                          ? 'top-6'
                          : textPosition === 'center'
                          ? 'top-1/2 -translate-y-1/2'
                          : 'bottom-6'
                      } flex justify-center pointer-events-none px-4`}
                    >
                      <span
                        style={{ color: textColor }}
                        className="text-2xl md:text-4xl font-extrabold uppercase tracking-tight text-center px-5 py-2 rounded-lg bg-black/80 shadow-2xl border-2 border-red-500/80 transform font-sans"
                      >
                        {overlayText}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Text is burned directly into thumbnail file for YouTube upload
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="text-slate-400 hover:text-white underline transition-colors"
                  >
                    {showLivePreview ? 'Hide Live Preview Box' : 'Preview Typed Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-400 opacity-60" />
                <h3 className="text-base font-bold text-white">No Thumbnail Created Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click Generate below to synthesize a viral concept image with high visual punch and burned-in high-CTR typography.
                </p>
                <Button
                  variant="primary"
                  icon={<Sparkles className="w-4 h-4" />}
                  isLoading={isGenerating}
                  onClick={handleGenerate}
                >
                  Generate with AI
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Thumbnail Directives Form */}
        <div className="space-y-4">
          <Card className="space-y-4">
            <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              Thumbnail & Headline Controls
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-brand-400" />
                  Thumbnail Headline Text (2-4 words)
                </label>
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => {
                    setOverlayText(e.target.value);
                    setShowLivePreview(true);
                  }}
                  placeholder="e.g. রহস্যের অন্তরাল! or DON'T OPEN!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-800"
                    />
                    <span className="font-mono text-slate-400 text-[11px]">{textColor}</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 block font-medium mb-1">Position</label>
                  <select
                    value={textPosition}
                    onChange={(e) => setTextPosition(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="bottom">Bottom (Default)</option>
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </div>

              {project.thumbnailUrl && (
                <Button
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  icon={<Layers className="w-3.5 h-3.5" />}
                  isLoading={isBaking}
                  onClick={handleBakeTextOnly}
                >
                  Bake Text into Image (Instant)
                </Button>
              )}

              <div className="pt-2 border-t border-slate-800/80">
                <label className="text-slate-300 block font-medium mb-1">
                  Text-to-Image Visual Prompt
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              variant="primary"
              icon={<RotateCcw className="w-4 h-4" />}
              isLoading={isGenerating}
              onClick={handleGenerate}
            >
              Generate Fresh AI Image & Text
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
