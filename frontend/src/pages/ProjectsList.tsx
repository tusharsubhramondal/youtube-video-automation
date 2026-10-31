import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Video,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { projectService } from '../services/api';
import { VideoProject } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';

export const ProjectsList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<VideoProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<VideoProject | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
      setFilteredProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.topic.toLowerCase().includes(q)
      );
    }

    if (formatFilter !== 'ALL') {
      result = result.filter((p) => p.format === formatFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    setFilteredProjects(result);
  }, [searchQuery, formatFilter, statusFilter, projects]);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await projectService.deleteProject(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Video Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your AI video library, review production pipelines, and publish
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/create')}
        >
          New Video Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or topic..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Formats</option>
            <option value="SHORTS">Shorts (9:16)</option>
            <option value="REGULAR">Regular (16:9)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="RESEARCHING">Researching</option>
            <option value="SCRIPTING">Scripting</option>
            <option value="EDITING">Editing</option>
            <option value="READY_TO_PUBLISH">Ready To Publish</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading your projects...</div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <Video className="w-10 h-10 mx-auto text-slate-400" />
          <div>
            <h4 className="font-semibold text-white">No projects found</h4>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search filters or start a new project.</p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/create')}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create New Project
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => (
            <Card
              key={p.id}
              className="flex flex-col justify-between space-y-4 group hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={p.format === 'SHORTS' ? 'purple' : 'info'} size="sm">
                    {p.format === 'SHORTS' ? 'Shorts 9:16' : '16:9 Landscape'}
                  </Badge>

                  <Badge
                    variant={
                      p.status === 'PUBLISHED'
                        ? 'success'
                        : p.status === 'READY_TO_PUBLISH'
                        ? 'info'
                        : p.status === 'FAILED'
                        ? 'danger'
                        : 'default'
                    }
                    size="sm"
                  >
                    {p.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-brand-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {p.topic}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {p.targetDuration}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    {p._count?.scenes || 0} scenes
                  </span>
                  <span className="text-slate-400 font-medium">
                    {p.category}
                  </span>
                </div>
              </div>

              {/* Footer Progress & Actions */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Pipeline Progress</span>
                    <span className="font-mono">{p.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full"
                      style={{ width: `${p.progress || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setProjectToDelete(p)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Button
                    size="sm"
                    variant="primary"
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() => {
                      localStorage.setItem('activeProjectId', p.id);
                      navigate(`/project/${p.id}`);
                    }}
                  >
                    Open Studio
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="Delete Video Project"
        description="This will permanently delete the project and all generated scenes, media assets, and render logs."
        maxWidth="md"
      >
        <p className="text-sm text-slate-300">
          Are you sure you want to delete <strong className="text-white">"{projectToDelete?.title}"</strong>?
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setProjectToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
