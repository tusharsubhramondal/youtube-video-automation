import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Film,
  Mic,
  Image as ImageIcon,
} from 'lucide-react';
import { projectService, sceneService, agentService } from '../services/api';
import { VideoProject, VideoScene } from '../types';
import { SceneCard } from '../components/project/SceneCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export const SceneEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string>(id || localStorage.getItem('activeProjectId') || '');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadData(projectId);
    }
  }, [projectId]);

  const loadData = async (pId: string) => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjectById(pId);
      setProject(data);
      setScenes(data.scenes || []);
    } catch (err) {
      console.error('Failed to load project scenes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateScene = async (sceneId: string, updated: Partial<VideoScene>) => {
    try {
      const saved = await sceneService.updateScene(sceneId, updated);
      setScenes((prev) => prev.map((s) => (s.id === sceneId ? { ...s, ...saved } : s)));
    } catch (err) {
      console.error('Failed to update scene:', err);
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    try {
      await sceneService.deleteScene(sceneId);
      setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    } catch (err) {
      console.error('Failed to delete scene:', err);
    }
  };

  const handleAddScene = async () => {
    if (!projectId) return;
    try {
      const newScene = await sceneService.createScene(projectId, {
        narrationText: 'New scene narration text...',
        visualPrompt: 'Cinematic visual description...',
        duration: 5.0,
      });
      setScenes((prev) => [...prev, newScene]);
    } catch (err) {
      console.error('Failed to add scene:', err);
    }
  };

  const handleGenerateScript = async () => {
    if (!projectId) return;
    setIsGeneratingScript(true);
    try {
      await agentService.runAgent('SCRIPT', projectId);
      await loadData(projectId);
    } catch (err) {
      console.error('Failed to generate script:', err);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => projectId && navigate(`/project/${projectId}`)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Layers className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Scene Studio & Storyboard</h1>
            <Badge variant="purple">{scenes.length} Scenes</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Edit scene dialogues, visual generation directives, camera movements, and per-scene media
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            isLoading={isGeneratingScript}
            onClick={handleGenerateScript}
          >
            Re-Generate Script
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleAddScene}
          >
            Add Scene
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading scene board...</div>
      ) : scenes.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <Layers className="w-12 h-12 mx-auto text-slate-400" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Scenes Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Run the Script Agent to break down your topic into scenes with narration, visual prompts, and camera movements.
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Sparkles className="w-4 h-4" />}
            isLoading={isGeneratingScript}
            onClick={handleGenerateScript}
          >
            Generate Script with AI
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onUpdate={(updated: Partial<VideoScene>) => handleUpdateScene(scene.id, updated)}
              onDelete={() => handleDeleteScene(scene.id)}
              onGenerateImage={async () => {
                await agentService.runAgent('IMAGE', projectId, { sceneId: scene.id });
                await loadData(projectId);
              }}
              onGenerateAudio={async () => {
                await agentService.runAgent('VOICE', projectId, { sceneId: scene.id });
                await loadData(projectId);
              }}
              onGenerateVideo={async () => {
                await agentService.runAgent('VIDEO', projectId, { sceneId: scene.id });
                await loadData(projectId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
