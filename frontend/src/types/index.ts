export type ProjectFormat = 'SHORTS' | 'REGULAR';

export type ProjectStatus =
  | 'DRAFT'
  | 'RESEARCHING'
  | 'SCRIPTING'
  | 'MEDIA_GENERATION'
  | 'EDITING'
  | 'THUMBNAIL_SEO'
  | 'READY_TO_PUBLISH'
  | 'PUBLISHED'
  | 'FAILED';

export type AgentType =
  | 'RESEARCH'
  | 'SCRIPT'
  | 'IMAGE'
  | 'VIDEO'
  | 'VOICE'
  | 'EDITING'
  | 'THUMBNAIL'
  | 'SEO'
  | 'PUBLISHING';

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface VideoScene {
  id: string;
  projectId: string;
  sceneNumber: number;
  narrationText: string;
  visualPrompt: string;
  cameraMovement?: string;
  transition?: string;
  duration: number;
  status: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  subtitleText?: string | null;
}

export interface AgentExecution {
  id: string;
  projectId: string;
  agentType: AgentType;
  status: ExecutionStatus;
  inputPayload?: string | null;
  outputPayload?: string | null;
  logs?: string | null;
  executionTimeMs?: number | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface GeneratedAsset {
  id: string;
  projectId: string;
  sceneId?: string | null;
  scene?: VideoScene | null;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'SUBTITLE' | 'THUMBNAIL' | 'MUSIC';
  provider: string;
  prompt?: string | null;
  url: string;
  localPath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  createdAt: string;
}

export interface VideoRender {
  id: string;
  projectId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  resolution: string;
  aspectRatio: string;
  fps: number;
  durationSec?: number | null;
  outputPath?: string | null;
  outputUrl?: string | null;
  fileSizeBytes?: number | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface ProjectSettings {
  id: string;
  projectId: string;
  resolution: string;
  fps: number;
  enableSubtitles: boolean;
  subtitleFont: string;
  subtitleFontSize: number;
  subtitleColor: string;
  subtitleBgColor: string;
  backgroundMusicVolume: number;
  voiceVolume: number;
  autoPublish: boolean;
}

export interface YouTubeAccount {
  id: string;
  channelId: string;
  channelTitle: string;
  channelDescription?: string | null;
  avatarUrl?: string | null;
  isConnected: boolean;
  createdAt: string;
  _count?: {
    publishedVideos: number;
  };
}

export interface PublishedVideo {
  id: string;
  projectId: string;
  youtubeAccountId: string;
  youtubeAccount: YouTubeAccount;
  youtubeVideoId: string;
  title: string;
  description: string;
  tags?: string | null;
  categoryId: string;
  privacyStatus: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  youtubeUrl: string;
  userApproved: boolean;
  publishedAt?: string | null;
  viewCount: number;
  likeCount: number;
}

export interface VideoProject {
  id: string;
  title: string;
  topic: string;
  category: string;
  language: string;
  targetDuration: number;
  format: ProjectFormat;
  visualStyle: string;
  voiceStyle: string;
  status: ProjectStatus;
  currentStage: string;
  progress: number;
  
  researchNotes?: string | null;
  targetAudience?: string | null;
  keywords?: string | null;
  contentOutline?: string | null;
  
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoTags?: string | null;
  thumbnailPrompt?: string | null;
  thumbnailUrl?: string | null;
  
  finalVideoUrl?: string | null;
  finalVideoPath?: string | null;
  
  scenes?: VideoScene[];
  agentExecutions?: AgentExecution[];
  assets?: GeneratedAsset[];
  renders?: VideoRender[];
  publishedVideos?: PublishedVideo[];
  settings?: ProjectSettings | null;

  createdAt: string;
  updatedAt: string;
  _count?: {
    scenes: number;
    assets: number;
    renders: number;
  };
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: string;
  providerKey: string;
  apiKey?: string | null;
  baseUrl?: string | null;
  modelName?: string | null;
  isDefault: boolean;
  isEnabled: boolean;
}

