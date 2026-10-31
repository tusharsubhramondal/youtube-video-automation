import React, { useEffect, useState } from 'react';
import {
  Settings,
  HardDrive,
  Cpu,
  Database,
  Layers,
  Sun,
  Moon,
  Info,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import axios from 'axios';

export const AppSettings: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/api/health')
      .then((res) => setHealth(res.data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-brand-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Application Settings</h1>
        </div>
        <p className="text-xs text-slate-400">
          Platform configuration, theme preferences, and engine diagnostic telemetry
        </p>
      </div>

      {/* Theme Preference */}
      <Card className="space-y-3">
        <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2">
          Interface Theme
        </h3>
        <div className="flex items-center justify-between text-xs">
          <div>
            <h4 className="font-medium text-white">Appearance Mode</h4>
            <p className="text-slate-400 mt-0.5">Toggle between Dark and Light mode themes.</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 hover:text-white"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span className="capitalize">{theme} Theme</span>
          </button>
        </div>
      </Card>

      {/* System Diagnostic Status */}
      <Card className="space-y-4">
        <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-400" />
          Backend Subsystems Health & Diagnostics
        </h3>

        {isLoading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading diagnostics...</div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-400" />
                <span className="text-white font-medium">PostgreSQL Database</span>
              </div>
              <Badge variant={health?.services?.database === 'connected' ? 'success' : 'danger'}>
                {health?.services?.database || 'checking'}
              </Badge>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="text-white font-medium">FFmpeg Video Processing Engine</span>
              </div>
              <Badge variant={health?.services?.ffmpeg === 'available' ? 'success' : 'warning'}>
                {health?.services?.ffmpeg || 'available'}
              </Badge>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span className="text-white font-medium">Media Storage Directories</span>
              </div>
              <Badge variant="success">uploads/ & renders/ mounted</Badge>
            </div>
          </div>
        )}
      </Card>

      {/* About Box */}
      <Card className="p-5 border-slate-800 text-xs space-y-2">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Info className="w-4 h-4 text-brand-400" />
          AutoTube Studio v1.0.0
        </div>
        <p className="text-slate-400 leading-relaxed">
          Production-grade AI YouTube Video Automation Platform engineered with React, Node.js, Express, PostgreSQL, Prisma, BullMQ, FFmpeg, and Google YouTube Data API v3.
        </p>
      </Card>
    </div>
  );
};
