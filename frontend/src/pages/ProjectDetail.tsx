import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
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
} from 'lucide-react';
import { projectService, agentService } from '../services/api';
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

  useEffect(() => {
    if (id) {
      localStorage.setItem('activeProjectId', id);
      loadProject(id);
    }
  }, [id]);

  const loadProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsLoading(false);
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

  const keywordsList: string[] = project.keywords ? JSON.parse(project.keywords) : [];

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
      </div>
    </div>
  );
};
