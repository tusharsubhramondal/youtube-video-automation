import React, { useEffect, useState } from 'react';
import { Sun, Moon, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState<'ok' | 'error' | 'loading'>('loading');

  useEffect(() => {
    axios
      .get('/api/health')
      .then(() => setHealthStatus('ok'))
      .catch(() => setHealthStatus('error'));
  }, []);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        {title && <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>}
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-800/80 border-slate-700">
          {healthStatus === 'ok' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Engine Online</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Engine Connecting</span>
            </>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-900" />}
        </button>

        {/* Create Video Action */}
        <Button
          size="sm"
          variant="primary"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          onClick={() => navigate('/create')}
        >
          New Video
        </Button>
      </div>
    </header>
  );
};

