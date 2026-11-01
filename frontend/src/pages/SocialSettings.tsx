import React, { useEffect, useState } from 'react';
import {
  Share2,
  Key,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Instagram,
  Facebook,
  Info,
} from 'lucide-react';
import { metaService } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const SocialSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pageId, setPageId] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await metaService.getAccounts();
      setAccounts(data || []);
    } catch (err) {
      console.error('Failed to load Meta accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageId.trim() || !pageAccessToken.trim()) return;

    setIsConnecting(true);
    try {
      const res = await metaService.connectAccount({
        pageId: pageId.trim(),
        pageAccessToken: pageAccessToken.trim(),
      });
      alert(res.message || 'Meta account connected successfully!');
      setPageId('');
      setPageAccessToken('');
      setShowConnectModal(false);
      await loadAccounts();
    } catch (err: any) {
      alert(`Connection failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect "${name}"?`)) return;
    try {
      await metaService.disconnectAccount(id);
      await loadAccounts();
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="w-5 h-5 text-brand-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Social Accounts & Distribution</h1>
          </div>
          <p className="text-xs text-slate-400">
            Connect your Facebook Pages and Instagram Professional accounts for automated direct Reels publishing.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowConnectModal(!showConnectModal)}
        >
          {showConnectModal ? 'Cancel' : 'Connect Facebook & Instagram'}
        </Button>
      </div>

      {/* Connect Account Form */}
      {showConnectModal && (
        <Card className="space-y-4 border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/40">
                <Facebook className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Connect Facebook Page & Instagram Account</h3>
                <p className="text-[11px] text-slate-400">Provide your Facebook Page ID and Page Access Token</p>
              </div>
            </div>
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
            >
              Meta Graph API Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <form onSubmit={handleConnect} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block font-medium mb-1">Facebook Page ID *</label>
              <input
                required
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="e.g. 102938475610293"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block font-medium mb-1">Page Access Token (with Reels & Post permissions) *</label>
              <input
                required
                type="password"
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
                placeholder="EAA..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-mono focus:ring-1 focus:ring-brand-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Required permissions: <code>pages_show_list</code>, <code>pages_manage_posts</code>, <code>instagram_basic</code>, <code>instagram_content_publish</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                To publish to Instagram Reels, ensure your Instagram Business or Creator account is connected to your Facebook Page in <strong>Facebook Page Settings &rarr; Linked Accounts</strong>.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowConnectModal(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" isLoading={isConnecting}>
                Verify & Connect Account
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Connected Accounts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="py-12 text-center space-y-3 border-dashed border-slate-800">
            <Share2 className="w-8 h-8 text-slate-600 mx-auto" />
            <div>
              <h4 className="text-sm font-semibold text-white">No Meta Accounts Connected</h4>
              <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                Connect your Facebook Page and Instagram Business account to start publishing vertical Reels automatically.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowConnectModal(true)}
            >
              Connect Facebook & Instagram
            </Button>
          </Card>
        ) : (
          accounts.map((acc) => (
            <Card key={acc.id} className="p-4 border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                  {acc.avatarUrl ? (
                    <img src={acc.avatarUrl} alt={acc.pageName} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <Facebook className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{acc.pageName}</span>
                    <Badge variant="success" size="sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Connected
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    <span>Page ID: {acc.pageId}</span>
                    <span>•</span>
                    {acc.instagramUsername ? (
                      <span className="text-pink-400 font-medium">IG: @{acc.instagramUsername}</span>
                    ) : (
                      <span className="text-slate-500">No IG Linked</span>
                    )}
                    <span>•</span>
                    <span>{acc.totalReelsPublished || 0} Reels Published</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDisconnect(acc.id, acc.pageName)}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/20 transition-colors"
                  title="Disconnect account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

