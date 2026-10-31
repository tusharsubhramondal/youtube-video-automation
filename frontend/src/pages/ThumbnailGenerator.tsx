import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
  Type,
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
  const [overlayText, setOverlayText] = useState('INSANE RESULTS!');
  const [textColor, setTextColor] = useState('#FACC15'); // vibrant yellow
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      await agentService.runAgent('THUMBNAIL', projectId, { customPrompt: prompt });
      await loadProject();
    } catch (err) {
      console.error('Failed to generate thumbnail:', err);
      alert('Thumbnail generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || !project) {
    return <div className="p-12 text-center text-slate-400">Loading thumbnail studio...</div>;
  }

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
            Design high-CTR, psychological click-magnets tailored for YouTube browse features
          </p>
        </div>

        {project.thumbnailUrl && (
          <a
            href={project.thumbnailUrl}
            download="thumbnail.png"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Thumbnail (1280x720)
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thumbnail Preview Stage */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[420px]">
            {project.thumbnailUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
                <img
                  src={project.thumbnailUrl}
                  alt="YouTube Thumbnail"
                  className="w-full h-full object-cover"
                />

                {/* Styled Text Overlay Preview */}
                {overlayText && (
                  <div className="absolute inset-x-0 bottom-6 flex justify-center pointer-events-none px-4">
                    <span
                      style={{ color: textColor }}
                      className="text-3xl md:text-5xl font-extrabold uppercase tracking-tight text-center px-4 py-1.5 rounded-lg bg-black/75 shadow-2xl drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] border border-white/20 transform -rotate-1 font-sans"
                    >
                      {overlayText}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-400 opacity-60" />
                <h3 className="text-base font-bold text-white">No Thumbnail Created Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click Generate below to synthesize a viral concept image with high visual punch.
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
              Thumbnail Controls
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">
                  Text-to-Image Visual Prompt
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-brand-400" />
                  Thumbnail Headline Text (2-4 words)
                </label>
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="e.g. STOP DOING THIS!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block font-medium mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded bg-transparent cursor-pointer border border-slate-800"
                  />
                  <span className="font-mono text-slate-400">{textColor}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full mt-2"
              variant="primary"
              icon={<RotateCcw className="w-4 h-4" />}
              isLoading={isGenerating}
              onClick={handleGenerate}
            >
              Generate Thumbnail Asset
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
