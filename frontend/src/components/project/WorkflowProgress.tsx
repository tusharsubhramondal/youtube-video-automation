import React from 'react';
import {
  FileText,
  PenTool,
  Image as ImageIcon,
  Film,
  Mic,
  Scissors,
  Sparkles,
  Search,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { VideoProject } from '../../types';

interface WorkflowProgressProps {
  project: VideoProject;
  onStageClick?: (stage: string) => void;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  project,
  onStageClick,
}) => {
  const stages = [
    { id: 'research', label: '1. Research', icon: FileText, desc: 'Topic analysis & keywords' },
    { id: 'script', label: '2. Scripting', icon: PenTool, desc: 'Scene division & narration' },
    { id: 'image', label: '3. Visuals', icon: ImageIcon, desc: 'Scene image synthesis' },
    { id: 'video', label: '4. Video Clips', icon: Film, desc: 'Motion & transitions' },
    { id: 'voice', label: '5. Voiceover', icon: Mic, desc: 'TTS narration audio' },
    { id: 'editing', label: '6. Editing', icon: Scissors, desc: 'FFmpeg multi-clip render' },
    { id: 'thumbnail', label: '7. Thumbnail', icon: Sparkles, desc: 'High-CTR visual asset' },
    { id: 'seo', label: '8. SEO', icon: Search, desc: 'Viral title & tags' },
    { id: 'publishing', label: '9. Publish', icon: Share2, desc: 'YouTube API upload' },
  ];

  const getStageStatus = (stageId: string) => {
    // Determine completed / active / pending based on project status and progress
    const stageOrder = ['research', 'script', 'image', 'video', 'voice', 'editing', 'thumbnail', 'seo', 'publishing'];
    const currentIndex = stageOrder.indexOf(project.currentStage || 'research');
    const thisIndex = stageOrder.indexOf(stageId);

    if (project.status === 'PUBLISHED') return 'completed';
    if (project.status === 'FAILED') return thisIndex === currentIndex ? 'failed' : thisIndex < currentIndex ? 'completed' : 'pending';
    if (thisIndex < currentIndex) return 'completed';
    if (thisIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Automated Production Pipeline
          </h3>
          <p className="text-xs text-slate-400">
            Current Stage: <span className="text-brand-400 font-medium capitalize">{project.currentStage || 'Draft'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${project.progress || 0}%` }}
            ></div>
          </div>
          <span className="text-xs font-mono font-medium text-slate-300">
            {project.progress || 0}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2 pt-2">
        {stages.map((stage) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;

          return (
            <button
              key={stage.id}
              onClick={() => onStageClick && onStageClick(stage.id)}
              className={clsx(
                'flex flex-col items-center p-3 rounded-lg border text-center transition-all group',
                status === 'completed' &&
                  'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700 text-emerald-300',
                status === 'active' &&
                  'bg-brand-950/40 border-brand-500/60 text-white ring-1 ring-brand-500/40',
                status === 'failed' &&
                  'bg-rose-950/30 border-rose-800/60 text-rose-300',
                status === 'pending' &&
                  'bg-slate-800/30 border-slate-800/80 text-slate-400 hover:border-slate-700'
              )}
            >
              <div className="relative mb-2">
                <Icon
                  className={clsx(
                    'w-5 h-5 transition-transform group-hover:scale-110',
                    status === 'completed' && 'text-emerald-400',
                    status === 'active' && 'text-brand-400 animate-pulse',
                    status === 'failed' && 'text-rose-400',
                    status === 'pending' && 'text-slate-400'
                  )}
                />
                <span className="absolute -bottom-1 -right-1">
                  {status === 'completed' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 bg-slate-900 rounded-full" />
                  )}
                  {status === 'active' && (
                    <Clock className="w-3 h-3 text-brand-400 bg-slate-900 rounded-full animate-spin" />
                  )}
                  {status === 'failed' && (
                    <AlertCircle className="w-3 h-3 text-rose-400 bg-slate-900 rounded-full" />
                  )}
                </span>
              </div>
              <span className="text-xs font-semibold tracking-tight line-clamp-1">{stage.label}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{stage.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

