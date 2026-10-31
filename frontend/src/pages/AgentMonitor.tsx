import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cpu, RefreshCw, Terminal, Play, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { agentService, projectService } from '../services/api';
import { VideoProject, AgentExecution } from '../types';
import { AgentStatusCard } from '../components/project/AgentStatusCard';
import { Button } from '../components/common/Button';

export const AgentMonitor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string>(id || localStorage.getItem('activeProjectId') || '');
  const [project, setProject] = useState<VideoProject | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadData(projectId);
    }
  }, [projectId]);

  const loadData = async (pId: string) => {
    try {
      setIsLoading(true);
      const [projData, history] = await Promise.all([
        projectService.getProjectById(pId),
        agentService.getAgentHistory(pId),
      ]);
      setProject(projData);
      setExecutions(history);
    } catch (err) {
      console.error('Failed to load agent monitor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAgent = async (agentType: string) => {
    if (!projectId) return;
    setRunningAgent(agentType);
    try {
      await agentService.runAgent(agentType, projectId);
      await loadData(projectId);
    } catch (err) {
      console.error(`Error running ${agentType}:`, err);
      alert(`Agent execution error. View terminal logs for details.`);
    } finally {
      setRunningAgent(null);
    }
  };

  const agentsList = [
    { type: 'RESEARCH', name: '1. Research Agent', desc: 'Analyzes video topic, discovers high-intent keywords, angles, and viral hooks.' },
    { type: 'SCRIPT', name: '2. Script Agent', desc: 'Synthesizes scene-by-scene narration scripts, durations, and camera directions.' },
    { type: 'IMAGE', name: '3. Image Agent', desc: 'Synthesizes high-resolution visual imagery for every scene according to visual style.' },
    { type: 'VIDEO', name: '4. Video Agent', desc: 'Synthesizes dynamic camera pan/zoom motion video clips for all scenes.' },
    { type: 'VOICE', name: '5. Voice Agent', desc: 'Synthesizes natural spoken voiceover audio and syncs scene timing.' },
    { type: 'EDITING', name: '6. Editing Agent', desc: 'Runs multi-clip FFmpeg rendering engine with audio mixing and transitions.' },
    { type: 'THUMBNAIL', name: '7. Thumbnail Agent', desc: 'Designs viral thumbnail concept, prompt, and image asset with high CTR styling.' },
    { type: 'SEO', name: '8. SEO Agent', desc: 'Generates optimized titles, rich descriptions with timestamps, and search tags.' },
    { type: 'PUBLISHING', name: '9. Publishing Agent', desc: 'Connects to YouTube Data API v3 and uploads video upon explicit user approval.' },
  ];

  const getLatestExecution = (agentType: string) => {
    return executions.find((e) => e.agentType === agentType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">AI Agent Monitor</h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time execution dashboard, logs, status, and individual agent control
            {project && (
              <> for <span className="text-white font-medium">"{project.title}"</span></>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={() => projectId && loadData(projectId)}
          >
            Refresh Logs
          </Button>
          {projectId && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(`/project/${projectId}`)}
            >
              Back to Studio
            </Button>
          )}
        </div>
      </div>

      {!projectId ? (
        <div className="p-12 text-center text-slate-400">
          No project selected. Open a project from <a href="/projects" className="text-brand-400 underline">Projects</a>.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentsList.map((agent) => (
              <AgentStatusCard
                key={agent.type}
                agentName={agent.name}
                agentType={agent.type}
                description={agent.desc}
                execution={getLatestExecution(agent.type)}
                isRunning={runningAgent === agent.type}
                onRun={() => handleRunAgent(agent.type)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
