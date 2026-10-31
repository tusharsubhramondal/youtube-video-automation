import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Copy,
  Check,
  Save,
  RotateCcw,
  Hash,
  Tag,
} from 'lucide-react';
import { projectService, agentService } from '../services/api';
import { VideoProject } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const SeoManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [projectId] = useState<string>(id || localStorage.getItem('activeProjectId') || '');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [copiedTags, setCopiedTags] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      setTitle(data.seoTitle || data.title);
      setDescription(data.seoDescription || '');
      if (data.seoTags) {
        try {
          setTags(JSON.parse(data.seoTags));
        } catch {
          setTags(data.seoTags.split(',').map((t: string) => t.trim()));
        }
      }
    } catch (err) {
      console.error('Failed to load SEO data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSeo = async () => {
    if (!projectId) return;
    setIsGenerating(true);
    try {
      await agentService.runAgent('SEO', projectId);
      await loadProject();
    } catch (err) {
      console.error('Failed to generate SEO:', err);
      alert('SEO Agent generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await projectService.updateProject(projectId, {
        seoTitle: title,
        seoDescription: description,
        seoTags: JSON.stringify(tags),
      });
      alert('SEO metadata saved successfully!');
    } catch (err) {
      console.error('Failed to save SEO metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const copyTagsToClipboard = () => {
    navigator.clipboard.writeText(tags.join(', '));
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  if (isLoading || !project) {
    return <div className="p-12 text-center text-slate-400">Loading SEO Studio...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">YouTube SEO Manager</h1>
          </div>
          <p className="text-xs text-slate-400">
            Rank higher in YouTube Search and Suggested Videos with keyword-dense metadata
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            isLoading={isGenerating}
            onClick={handleGenerateSeo}
          >
            Re-Generate with AI
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<Save className="w-3.5 h-3.5" />}
            isLoading={isSaving}
            onClick={handleSave}
          >
            Save Metadata
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main SEO Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">Video Title (Under 100 characters)</label>
              <span className={`text-xs font-mono ${title.length > 90 ? 'text-amber-400' : 'text-slate-400'}`}>
                {title.length}/100
              </span>
            </div>
            <input
              type="text"
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </Card>

          {/* Description */}
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white">
                SEO Description (Timestamps, Chapters & Links)
              </label>
              <span className="text-xs font-mono text-slate-400">
                {description.length}/5000
              </span>
            </div>
            <textarea
              rows={12}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description with chapters and keywords..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono leading-relaxed"
            />
          </Card>
        </div>

        {/* Tags & Recommendations */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-semibold text-white text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-brand-400" />
                Target Keywords & Tags ({tags.length})
              </h3>
              <button
                onClick={copyTagsToClipboard}
                className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300"
              >
                {copiedTags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedTags ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                <Badge key={idx} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="pt-2">
              <input
                type="text"
                placeholder="Type tag and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.currentTarget.value.trim();
                    if (val && !tags.includes(val)) {
                      setTags([...tags, val]);
                      e.currentTarget.value = '';
                    }
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-semibold text-white text-xs border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              SEO Best Practices Checklist
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Hook in the first 3 lines of description</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Timestamps for video chapters included</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Primary search keyword in video title</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>15+ targeted YouTube search tags</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
