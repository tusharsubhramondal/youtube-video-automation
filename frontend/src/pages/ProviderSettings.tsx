import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { settingsService } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const ProviderSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [openAiKey, setOpenAiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
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
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fast & Highly Capable)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (In-depth Complex Reasoning)</option>
              <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (Experimental Next-Gen)</option>
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
