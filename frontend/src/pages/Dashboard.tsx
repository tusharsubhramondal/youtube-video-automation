import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  PlaySquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { projectService } from '../services/api';
import { VideoProject } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [stats, setStats] = useState({
    totalProjects: 0,
    completedProjects: 0,
    renderingProjects: 0,
    totalPublished: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [projList, summary] = await Promise.all([
        projectService.getProjects(),
        projectService.getProjectSummaryStats(),
      ]);
      setProjects(projList);
      setStats(summary);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: Video, color: 'text-brand-400', bg: 'bg-brand-950/40' },
    { label: 'Ready / Completed', value: stats.completedProjects, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
    { label: 'In Production', value: stats.renderingProjects, icon: Layers, color: 'text-sky-400', bg: 'bg-sky-950/40' },
    { label: 'Published to YouTube', value: stats.totalPublished, icon: Share2, color: 'text-rose-400', bg: 'bg-rose-950/40' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900/60 via-purple-900/40 to-slate-900 border border-brand-500/30 p-8 shadow-xl">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/40">
            <Sparkles className="w-3.5 h-3.5" />
            9 Autonomous AI Agents Orchestration
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Create Viral YouTube Videos on Autopilot
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Enter any topic or concept. Our multi-agent AI engine handles research, viral scriptwriting, scene composition, image synthesis, motion video, voiceover, FFmpeg assembly, SEO, and YouTube publishing.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Button
              size="md"
              variant="primary"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => navigate('/create')}
            >
              Start New Video Project
            </Button>
            <Button
              size="md"
              variant="outline"
              icon={<TrendingUp className="w-4 h-4" />}
              onClick={() => navigate('/projects')}
            >
              View All Projects
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white mt-0.5">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Recent Video Projects</h3>
            <p className="text-xs text-slate-400">Track and manage active AI video pipelines</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/projects')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading projects...</div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <PlaySquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white">No projects created yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Get started by creating your first AI video project. It only takes a topic and 30 seconds!
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/create')}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Create First Project
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map((project) => (
              <Card
                key={project.id}
                hoverable
                onClick={() => navigate(`/project/${project.id}`)}
                className="space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-mono text-brand-400 font-semibold uppercase">
                      {project.format} ({project.format === 'SHORTS' ? '9:16' : '16:9'})
                    </span>
                    <Badge
                      variant={
                        project.status === 'PUBLISHED'
                          ? 'success'
                          : project.status === 'READY_TO_PUBLISH'
                          ? 'info'
                          : project.status === 'FAILED'
                          ? 'danger'
                          : 'purple'
                      }
                    >
                      {project.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-white text-base mt-2 line-clamp-1">
                    {project.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Topic: {project.topic}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Progress</span>
                    <span className="font-mono text-slate-200">{project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full"
                      style={{ width: `${project.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
