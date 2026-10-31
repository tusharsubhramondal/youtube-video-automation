import React, { useState } from 'react';
import { Play, RotateCcw, ChevronDown, ChevronUp, Terminal, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { AgentExecution } from '../../types';

interface AgentStatusCardProps {
  agentName: string;
  agentType: string;
  description: string;
  execution?: AgentExecution;
  onRun: () => void;
  isRunning?: boolean;
}

export const AgentStatusCard: React.FC<AgentStatusCardProps> = ({
  agentName,
  agentType,
  description,
  execution,
  onRun,
  isRunning = false,
}) => {
  const [showLogs, setShowLogs] = useState(false);

  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <Badge variant="warning">
          <Clock className="w-3 h-3 animate-spin" />
          Running
        </Badge>
      );
    }
    if (!execution) {
      return <Badge variant="default">Idle</Badge>;
    }
    switch (execution.status) {
      case 'COMPLETED':
        return (
          <Badge variant="success">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="danger">
            <AlertCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      case 'RUNNING':
        return (
          <Badge variant="warning">
            <Clock className="w-3 h-3 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return <Badge variant="default">Pending</Badge>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-all hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-white text-base">{agentName}</h4>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>

        <Button
          size="sm"
          variant={execution?.status === 'COMPLETED' ? 'outline' : 'primary'}
          icon={execution?.status === 'COMPLETED' ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          onClick={onRun}
          isLoading={isRunning}
        >
          {execution?.status === 'COMPLETED' ? 'Regenerate' : 'Run Agent'}
        </Button>
      </div>

      {execution && (
        <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {execution.executionTimeMs && (
              <span>Execution Time: <strong className="text-slate-300 font-mono">{execution.executionTimeMs}ms</strong></span>
            )}
            {execution.completedAt && (
              <span>Last Run: {new Date(execution.completedAt).toLocaleTimeString()}</span>
            )}
          </div>

          {execution.logs && (
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-brand-400" />
              <span>{showLogs ? 'Hide Logs' : 'View Logs'}</span>
              {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      )}

      {showLogs && execution?.logs && (
        <div className="mt-2 bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
          {execution.logs}
          {execution.errorMessage && (
            <div className="text-rose-400 mt-2 font-bold">Error: {execution.errorMessage}</div>
          )}
        </div>
      )}
    </div>
  );
};

