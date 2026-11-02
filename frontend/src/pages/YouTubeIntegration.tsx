import React, { useEffect, useState } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Upload,
  Lock,
  Globe,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { youtubeService, projectService } from '../services/api';
import { YouTubeAccount, VideoProject } from '../types';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

const YOUTUBE_CATEGORIES = [
  { id: '24', name: 'Entertainment (Mystery, Horror, True Crime & Stories)' },
  { id: '27', name: 'Education (History, Documentaries & Case Studies)' },
  { id: '28', name: 'Science & Technology' },
  { id: '1', name: 'Film & Animation (Cinematic & Short Films)' },
  { id: '22', name: 'People & Blogs (Vlogs & Personal Storytelling)' },
  { id: '23', name: 'Comedy & Humor' },
  { id: '20', name: 'Gaming' },
  { id: '26', name: 'Howto & Style' },
  { id: '10', name: 'Music & Performance' },
  { id: '17', name: 'Sports & Fitness' },
  { id: '25', name: 'News & Politics' },
];

const mapCategoryToId = (category?: string): string => {
  if (!category) return '24';
  const c = category.toLowerCase();
  if (c.includes('mystery') || c.includes('crime') || c.includes('horror') || c.includes('paranormal')) return '24';
  if (c.includes('history') || c.includes('docu') || c.includes('educat')) return '27';
  if (c.includes('science') || c.includes('tech') || c.includes('ai')) return '28';
  if (c.includes('comedy') || c.includes('humor')) return '23';
  if (c.includes('game') || c.includes('gaming')) return '20';
  if (c.includes('music') || c.includes('dance')) return '10';
  if (c.includes('sport') || c.includes('fitness')) return '17';
  if (c.includes('film') || c.includes('movie')) return '1';
  if (c.includes('news') || c.includes('politic')) return '25';
  if (c.includes('style') || c.includes('howto')) return '26';
  return '24';
};

