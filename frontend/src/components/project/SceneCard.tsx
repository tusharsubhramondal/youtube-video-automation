import React, { useState } from 'react';
import {
  Play,
  Pause,
  Image as ImageIcon,
  Film,
  Mic,
  Trash2,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { VideoScene } from '../../types';

interface SceneCardProps {
  scene: VideoScene;
  onUpdate: (updated: Partial<VideoScene>) => Promise<void>;
  onDelete: () => Promise<void>;
  onGenerateImage: () => Promise<void>;
  onGenerateAudio: () => Promise<void>;
  onGenerateVideo: () => Promise<void>;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  onUpdate,
  onDelete,
  onGenerateImage,
  onGenerateAudio,
  onGenerateVideo,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [narration, setNarration] = useState(scene.narrationText);
  const [prompt, setPrompt] = useState(scene.visualPrompt);
  const [duration, setDuration] = useState(scene.duration);
  const [camera, setCamera] = useState(scene.cameraMovement || 'Zoom in slowly');
  const [transition, setTransition] = useState(scene.transition || 'fade');
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        narrationText: narration,
        visualPrompt: prompt,
        duration: Number(duration),
        cameraMovement: camera,
        transition,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAudio = () => {
    if (!scene.audioUrl) return;
    if (isPlayingAudio && audioObj) {
      audioObj.pause();
      setIsPlayingAudio(false);
    } else {
      const audio = new Audio(scene.audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.play();
      setAudioObj(audio);
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 font-bold text-xs flex items-center justify-center border border-brand-500/30">
            #{scene.sceneNumber}
          </span>
          <h4 className="font-semibold text-white text-sm">Scene {scene.sceneNumber}</h4>
          <Badge variant="purple" size="sm">
            <Clock className="w-3 h-3" />
            {scene.duration}s
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button
              size="sm"
              variant="primary"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSave}
              isLoading={isSaving}
            >
              Save
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Media Preview & Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Visual Preview */}
        <div className="space-y-2">
          <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative group flex items-center justify-center">
            {scene.videoUrl ? (
              <video
                src={scene.videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            ) : scene.imageUrl ? (
              <img
                src={scene.imageUrl}
                alt={`Scene ${scene.sceneNumber}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4 text-slate-400">
                <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-40" />
                <span className="text-xs">No media synthesized</span>
              </div>
            )}
          </div>

          {/* Media generation actions */}
          <div className="grid grid-cols-3 gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] px-1 py-1"
              icon={<ImageIcon className="w-3 h-3" />}
              onClick={onGenerateImage}
              title="Generate Image"
            >
              Image
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] px-1 py-1"
              icon={<Film className="w-3 h-3" />}
              onClick={onGenerateVideo}
              title="Generate Video Clip"
            >
              Video
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-[11px] px-1 py-1"
              icon={<Mic className="w-3 h-3" />}
              onClick={onGenerateAudio}
              title="Synthesize Voice"
            >
              Voice
            </Button>
          </div>

          {scene.audioUrl && (
            <button
              onClick={toggleAudio}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-brand-300 border border-slate-700 transition-colors"
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlayingAudio ? 'Stop Preview' : 'Play Narration'}</span>
            </button>
          )}
        </div>

        {/* Script & Prompts */}
        <div className="md:col-span-2 space-y-3">
          {/* Narration */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Mic className="w-3.5 h-3.5 text-brand-400" />
              Narration Script (Spoken Voiceover)
            </label>
            {isEditing ? (
              <textarea
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
              />
            ) : (
              <p className="text-xs text-slate-200 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                {scene.narrationText}
              </p>
            )}
          </div>

          {/* Visual Prompt */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Visual Prompt (AI Generation Directive)
            </label>
            {isEditing ? (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
              />
            ) : (
              <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed italic">
                "{scene.visualPrompt}"
              </p>
            )}
          </div>

          {/* Camera & Transition Controls */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Camera Motion:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              ) : (
                <span className="text-slate-300 font-medium">{scene.cameraMovement || 'Zoom in'}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Transition:</span>
              {isEditing ? (
                <select
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                >
                  <option value="fade">Fade</option>
                  <option value="wipe">Wipe</option>
                  <option value="cut">Direct Cut</option>
                </select>
              ) : (
                <span className="text-slate-300 font-medium capitalize">{scene.transition || 'Fade'}</span>
              )}
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Duration (s):</span>
              {isEditing ? (
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-white"
                />
              ) : (
                <span className="text-slate-300 font-mono font-medium">{scene.duration}s</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

