import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Sparkles,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Share2,
  TrendingUp,
  Settings2,
  Save,
  Radio,
  ArrowRight,
  Flame,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { automationService } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

const getLocalTimeFromUtc = (utcHour: number, utcMinute: number): string => {
  const d = new Date();
  d.setUTCHours(utcHour, utcMinute, 0, 0);
  const localH = String(d.getHours()).padStart(2, '0');
  const localM = String(d.getMinutes()).padStart(2, '0');
  return `${localH}:${localM}`;
};

const getUtcFromLocalTime = (timeStr: string): { runHourUtc: number; runMinuteUtc: number } => {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '9', 10);
  const m = parseInt(parts[1] || '0', 10);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return {
    runHourUtc: d.getUTCHours(),
    runMinuteUtc: d.getUTCMinutes(),
  };
};

const calculateNextRun = (utcHour: number, utcMinute: number, isActive: boolean): string => {
  if (!isActive) return 'Autopilot paused';
  const now = new Date();
  const next = new Date();
  next.setUTCHours(utcHour, utcMinute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  const diffMs = next.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const localTimeStr = next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isToday = next.getDate() === now.getDate();
  const dayStr = isToday ? 'Today' : 'Tomorrow';

  return `${dayStr} at ${localTimeStr} (in ${diffHours}h ${diffMinutes}m)`;
};

export const DailyAutomation: React.FC = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  // Form State
  const [niche, setNiche] = useState('Tech & AI Facts');
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['INSTAGRAM_REELS', 'FACEBOOK_REELS', 'YOUTUBE_SHORTS']);
  const [autoPublish, setAutoPublish] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [targetDuration, setTargetDuration] = useState(45);
  const [visualStyle, setVisualStyle] = useState('Cinematic');
  const [voiceStyle, setVoiceStyle] = useState('Deep Narration (Christopher)');

  // Schedule Customization State
  const [runTimeLocal, setRunTimeLocal] = useState('09:00');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [runFrequency, setRunFrequency] = useState<'DAILY' | 'TWICE_DAILY' | 'WEEKDAYS' | 'CUSTOM'>('DAILY');
  const [userTimezone, setUserTimezone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await automationService.getSchedule();
      setSchedule(data);
      setNiche(data.niche || 'Tech & AI Facts');
      setTargetPlatforms(data.targetPlatforms || ['INSTAGRAM_REELS', 'FACEBOOK_REELS', 'YOUTUBE_SHORTS']);
      setAutoPublish(data.autoPublish ?? false);
      setIsActive(data.isActive ?? true);
      setTargetDuration(data.targetDuration || 45);
      setVisualStyle(data.visualStyle || 'Cinematic');
      setVoiceStyle(data.voiceStyle || 'Deep Narration (Christopher)');

      const localTime = getLocalTimeFromUtc(data.runHourUtc ?? 3, data.runMinuteUtc ?? 30);
      setRunTimeLocal(localTime);
      setCronExpression(data.cronExpression || '0 9 * * *');
      try {
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local');
      } catch {
        setUserTimezone('Local');
      }

      loadTrends(data.niche || 'Tech & AI Facts');
    } catch (err) {
      console.error('Failed to load automation schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrends = async (nicheToQuery: string) => {
    try {
      setIsLoadingTrends(true);
      const trendList = await automationService.getTrends(nicheToQuery);
      setTrends(trendList || []);
    } catch (err) {
      console.error('Failed to load daily trends:', err);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { runHourUtc, runMinuteUtc } = getUtcFromLocalTime(runTimeLocal);
      const updated = await automationService.updateSchedule({
        niche,
        targetPlatforms,
        autoPublish,
        isActive,
        targetDuration,
        visualStyle,
        voiceStyle,
        runHourUtc,
        runMinuteUtc,
        cronExpression,
      });
      setSchedule(updated);
      alert('Daily Reels Automation & Schedule settings saved successfully!');
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlatform = (platform: string) => {
    setTargetPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleTriggerNow = async (topicTitle?: string) => {
    if (!confirm(topicTitle ? `Produce viral Reel for: "${topicTitle}"?` : "Trigger today's autonomous viral Reel cycle now?")) return;
    setIsTriggering(true);
    setTriggerStatus('Discovering viral angles and spinning up autonomous agent pipeline...');
    setSchedule((prev: any) => (prev ? { ...prev, lastRunStatus: 'RUNNING' } : prev));

    try {
      const result = await automationService.triggerNow({
        customNiche: topicTitle || niche,
        autoPublishOverride: autoPublish,
      });
      setTriggerStatus('Success! Project generated and rendered.');
      if (result.project?.id) {
        navigate(`/project/${result.project.id}`);
      }
    } catch (err: any) {
      alert(`Trigger failed: ${err.message}`);
      setTriggerStatus(null);
    } finally {
      setIsTriggering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Daily Reels Automation Engine...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Daily Viral Topic Autopilot
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Daily Facebook & Instagram Reels Factory
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Discovers what is trending today, writes high-retention 3-second hooks, generates cinematic visuals via Cloudflare FLUX, burns in safe-zone kinetic captions, and publishes across Meta & YouTube daily.
            </p>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="md"
              variant="primary"
              icon={isTriggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              isLoading={isTriggering}
              onClick={() => handleTriggerNow()}
            >
              {isTriggering ? 'Producing Reel...' : "Run Today's Reel Now"}
            </Button>
            <div className="flex flex-col items-center sm:items-end gap-1.5 text-[11px] font-mono">
              {schedule?.lastRunAt && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">
                    Last: {new Date(schedule.lastRunAt).toLocaleDateString()}
                  </span>
                  {schedule.lastRunStatus === 'SUCCESS' && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      SUCCESS
                    </span>
                  )}
                  {schedule.lastRunStatus === 'READY' && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                      READY
                    </span>
                  )}
                  {schedule.lastRunStatus === 'RUNNING' && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 animate-pulse">
                      RUNNING...
                    </span>
                  )}
                  {schedule.lastRunStatus?.startsWith('FAILED') && (
                    <span
                      title={schedule.lastRunStatus}
                      className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20 cursor-help"
                    >
                      FAILED (Hover details)
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-slate-400">Next Run:</span>
                <span className="text-brand-300 font-semibold">
                  {calculateNextRun(schedule?.runHourUtc ?? 3, schedule?.runMinuteUtc ?? 30, isActive)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {triggerStatus && (
          <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/30 rounded-xl text-xs text-brand-300 flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{triggerStatus}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Daily Automation Settings (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-6 border-slate-800 bg-slate-900/90 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-950/70 text-brand-400 border border-brand-800/60 shadow-inner">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Autopilot Scheduling & Parameters</h3>
                  <p className="text-xs text-slate-400">Configure your target niche, vertical format, and multi-platform distribution</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-xs font-semibold text-white">{isActive ? 'Autopilot Active' : 'Paused'}</span>
              </div>
            </div>

            <div className="space-y-5 text-xs">
              {/* Schedule & Timing Controls */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-brand-500/30 space-y-4 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">Autonomous Schedule & Frequency Customization</h4>
                      <p className="text-[11px] text-slate-400">Configure daily automated trigger time, frequency, and cloud timezones</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-[11px] text-slate-400">Next Run:</span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 font-mono text-[11px] font-semibold border border-brand-500/30">
                      {calculateNextRun(
                        getUtcFromLocalTime(runTimeLocal).runHourUtc,
                        getUtcFromLocalTime(runTimeLocal).runMinuteUtc,
                        isActive
                      )}
                    </span>
                  </div>
                </div>

                {/* Frequency Cadence Selector */}
                <div>
                  <label className="text-slate-300 block font-medium mb-1.5 text-xs">Execution Cadence</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'DAILY', label: 'Daily (1x / Day)', desc: 'Once every 24 hours' },
                      { id: 'TWICE_DAILY', label: 'Twice Daily (2x / Day)', desc: 'Peak engagement hours' },
                      { id: 'WEEKDAYS', label: 'Weekdays Only', desc: 'Mon - Fri autopilot' },
                      { id: 'CUSTOM', label: 'Custom Cron', desc: 'Custom cron expression' },
                    ].map((freq) => (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setRunFrequency(freq.id as any)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          runFrequency === freq.id
                            ? 'bg-brand-600/20 border-brand-500 text-brand-300 font-medium ring-1 ring-brand-500/30'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-semibold block">{freq.label}</span>
                        <span className="text-[10px] text-slate-500 block">{freq.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Picker & Timezone Conversion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-slate-300 block font-medium mb-1 text-xs">
                      Daily Trigger Time (Your Local Time)
                    </label>
                    <input
                      type="time"
                      value={runTimeLocal}
                      onChange={(e) => setRunTimeLocal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-white font-mono focus:ring-1 focus:ring-brand-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Local Timezone: <span className="text-slate-300 font-mono">{userTimezone || 'Local'}</span>
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-300 block font-medium mb-1 text-xs">
                      Cloud UTC Synchronization
                    </label>
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-between">
                      <span>
                        {String(getUtcFromLocalTime(runTimeLocal).runHourUtc).padStart(2, '0')}:
                        {String(getUtcFromLocalTime(runTimeLocal).runMinuteUtc).padStart(2, '0')} UTC
                      </span>
                      <span className="text-[10px] text-emerald-400 font-sans font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        Auto-Synchronized
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Saved to backend database for UTC cron triggers
                    </span>
                  </div>
                </div>

                {/* Custom Cron Input (if custom selected) */}
                {runFrequency === 'CUSTOM' && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="text-slate-300 block font-medium mb-1 text-xs">
                      Standard 5-Field Cron Expression
                    </label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      placeholder="0 9 * * *"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Format: <code className="text-brand-300 font-mono">minute hour day month day-of-week</code> (e.g., <code className="text-brand-300 font-mono">30 3 * * *</code> for 9:00 AM IST)
                    </span>
                  </div>
                )}
              </div>

              {/* Niche Selection */}
              <div>
                <label className="text-slate-300 block font-medium mb-1.5">Target Content Niche / Channel Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {[
                    { label: 'Comedy & Relatable Skits', icon: '🎭' },
                    { label: 'Dance & Viral Choreography', icon: '💃' },
                    { label: 'Tech & AI Facts', icon: '🤖' },
                    { label: 'Entertainment & Celebs', icon: '🎬' },
                    { label: 'Mindblowing Science', icon: '🔬' },
                    { label: 'Strange History Facts', icon: '📜' },
                    { label: 'Money & Wealth Hacks', icon: '💰' },
                    { label: 'Fitness & Workout Motivation', icon: '⚡' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setNiche(preset.label);
                        loadTrends(preset.label);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2 ${
                        niche === preset.label
                          ? 'bg-brand-600/20 border-brand-500 text-brand-300 font-medium'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Or type custom niche: e.g. Standup Comedy, Hip Hop Dance, Bollywood Trends..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              {/* Target Platforms */}
              <div>
                <label className="text-slate-300 block font-medium mb-2">Auto-Publish Destinations</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'INSTAGRAM_REELS', label: 'Instagram Reels', sub: 'IG Business/Creator API' },
                    { id: 'FACEBOOK_REELS', label: 'Facebook Page Reels', sub: 'Page Video Reels API' },
                    { id: 'YOUTUBE_SHORTS', label: 'YouTube Shorts', sub: 'YouTube Data API v3' },
                  ].map((p) => {
                    const isChecked = targetPlatforms.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleTogglePlatform(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked
                            ? 'bg-brand-500/10 border-brand-500/60 shadow-md shadow-brand-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-700 text-brand-500 focus:ring-brand-500"
                        />
                        <div>
                          <span className={`font-semibold text-xs block ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                            {p.label}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.sub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Autopilot Safety Mode Switch */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white text-xs block">Publishing Safety Mode</span>
                    <p className="text-[11px] text-slate-400">
                      {autoPublish
                        ? 'Autonomous Mode: Automatically publishes to social accounts daily without human intervention.'
                        : 'Review Mode (Recommended): Generates the full 9:16 video and alerts you for a 1-click review.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoPublish(!autoPublish)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    autoPublish
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {autoPublish ? 'Auto-Publish Active' : '1-Click Review Mode'}
                </button>
              </div>

              {/* Formatting & Narration Styles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 block font-medium mb-1">Target Duration</label>
                  <select
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value={30}>30 Seconds (Fast Punchy)</option>
                    <option value={45}>45 Seconds (Recommended for Reels)</option>
                    <option value={58}>58 Seconds (Full Shorts Limit)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block font-medium mb-1">Visual Art Style</label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Cinematic">Cinematic 8K Realistic</option>
                    <option value="Cyberpunk">Cyberpunk Futuristic</option>
                    <option value="Hyper-realistic Documentary">Documentary Photography</option>
                    <option value="Anime / Graphic Novel">Anime Graphic Art</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block font-medium mb-1">Narration Voice Persona</label>
                  <select
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Deep Narration (Christopher)">Deep Narration (Christopher)</option>
                    <option value="Energetic Tech (Guy)">Energetic Tech (Guy)</option>
                    <option value="Warm Conversational (Jenny)">Warm Conversational (Jenny)</option>
                    <option value="British Storyteller (Oliver)">British Storyteller (Oliver)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                {isActive ? 'Pause Autopilot' : 'Resume Autopilot'}
              </button>

              <Button
                size="sm"
                variant="primary"
                icon={<Save className="w-3.5 h-3.5" />}
                isLoading={isSaving}
                onClick={handleSaveSettings}
              >
                Save Schedule Settings
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Daily Viral Trending Radar (1 Col) */}
        <div className="space-y-6">
          <Card className="space-y-4 border-slate-800 bg-slate-900/90 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Today's Viral Radar</h3>
              </div>
              <button
                type="button"
                onClick={() => loadTrends(niche)}
                disabled={isLoadingTrends}
                className="p-1 text-slate-400 hover:text-white rounded"
                title="Refresh trending signals"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTrends ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3">
              {isLoadingTrends ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  <span className="text-[11px] text-slate-500">Scouting Google & Reddit trends...</span>
                </div>
              ) : trends.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No trend signals found. Click refresh.</p>
              ) : (
                trends.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl hover:border-amber-500/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-white text-xs leading-snug group-hover:text-amber-300 transition-colors">
                        {t.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                        {t.viralScore}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      "{t.hookAngle}"
                    </p>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-900 text-[10px]">
                      <span className="text-slate-500">{t.source}</span>
                      <button
                        type="button"
                        onClick={() => handleTriggerNow(t.title)}
                        className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                      >
                        Generate Reel <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

