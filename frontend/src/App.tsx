import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/layout/Layout';

// 13 Application Pages
import { Dashboard } from './pages/Dashboard';
import { CreateProject } from './pages/CreateProject';
import { ProjectsList } from './pages/ProjectsList';
import { ProjectDetail } from './pages/ProjectDetail';
import { AgentMonitor } from './pages/AgentMonitor';
import { SceneEditor } from './pages/SceneEditor';
import { AssetLibrary } from './pages/AssetLibrary';
import { VideoPreview } from './pages/VideoPreview';
import { ThumbnailGenerator } from './pages/ThumbnailGenerator';
import { SeoManager } from './pages/SeoManager';
import { YouTubeIntegration } from './pages/YouTubeIntegration';
import { ProviderSettings } from './pages/ProviderSettings';
import { AppSettings } from './pages/AppSettings';
import { DailyAutomation } from './pages/DailyAutomation';
import { SocialSettings } from './pages/SocialSettings';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="create" element={<CreateProject />} />
            <Route path="projects" element={<ProjectsList />} />
            <Route path="project/:id" element={<ProjectDetail />} />
            
            {/* Project Context & Global Fallbacks for Studio Pages */}
            <Route path="project/:id/agents" element={<AgentMonitor />} />
            <Route path="agents" element={<AgentMonitor />} />

            <Route path="project/:id/scenes" element={<SceneEditor />} />
            <Route path="scenes" element={<SceneEditor />} />

            <Route path="project/:id/assets" element={<AssetLibrary />} />
            <Route path="assets" element={<AssetLibrary />} />

            <Route path="project/:id/preview" element={<VideoPreview />} />
            <Route path="preview" element={<VideoPreview />} />

            <Route path="project/:id/thumbnails" element={<ThumbnailGenerator />} />
            <Route path="thumbnails" element={<ThumbnailGenerator />} />

            <Route path="project/:id/seo" element={<SeoManager />} />
            <Route path="seo" element={<SeoManager />} />

            {/* Daily Autopilot & Reels Factory */}
            <Route path="automation" element={<DailyAutomation />} />

            {/* Integrations & Settings */}
            <Route path="youtube" element={<YouTubeIntegration />} />
            <Route path="settings/social" element={<SocialSettings />} />
            <Route path="settings/providers" element={<ProviderSettings />} />
            <Route path="settings/app" element={<AppSettings />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;

