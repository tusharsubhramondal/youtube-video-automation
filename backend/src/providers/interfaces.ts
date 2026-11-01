export interface ResearchResult {
  topic: string;
  angle: string;
  targetAudience: string;
  keywords: string[];
  contentOutline: {
    sectionTitle: string;
    points: string[];
  }[];
  hooks: string[];
}

export interface SceneScript {
  sceneNumber: number;
  narrationText: string;
  visualPrompt: string;
  cameraMovement: string;
  transition: string;
  durationSeconds: number;
}

export interface ScriptResult {
  title: string;
  hook: string;
  scenes: SceneScript[];
  callToAction: string;
  totalEstimatedDuration: number;
}

export interface LLMProvider {
  name: string;
  generateResearch(topic: string, category: string, language: string): Promise<ResearchResult>;
  generateScript(params: {
    topic: string;
    research: ResearchResult;
    targetDuration: number;
    format: 'SHORTS' | 'REGULAR';
    visualStyle: string;
    voiceStyle: string;
    language: string;
  }): Promise<ScriptResult>;
  generateSeoMetadata(params: {
    topic: string;
    script: ScriptResult;
    category: string;
  }): Promise<{
    titles: string[];
    description: string;
    tags: string[];
    hashtags: string[];
    thumbnailTextIdeas: string[];
  }>;
  generateThumbnailPrompt(topic: string, visualStyle: string): Promise<{
    concept: string;
    prompt: string;
    overlayText: string;
  }>;
}

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  style?: string;
  model?: string;
  outputPath: string;
}

export interface ImageProvider {
  name: string;
  generateImage(options: ImageGenerationOptions): Promise<{
    url: string;
    localPath: string;
    provider?: string;
    model?: string;
    fileSizeBytes?: number;
  }>;
}

export interface VideoGenerationOptions {
  prompt?: string;
  imagePath?: string;
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16';
  cameraMovement?: string;
  outputPath: string;
}

export interface VideoProvider {
  name: string;
  generateVideo(options: VideoGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }>;
}

export interface TTSOptions {
  text: string;
  voiceStyle?: string;
  language?: string;
  outputPath: string;
}

export interface TTSProvider {
  name: string;
  generateSpeech(options: TTSOptions): Promise<{
    url: string;
    localPath: string;
    durationSeconds: number;
  }>;
}

export interface YouTubeUploadParams {
  videoFilePath: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  thumbnailPath?: string;
}

export interface YouTubeProvider {
  name: string;
  getAuthUrl(): string;
  handleOAuthCallback(code: string): Promise<any>;
  uploadVideo(params: YouTubeUploadParams): Promise<{
    videoId: string;
    url: string;
    publishedAt: Date;
  }>;
}

