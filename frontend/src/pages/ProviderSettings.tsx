import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Cpu,
  Sparkles,
  Mic,
  Volume2,
  Plus,
  Trash2,
  Play,
  Pause,
  Loader2,
} from 'lucide-react';
import { settingsService, voiceService } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { VoiceProfile } from '../types';

export const ProviderSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash');
  const [openAiKey, setOpenAiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Voice Profiles State
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [showAddVoice, setShowAddVoice] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newVoiceLang, setNewVoiceLang] = useState('en-US');
  const [newVoiceGender, setNewVoiceGender] = useState('Male');
  const [isAddingVoice, setIsAddingVoice] = useState(false);

  useEffect(() => {
    loadSettings();
    loadVoices();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
      const geminiProv = data.providers?.find((p: any) => p.providerKey === 'gemini');
      if (geminiProv) {
        setGeminiKey(geminiProv.apiKey || '');
        setGeminiModel(geminiProv.modelName || 'gemini-1.5-flash');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVoices = async () => {
    try {
      const data = await voiceService.getVoices();
      setVoices(data);
    } catch (err) {
      console.error('Failed to load voice profiles:', err);
    }
  };

  const handlePlayVoice = async (voice: VoiceProfile) => {
    if (playingVoiceId === voice.id && activeAudio) {
      activeAudio.pause();
      setActiveAudio(null);
      setPlayingVoiceId(null);
      return;
    }

    if (activeAudio) {
      activeAudio.pause();
    }

    try {
      setLoadingVoiceId(voice.id);
      let sampleUrl = voice.sampleUrl;
      if (!sampleUrl) {
        const preview = await voiceService.previewVoice(voice.id);
        sampleUrl = preview.sampleUrl;
        await loadVoices();
      }
      if (sampleUrl) {
        const audio = new Audio(sampleUrl);
        audio.onended = () => {
          setPlayingVoiceId(null);
          setActiveAudio(null);
        };
        await audio.play();
        setActiveAudio(audio);
        setPlayingVoiceId(voice.id);
      }
    } catch (err) {
      console.error('Failed to preview voice:', err);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const handleAddVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoiceName.trim()) return;
    setIsAddingVoice(true);
    try {
      await voiceService.createVoice({
        name: newVoiceName,
        voiceId: newVoiceId || newVoiceName,
        language: newVoiceLang,
        gender: newVoiceGender,
      });
      setNewVoiceName('');
      setNewVoiceId('');
      setShowAddVoice(false);
      await loadVoices();
    } catch (err) {
      console.error('Failed to add voice profile:', err);
    } finally {
      setIsAddingVoice(false);
    }
  };

  const handleDeleteVoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice profile?')) return;
    try {
      await voiceService.deleteVoice(id);
      await loadVoices();
    } catch (err) {
      console.error('Failed to delete voice profile:', err);
    }
  };

  const handleSaveGemini = async () => {
    setIsSaving(true);
    try {
      await settingsService.saveProvider({
        providerKey: 'gemini',
        name: 'Google Gemini',
        type: 'LLM',
        apiKey: geminiKey,
        modelName: geminiModel,
        isEnabled: true,
      });
      alert('Gemini settings saved successfully!');
      await loadSettings();
    } catch (err) {
      console.error('Failed to save provider:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading AI provider settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5 text-brand-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Provider Settings</h1>
        </div>
        <p className="text-xs text-slate-400">
          Configure API keys, models, and fallback providers. The system automatically utilizes Mock Providers when API keys are not supplied.
        </p>
      </div>

      {/* Google Gemini Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-950 text-brand-400 border border-brand-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Google Gemini (Recommended LLM)</h3>
              <p className="text-xs text-slate-400">
                Powers the Research Agent, Script Agent, and SEO Metadata Agent
              </p>
            </div>
          </div>

          <Badge variant={settings?.env?.hasGeminiKey || geminiKey ? 'success' : 'warning'}>
            {settings?.env?.hasGeminiKey || geminiKey ? 'Active Key' : 'Using Mock Fallback'}
          </Badge>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 block font-medium mb-1">Gemini API Key</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 block font-medium mb-1">Model Name</label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            >
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Recommended • High Speed & Stability)</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash (High Capacity Flash)</option>
              <option value="gemini-3.7-flash">gemini-3.7-flash (Latest Fast Model)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Flagship Advanced Reasoning)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (In-depth Complex Reasoning)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              size="sm"
              variant="primary"
              icon={<Save className="w-3.5 h-3.5" />}
              isLoading={isSaving}
              onClick={handleSaveGemini}
            >
              Save Gemini Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Voice Profiles Management Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/70 text-purple-400 border border-purple-800/60">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Voice Profiles & TTS Narration Actors</h3>
              <p className="text-xs text-slate-400">
                Configure voiceover narration personas, audition live synthesis samples, or register custom voices.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowAddVoice(!showAddVoice)}
          >
            {showAddVoice ? 'Cancel' : 'Add Voice'}
          </Button>
        </div>

        {/* Add Voice Form */}
        {showAddVoice && (
          <form onSubmit={handleAddVoice} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold text-white">Create Custom Voice Profile</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Display Name *</label>
                <input
                  required
                  type="text"
                  value={newVoiceName}
                  onChange={(e) => setNewVoiceName(e.target.value)}
                  placeholder="e.g., Tech Guru (Liam)"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Voice ID / Model Code *</label>
                <input
                  type="text"
                  value={newVoiceId}
                  onChange={(e) => setNewVoiceId(e.target.value)}
                  placeholder="e.g., en-US-LiamNeural"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Language</label>
                <input
                  type="text"
                  value={newVoiceLang}
                  onChange={(e) => setNewVoiceLang(e.target.value)}
                  placeholder="en-US"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1">Gender</label>
                <select
                  value={newVoiceGender}
                  onChange={(e) => setNewVoiceGender(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Neutral">Neutral</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="primary" type="submit" isLoading={isAddingVoice}>
                Save Voice Profile
              </Button>
            </div>
          </form>
        )}

        {/* Voice List */}
        <div className="space-y-2 text-xs">
          {voices.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No voice profiles loaded. Generating defaults...</p>
          ) : (
            voices.map((v) => (
              <div
                key={v.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlayVoice(v)}
                    disabled={loadingVoiceId === v.id}
                    className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-brand-400 transition-colors"
                  >
                    {loadingVoiceId === v.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                    ) : playingVoiceId === v.id ? (
                      <Pause className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{v.name}</span>
                      {v.isDefault && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-brand-500/20 text-brand-300 rounded border border-brand-500/40 font-mono">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {v.gender} • {v.language} • {v.voiceId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePlayVoice(v)}
                    disabled={loadingVoiceId === v.id}
                  >
                    {playingVoiceId === v.id ? 'Stop' : 'Audition'}
                  </Button>
                  {!v.isDefault && (
                    <button
                      onClick={() => handleDeleteVoice(v.id)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Free & Open Source Providers Info */}
      <Card className="space-y-3">
        <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Active Free & Built-In Services
        </h3>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Pollinations AI (Image Engine)</h4>
              <p className="text-slate-400 mt-0.5">Free high-resolution AI image generation without API key requirements.</p>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">FFmpeg Dynamic Motion Video Engine</h4>
              <p className="text-slate-400 mt-0.5">Transforms scene images into smooth animated video clips with Ken Burns camera motion.</p>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Google Free TTS Engine</h4>
              <p className="text-slate-400 mt-0.5">Synthesizes voiceover narration audio tracks with automatic word timing.</p>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
