import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Smartphone,
  Monitor,
  Check,
  Zap,
} from 'lucide-react';
import { projectService, agentService } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Technology');
  const [language, setLanguage] = useState('English');
  const [format, setFormat] = useState<'SHORTS' | 'REGULAR'>('REGULAR');
  const [targetDuration, setTargetDuration] = useState(60);
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [voiceStyle, setVoiceStyle] = useState('Deep Narration');
  const [autoRunPipeline, setAutoRunPipeline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Technology & AI',
    'Education & Science',
    'Finance & Crypto',
    'Entertainment',
    'Health & Fitness',
    'Gaming',
    'Motivation & Self-Improvement',
    'History & Mystery',
  ];

  const visualStyles = [
    { id: 'Cinematic', label: 'Cinematic Movie', desc: 'Volumetric lighting, 35mm film look' },
    { id: 'Photorealistic', label: 'Photorealistic 8K', desc: 'Real-world photography details' },
    { id: 'Cyberpunk', label: 'Cyberpunk & Sci-Fi', desc: 'Neon glows, holographic tech' },
    { id: 'Anime', label: 'Modern Anime', desc: 'Vibrant Japanese animation aesthetic' },
    { id: 'Minimalist 3D', label: 'Minimalist 3D', desc: 'Clean geometric isometric renders' },
    { id: 'Documentary', label: 'Historical Documentary', desc: 'Archival tone, vintage grading' },
  ];

  const voiceStyles = [
    'Deep Narration',
    'Casual & Friendly',
    'High Energy & Enthusiastic',
    'Calm Storyteller',
    'Dramatic Documentary',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsSubmitting(true);
    try {
      const finalTitle = title.trim() || `The Truth About ${topic}`;
      const project = await projectService.createProject({
        title: finalTitle,
        topic,
        category,
        language,
        format,
        targetDuration: Number(targetDuration),
        visualStyle,
        voiceStyle,
      });

      localStorage.setItem('activeProjectId', project.id);

      if (autoRunPipeline) {
        // Trigger automated orchestrator in background
        agentService.runPipeline(project.id).catch(console.error);
      }

      navigate(`/project/${project.id}`);
    } catch (err) {
      console.error('Failed to create video project:', err);
      alert('Error creating project. Check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-400" />
          Create New AI Video Project
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure your video parameters and let our 9 specialized AI agents orchestrate the entire production workflow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic & Title */}
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-white border-b border-slate-800 pb-2">
            1. Concept & Topic
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Video Topic / Core Idea *
              </label>
              <textarea
                required
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., How Quantum Computing will break modern encryption, or The secret psychology behind Apple's packaging..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Working Title (Optional - AI will optimize for SEO)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to let AI generate high-CTR titles"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Japanese">Japanese</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Video Format & Duration */}
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-white border-b border-slate-800 pb-2">
            2. Format & Duration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Format: Shorts vs Landscape */}
            <div
              onClick={() => {
                setFormat('SHORTS');
                if (targetDuration > 60) setTargetDuration(60);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${
                format === 'SHORTS'
                  ? 'bg-brand-950/40 border-brand-500 ring-1 ring-brand-500 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="p-3 rounded-lg bg-slate-800 text-brand-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">YouTube Shorts</h4>
                  {format === 'SHORTS' && <Check className="w-4 h-4 text-brand-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Vertical 9:16 (1080x1920) • 15s to 60s</p>
              </div>
            </div>

            <div
              onClick={() => setFormat('REGULAR')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${
                format === 'REGULAR'
                  ? 'bg-brand-950/40 border-brand-500 ring-1 ring-brand-500 text-white'
                  : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="p-3 rounded-lg bg-slate-800 text-indigo-400">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Regular Video</h4>
                  {format === 'REGULAR' && <Check className="w-4 h-4 text-brand-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Landscape 16:9 (1920x1080) • 1m to 10m</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Duration: <span className="text-brand-400 font-mono font-bold">{targetDuration} seconds</span> ({Math.round(targetDuration / 60 * 10) / 10} min)
            </label>
            <input
              type="range"
              min={format === 'SHORTS' ? '15' : '30'}
              max={format === 'SHORTS' ? '60' : '300'}
              step="5"
              value={targetDuration}
              onChange={(e) => setTargetDuration(Number(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
              <span>{format === 'SHORTS' ? '15s' : '30s'}</span>
              <span>{format === 'SHORTS' ? '30s' : '2.5m'}</span>
              <span>{format === 'SHORTS' ? '60s' : '5m'}</span>
            </div>
          </div>
        </Card>

        {/* Visual & Voice Styling */}
        <Card className="space-y-4">
          <h3 className="text-base font-semibold text-white border-b border-slate-800 pb-2">
            3. Style & Voice
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Visual Style</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {visualStyles.map((style) => (
                <div
                  key={style.id}
                  onClick={() => setVisualStyle(style.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    visualStyle === style.id
                      ? 'bg-brand-950/40 border-brand-500 text-white'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-semibold text-xs block text-white">{style.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{style.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Voice Style</label>
            <select
              value={voiceStyle}
              onChange={(e) => setVoiceStyle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-brand-500"
            >
              {voiceStyles.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Automation Execution Trigger */}
        <div className="p-4 bg-brand-950/30 border border-brand-800/40 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-semibold text-white">Auto-Run Orchestrator</h4>
              <p className="text-xs text-slate-400">
                Automatically execute all 9 AI agents to produce the first full draft immediately.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoRunPipeline}
            onChange={(e) => setAutoRunPipeline(e.target.checked)}
            className="w-5 h-5 accent-brand-500 rounded cursor-pointer"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            variant="primary"
            isLoading={isSubmitting}
            icon={<Sparkles className="w-5 h-5" />}
          >
            Launch Video Production
          </Button>
        </div>
      </form>
    </div>
  );
};