export const YouTubeIntegration: React.FC = () => {
  const [accounts, setAccounts] = useState<YouTubeAccount[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<VideoProject | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<'PRIVATE' | 'UNLISTED' | 'PUBLIC'>('PRIVATE');
  const [categoryId, setCategoryId] = useState<string>('28');
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccountsAndProjects();
  }, []);

  const loadAccountsAndProjects = async () => {
    try {
      setIsLoading(true);
      const [accData, projList] = await Promise.all([
        youtubeService.getAccounts(),
        projectService.getProjects(),
      ]);
      setAccounts(accData.accounts);
      setIsConfigured(accData.isConfigured);
      setProjects(projList);

      const activeId = localStorage.getItem('activeProjectId');
      if (activeId && projList.some((p: VideoProject) => p.id === activeId)) {
        setSelectedProjectId(activeId);
        const p = projList.find((x: VideoProject) => x.id === activeId);
        if (p) {
          setSelectedProject(p);
          setCategoryId(mapCategoryToId(p.category));
        }
      } else if (projList.length > 0) {
        setSelectedProjectId(projList[0].id);
        setSelectedProject(projList[0]);
        setCategoryId(mapCategoryToId(projList[0].category));
      }
    } catch (err) {
      console.error('Failed to load YouTube accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectOAuth = async () => {
    try {
      const url = await youtubeService.getAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to get auth URL:', err);
      alert('OAuth credentials not configured in backend.');
    }
  };

  const handleConnectMock = async () => {
    try {
      const mockAcc = await youtubeService.connectMockChannel();
      setAccounts((prev) => [...prev.filter((a) => a.channelId !== mockAcc.channelId), mockAcc]);
    } catch (err) {
      console.error('Failed to connect mock channel:', err);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await youtubeService.disconnectAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to disconnect account:', err);
    }
  };

  const handleProjectSelect = (pId: string) => {
    setSelectedProjectId(pId);
    const p = projects.find((x) => x.id === pId) || null;
    setSelectedProject(p);
    if (p) {
      setCategoryId(mapCategoryToId(p.category));
    }
  };

  const handlePublish = async () => {
    if (!selectedProject || !userConfirmed) {
      alert('You must review and explicitly check the approval box before publishing.');
      return;
    }

    if (!selectedProject.finalVideoUrl) {
      alert('This project does not have a rendered video yet! Please render the video in Video Preview first.');
      return;
    }

    setIsPublishing(true);
    try {
      const result = await youtubeService.publishVideo(selectedProject.id, {
        youtubeAccountId: accounts[0]?.id,
        title: selectedProject.seoTitle || selectedProject.title,
        description: selectedProject.seoDescription || selectedProject.topic,
        tags: selectedProject.seoTags || undefined,
        categoryId,
        privacyStatus,
        userApproved: true,
      });

      setPublishedSuccess(result);
      await loadAccountsAndProjects();
    } catch (err: any) {
      console.error('Publish error:', err);
      alert(err.response?.data?.error?.message || err.message || 'Failed to publish video');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-5 h-5 text-rose-500" />
            <h1 className="text-2xl font-bold text-white tracking-tight">YouTube Channel Integration</h1>
          </div>
          <p className="text-xs text-slate-400">
            Secure Google OAuth 2.0 channel connection and Publishing Agent
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Button
              variant="primary"
              icon={<Share2 className="w-4 h-4" />}
              onClick={handleConnectOAuth}
            >
              Connect Google Account
            </Button>
          ) : (
            <Button
              variant="outline"
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
              onClick={handleConnectMock}
            >
              Connect Test Sandbox Channel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Channels List */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2">
              Connected Channels ({accounts.length})
            </h3>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading channels...</div>
            ) : accounts.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <Share2 className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
                <p className="text-xs text-slate-400">No YouTube channels connected.</p>
                <Button size="sm" variant="outline" onClick={handleConnectMock}>
                  Connect Test Channel
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {acc.avatarUrl ? (
                        <img
                          src={acc.avatarUrl}
                          alt={acc.channelTitle}
                          className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                          {acc.channelTitle.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-white text-xs line-clamp-1">
                          {acc.channelTitle}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {acc.channelId}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Disconnect Channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 bg-slate-900 border-slate-800 space-y-2 text-xs">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Safety & Publication Guardrail
            </h4>
            <p className="text-slate-400 leading-relaxed">
              In adherence with YouTube Developer Policies and platform safety guidelines, <strong>no video can be published automatically without explicit user review and confirmation</strong>.
            </p>
          </Card>
        </div>

        {/* Publish Video Control Center */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="space-y-4">
            <h3 className="font-semibold text-white text-base border-b border-slate-800 pb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-brand-400" />
              Publish Video to YouTube
            </h3>

            {/* Select project */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block font-medium mb-1">Select Video Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.format}) - {p.finalVideoUrl ? '✓ Rendered' : '⚠ Not rendered'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Target Feed:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                      selectedProject.format === 'SHORTS'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                    }`}>
                      {selectedProject.format === 'SHORTS' ? '📱 YouTube Shorts Shelf (Vertical 9:16)' : '🖥️ Standard Videos Tab (16:9)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Publish Title:</span>
                    <span className="text-white font-medium line-clamp-1">
                      {selectedProject.seoTitle || selectedProject.title}
                      {selectedProject.format === 'SHORTS' && ' #Shorts'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Render Status:</span>
                    <span className={selectedProject.finalVideoUrl ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                      {selectedProject.finalVideoUrl ? 'Ready for Upload' : 'Render Required'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                    {selectedProject.format === 'SHORTS'
                      ? '✓ Meets Shorts criteria (≤60s, 9:16 aspect ratio). YouTube will automatically place this in your channel\'s Shorts tab and the mobile Shorts algorithm.'
                      : '✓ Published to your channel\'s standard landscape Videos tab with custom thumbnail.'}
                  </p>
                </div>
              )}

              {/* YouTube Category Selector */}
              <div>
                <label className="text-slate-300 block font-medium mb-1.5">YouTube Content Category (Genre)</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:ring-1 focus:ring-brand-500 font-medium"
                >
                  {YOUTUBE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  YouTube groups genres into official categories. For <strong className="text-brand-400">Mystery, Horror & True Crime</strong>, select <strong className="text-white">Entertainment (24)</strong> or <strong className="text-white">Education (27)</strong>.
                </span>
              </div>

              {/* Privacy Selector */}
              <div>
                <label className="text-slate-300 block font-medium mb-1.5">Privacy Setting</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Only you can see' },
                    { id: 'UNLISTED', label: 'Unlisted', icon: Eye, desc: 'Anyone with the link' },
                    { id: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Visible to everyone' },
                  ].map((priv) => (
                    <div
                      key={priv.id}
                      onClick={() => setPrivacyStatus(priv.id as any)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        privacyStatus === priv.id
                          ? 'bg-brand-950/40 border-brand-500 text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <priv.icon className="w-4 h-4 mb-1 text-brand-400" />
                      <span className="font-semibold block">{priv.label}</span>
                      <span className="text-[10px] text-slate-400">{priv.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explicit User Approval Checkbox */}
              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2 mt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userConfirmed}
                    onChange={(e) => setUserConfirmed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-brand-500 rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-300 block">
                      Explicit User Confirmation (Required)
                    </span>
                    <span className="text-slate-300 leading-relaxed">
                      I have reviewed the video, title, description, and thumbnail. I grant permission to upload and publish this video to the connected YouTube channel.
                    </span>
                  </div>
                </label>
              </div>

              {/* Publish CTA Button */}
              <div className="pt-2">
                <Button
                  size="lg"
                  variant="primary"
                  className="w-full"
                  disabled={!userConfirmed || !selectedProject?.finalVideoUrl || accounts.length === 0}
                  isLoading={isPublishing}
                  icon={<Share2 className="w-4 h-4" />}
                  onClick={handlePublish}
                >
                  Publish Video Now
                </Button>
              </div>
            </div>
          </Card>

          {/* Published Video Success Card */}
          {publishedSuccess && (
            <Card className="p-5 border-emerald-500/50 bg-emerald-950/20 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h4 className="font-bold text-white text-sm">Video Successfully Published!</h4>
              </div>
              <p className="text-xs text-slate-300">
                Your video is now live on YouTube. View it using the link below:
              </p>
              <a
                href={publishedSuccess.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-brand-400 hover:underline font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {publishedSuccess.youtubeUrl}
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
