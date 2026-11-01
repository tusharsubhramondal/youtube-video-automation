import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

export type AssetCategory =
  | 'images'
  | 'audio'
  | 'video'
  | 'subtitles'
  | 'thumbnails'
  | 'renders'
  | 'uploads';

/**
 * Returns the absolute directory path for a project asset category, ensuring it exists.
 * e.g. <uploadDir>/projects/<projectId>/images
 * or <renderDir>/projects/<projectId>/renders
 */
export function getProjectStoragePath(projectId: string, category: AssetCategory): string {
  const baseDir = category === 'renders' ? config.storage.renderDir : config.storage.uploadDir;
  const projectDir = path.join(baseDir, 'projects', projectId, category);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  return projectDir;
}

/**
 * Returns the public web URL for a project asset.
 * e.g. /uploads/projects/<projectId>/images/<filename>
 * or /renders/projects/<projectId>/renders/<filename>
 */
export function getProjectAssetUrl(projectId: string, category: AssetCategory, filename: string): string {
  const prefix = category === 'renders' ? '/renders' : '/uploads';
  return `${prefix}/projects/${projectId}/${category}/${filename}`;
}

/**
 * Resolves the absolute local file path from an asset URL.
 * Handles both new project-wise URLs and legacy flat URLs seamlessly.
 */
export function resolveAssetLocalPath(url?: string | null): string | null {
  if (!url) return null;
  const cleanUrl = url.split('?')[0].trim();

  // If already an absolute path on disk
  if (path.isAbsolute(cleanUrl) && fs.existsSync(cleanUrl)) {
    return cleanUrl;
  }

  // 1. Uploads paths
  if (cleanUrl.startsWith('/uploads/')) {
    const rel = cleanUrl.replace(/^\/uploads\//, '');
    const directPath = path.join(config.storage.uploadDir, rel);
    if (fs.existsSync(directPath)) return directPath;

    // Fallback to flat root filename for legacy assets
    const flatPath = path.join(config.storage.uploadDir, path.basename(cleanUrl));
    if (fs.existsSync(flatPath)) return flatPath;
  }

  // 2. Renders paths
  if (cleanUrl.startsWith('/renders/')) {
    const rel = cleanUrl.replace(/^\/renders\//, '');
    const directPath = path.join(config.storage.renderDir, rel);
    if (fs.existsSync(directPath)) return directPath;

    // Fallback to flat root filename for legacy assets
    const flatPath = path.join(config.storage.renderDir, path.basename(cleanUrl));
    if (fs.existsSync(flatPath)) return flatPath;
  }

  return null;
}
