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
  Bot,
  Image as ImageIcon,
  Wand2,
  FileText,
  Search,
  Zap,
} from 'lucide-react';
import { settingsService, voiceService } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { VoiceProfile } from '../types';

export const ProviderSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gemini State
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash-lite');
  const [isSavingGemini, setIsSavingGemini] = useState(false);

  // OpenAI State
  const [openAiKey, setOpenAiKey] = useState('');
  const [openAiModel, setOpenAiModel] = useState('gpt-4o');
  const [isSavingOpenAi, setIsSavingOpenAi] = useState(false);

  // Pollinations AI State
  const [pollinationsKey, setPollinationsKey] = useState('');
  const [pollinationsModel, setPollinationsModel] = useState('flux');
  const [isSavingPollinations, setIsSavingPollinations] = useState(false);

  // Agent Model Routing State
  const [agentRouting, setAgentRouting] = useState<Record<string, { provider: string; model?: string }>>({
    RESEARCH: { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
    SCRIPT: { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
    IMAGE: { provider: 'pollinations', model: 'flux' },
    THUMBNAIL: { provider: 'openai', model: 'dall-e-3' },
    SEO: { provider: 'gemini', model: 'gemini-3.5-flash-lite' },
  });
  const [isSavingRouting, setIsSavingRouting] = useState(false);

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

      // Gemini
      const geminiProv = data.providers?.find((p: any) => p.providerKey === 'gemini');
      if (geminiProv) {
        setGeminiKey(geminiProv.apiKey || '');
        setGeminiModel(geminiProv.modelName || 'gemini-3.5-flash-lite');
      }

      // OpenAI
      const openAiProv = data.providers?.find((p: any) => p.providerKey === 'openai');
      if (openAiProv) {
        setOpenAiKey(openAiProv.apiKey || '');
        setOpenAiModel(openAiProv.modelName || 'gpt-4o');
      }

      // Pollinations
      const pollinationsProv = data.providers?.find((p: any) => p.providerKey === 'pollinations');
      if (pollinationsProv) {
        setPollinationsKey(pollinationsProv.apiKey || '');
        setPollinationsModel(pollinationsProv.modelName || 'flux');
      }

      // Agent Routing
      if (data.agentRouting) {
        setAgentRouting((prev) => ({ ...prev, ...data.agentRouting }));
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

  const handleSaveGemini = async () => {
    setIsSavingGemini(true);
    try {
      await settingsService.saveProvider({
        providerKey: 'gemini',
        name: 'Google Gemini',
        type: 'LLM',
        apiKey: geminiKey,
        modelName: geminiModel,
        isEnabled: true,
      });
      alert('Google Gemini settings saved successfully!');
      await loadSettings();
    } catch (err: any) {
      alert(`Failed to save Gemini: ${err.message}`);
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleSaveOpenAi = async () => {
    setIsSavingOpenAi(true);
    try {
      await settingsService.saveProvider({
        providerKey: 'openai',
        name: 'OpenAI',
        type: 'LLM',
        apiKey: openAiKey,
        modelName: openAiModel,
        isEnabled: true,
      });
      alert('OpenAI settings saved successfully!');
      await loadSettings();
    } catch (err: any) {
      alert(`Failed to save OpenAI: ${err.message}`);
    } finally {
      setIsSavingOpenAi(false);
    }
  };

  const handleSavePollinations = async () => {
    setIsSavingPollinations(true);
    try {
      await settingsService.saveProvider({
        providerKey: 'pollinations',
        name: 'Pollinations AI',
        type: 'IMAGE',
        apiKey: pollinationsKey,
        modelName: pollinationsModel,
        isEnabled: true,
      });
      alert('Pollinations AI settings saved successfully!');
      await loadSettings();
    } catch (err: any) {
      alert(`Failed to save Pollinations: ${err.message}`);
    } finally {
      setIsSavingPollinations(false);
    }
  };

  const handleSaveRouting = async () => {
    setIsSavingRouting(true);
    try {
      await settingsService.saveRouting(agentRouting);
      alert('Agent Model Routing Matrix saved successfully! Future agent runs will route to these models.');
      await loadSettings();
    } catch (err: any) {
      alert(`Failed to save agent routing: ${err.message}`);
    } finally {
      setIsSavingRouting(false);
    }
  };

  const updateRouting = (agentKey: string, field: 'provider' | 'model', value: string) => {
    setAgentRouting((prev) => ({
      ...prev,
      [agentKey]: {
        ...prev[agentKey],
        [field]: value,
      },
    }));
  };

  // Voice Handlers
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

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading AI provider settings...</div>;
  }

  const hasGemini = Boolean(settings?.env?.hasGeminiKey || geminiKey);
  const hasOpenAi = Boolean(settings?.env?.hasOpenAiKey || openAiKey);
  const hasPollinationsPollen = Boolean(pollinationsKey);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5 text-brand-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Provider & Multi-Model Engine</h1>
        </div>
        <p className="text-xs text-slate-400">
          Configure API credentials, preferred foundation models, and assign specific AI models to each autonomous agent.
        </p>
      </div>

      {/* SECTION 1: AI Provider Credentials Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Key className="w-4 h-4 text-brand-400" />
          Provider API Credentials & Models
        </h2>

        {/* 1. Google Gemini Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Google Gemini</h3>
                <p className="text-xs text-slate-400">
                  Fast, high-capacity multimodal LLM powering Research, Script, and SEO agents.
                </p>
              </div>
            </div>

            <Badge variant={hasGemini ? 'success' : 'warning'}>
              {hasGemini ? 'Active API Key' : 'Not Configured'}
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
              <label className="text-slate-300 block font-medium mb-1">Default Gemini Model</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Recommended • High Speed & Stability)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash (High Capacity Flash)</option>
                <option value="gemini-3.7-flash">gemini-3.7-flash (Latest Fast Model)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Advanced Reasoning Flagship)</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro (In-depth Complex Reasoning)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="primary"
                icon={<Save className="w-3.5 h-3.5" />}
                isLoading={isSavingGemini}
                onClick={handleSaveGemini}
              >
                Save Gemini Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. OpenAI Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">OpenAI (GPT-4o & DALL-E 3)</h3>
                <p className="text-xs text-slate-400">
                  Powers creative script storytelling, deep reasoning, and high-CTR DALL-E 3 visuals.
                </p>
              </div>
            </div>

            <Badge variant={hasOpenAi ? 'success' : 'warning'}>
              {hasOpenAi ? 'Active API Key' : 'Not Configured'}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block font-medium mb-1">OpenAI API Key</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block font-medium mb-1">Default OpenAI LLM Model</label>
              <select
                value={openAiModel}
                onChange={(e) => setOpenAiModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="gpt-4o">gpt-4o (Flagship Omni • Creative Scripting & Nuance)</option>
                <option value="gpt-4o-mini">gpt-4o-mini (High Speed & Low Cost)</option>
                <option value="gpt-4-turbo">gpt-4-turbo (Comprehensive Script Reasoning)</option>
                <option value="o1-mini">o1-mini (Advanced Logical Reasoning)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="primary"
                icon={<Save className="w-3.5 h-3.5" />}
                isLoading={isSavingOpenAi}
                onClick={handleSaveOpenAi}
              >
                Save OpenAI Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* 3. Pollinations AI Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950 text-purple-400 border border-purple-800/60">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Pollinations AI (Image Engine)</h3>
                <p className="text-xs text-slate-400">
                  Real AI image generation (Flux, Sana, Turbo). Operates free publicly, or with Pollen key for high speed.
                </p>
              </div>
            </div>

            <Badge variant={hasPollinationsPollen ? 'success' : 'info'}>
              {hasPollinationsPollen ? 'Pollen Key Active (Unlimited)' : 'Free Public Tier'}
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block font-medium mb-1">
                Pollen API Key <span className="text-slate-400 font-normal">(Optional from enter.pollinations.ai)</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={pollinationsKey}
                  onChange={(e) => setPollinationsKey(e.target.value)}
                  placeholder="sk_... (leave empty for free tier with auto-retry)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block font-medium mb-1">Preferred Image Model</label>
              <select
                value={pollinationsModel}
                onChange={(e) => setPollinationsModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="flux">flux (High Detail • Cinematic & Realistic Visuals)</option>
                <option value="sana">sana (Fast Modern Text-to-Image Generation)</option>
                <option value="turbo">turbo (Ultra Fast Motion Pacing)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="primary"
                icon={<Save className="w-3.5 h-3.5" />}
                isLoading={isSavingPollinations}
                onClick={handleSavePollinations}
              >
                Save Pollinations Settings
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* SECTION 2: Agent-to-Model Routing Matrix */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/70 text-amber-400 border border-amber-800/60">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Agent Model Assignment Matrix</h3>
              <p className="text-xs text-slate-400">
                Choose which specific foundation model powers each individual autonomous agent.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            icon={<Save className="w-3.5 h-3.5" />}
            isLoading={isSavingRouting}
            onClick={handleSaveRouting}
          >
            Save Routing Preferences
          </Button>
        </div>

        <div className="space-y-3">
          {/* 1. Research Agent */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-blue-400" />
              <div>
                <span className="font-semibold text-white">Research Agent</span>
                <p className="text-[11px] text-slate-400">Viral hook angles, competitor search & keyword extraction</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={agentRouting.RESEARCH?.provider || 'gemini'}
                onChange={(e) => updateRouting('RESEARCH', 'provider', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <select
                value={agentRouting.RESEARCH?.model || 'gemini-3.5-flash-lite'}
                onChange={(e) => updateRouting('RESEARCH', 'model', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fast)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </div>

          {/* 2. Script Agent */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white">Script Agent</span>
                <p className="text-[11px] text-slate-400">Scene-by-scene narration, dialogue storytelling & visual prompts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={agentRouting.SCRIPT?.provider || 'gemini'}
                onChange={(e) => updateRouting('SCRIPT', 'provider', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <select
                value={agentRouting.SCRIPT?.model || 'gemini-3.5-flash-lite'}
                onChange={(e) => updateRouting('SCRIPT', 'model', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash (Expressive)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Flagship)</option>
                <option value="gpt-4o">gpt-4o (Elite Storyteller)</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </select>
            </div>
          </div>

          {/* 3. Image Agent */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <div>
                <span className="font-semibold text-white">Image Agent (Scene Visuals)</span>
                <p className="text-[11px] text-slate-400">Primary visual engine for scene backgrounds</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={agentRouting.IMAGE?.provider || 'pollinations'}
                onChange={(e) => updateRouting('IMAGE', 'provider', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="pollinations">Pollinations AI (Flux/Sana)</option>
                <option value="openai">OpenAI DALL-E 3</option>
              </select>
            </div>
          </div>

          {/* 4. Thumbnail Agent */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Wand2 className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-white">Thumbnail Agent</span>
                <p className="text-[11px] text-slate-400">High-CTR YouTube cover art generation</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={agentRouting.THUMBNAIL?.provider || 'openai'}
                onChange={(e) => updateRouting('THUMBNAIL', 'provider', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="openai">OpenAI DALL-E 3 (High Impact)</option>
                <option value="pollinations">Pollinations AI (Flux)</option>
              </select>
            </div>
          </div>

          {/* 5. SEO Agent */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-semibold text-white">SEO Agent</span>
                <p className="text-[11px] text-slate-400">High-CTR titles, timestamps, and search tag clouds</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={agentRouting.SEO?.provider || 'gemini'}
                onChange={(e) => updateRouting('SEO', 'provider', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <select
                value={agentRouting.SEO?.model || 'gemini-3.5-flash-lite'}
                onChange={(e) => updateRouting('SEO', 'model', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Speed)</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 3: Voice Profiles Management Card */}
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

      {/* SECTION 4: Active Free & Built-In Services Info */}
      <Card className="space-y-3">
        <h3 className="font-semibold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Active Free & Built-In Engine Services
        </h3>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Pollinations AI Multi-Model Real Image Engine</h4>
              <p className="text-slate-400 mt-0.5">Generates real high-resolution images via Flux, Sana, and Turbo with rate-limit recovery.</p>
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
              <h4 className="font-semibold text-white">Real Photographic Scene Engine</h4>
              <p className="text-slate-400 mt-0.5">High-resolution photography curated and auto-cropped to 16:9 / 9:16 via FFmpeg.</p>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">Google Free TTS & Edge Neural Voice Engine</h4>
              <p className="text-slate-400 mt-0.5">Synthesizes voiceover narration audio tracks with automatic word timing.</p>
            </div>
            <Badge variant="success">Operational</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
