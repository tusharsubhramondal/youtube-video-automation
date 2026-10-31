import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface SubtitleScene {
  sceneNumber: number;
  narrationText: string;
  duration: number;
}

export function formatTimeSrt(seconds: number): string {
  const pad = (num: number, size = 2) => String(Math.floor(num)).padStart(size, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const millis = Math.floor((secs - wholeSecs) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSecs)},${pad(millis, 3)}`;
}

export function formatTimeVtt(seconds: number): string {
  const pad = (num: number, size = 2) => String(Math.floor(num)).padStart(size, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const wholeSecs = Math.floor(secs);
  const millis = Math.floor((secs - wholeSecs) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSecs)}.${pad(millis, 3)}`;
}

export function wrapText(text: string, maxCharsPerLine = 38): string {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines.join('\n');
}

export class SubtitleService {
  /**
   * Generates a standard SubRip (.srt) subtitle file from scenes
   */
  static generateSrt(scenes: SubtitleScene[], outputPath: string, isShorts = false): string {
    let srtContent = '';
    let currentTime = 0;
    const maxChars = isShorts ? 28 : 42;

    scenes.forEach((scene, index) => {
      const startTime = currentTime;
      const duration = Math.max(1, scene.duration || 5);
      const endTime = startTime + duration;
      const formattedText = wrapText(scene.narrationText || '', maxChars);

      srtContent += `${index + 1}\n`;
      srtContent += `${formatTimeSrt(startTime)} --> ${formatTimeSrt(endTime)}\n`;
      srtContent += `${formattedText}\n\n`;

      currentTime = endTime;
    });

    fs.writeFileSync(outputPath, srtContent, 'utf-8');
    logger.info(`Generated SRT subtitle file at: ${outputPath}`);
    return srtContent;
  }

  /**
   * Generates a standard WebVTT (.vtt) subtitle file for browser HTML5 video playback
   */
  static generateVtt(scenes: SubtitleScene[], outputPath: string, isShorts = false): string {
    let vttContent = 'WEBVTT\n\n';
    let currentTime = 0;
    const maxChars = isShorts ? 28 : 42;

    scenes.forEach((scene, index) => {
      const startTime = currentTime;
      const duration = Math.max(1, scene.duration || 5);
      const endTime = startTime + duration;
      const formattedText = wrapText(scene.narrationText || '', maxChars);

      vttContent += `${index + 1}\n`;
      vttContent += `${formatTimeVtt(startTime)} --> ${formatTimeVtt(endTime)}\n`;
      vttContent += `${formattedText}\n\n`;

      currentTime = endTime;
    });

    fs.writeFileSync(outputPath, vttContent, 'utf-8');
    logger.info(`Generated WebVTT subtitle file at: ${outputPath}`);
    return vttContent;
  }
}
