import { prisma } from '../services/prisma.service.js';
import { AuthService } from '../services/auth.service.js';
import { orchestrator } from '../agents/orchestrator.js';
import { researchAgent } from '../agents/research.agent.js';
import { scriptAgent } from '../agents/script.agent.js';
import { imageAgent } from '../agents/image.agent.js';
import { videoAgent } from '../agents/video.agent.js';
import { voiceAgent } from '../agents/voice.agent.js';
import { editingAgent } from '../agents/editing.agent.js';
import { thumbnailAgent } from '../agents/thumbnail.agent.js';
import { seoAgent } from '../agents/seo.agent.js';
import { publishingAgent } from '../agents/publishing.agent.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';

async function runEndToEndTests() {
  console.log('\n======================================================');
  console.log('🤖 AI YOUTUBE VIDEO AUTOMATION PLATFORM: E2E TEST SUITE');
  console.log('======================================================\n');

  let testProjectId = '';

  try {
    // 1. Database Connection Test
    console.log('[TEST 1/13] Testing Database Connectivity...');
    await prisma.$connect();
    console.log('✓ Database connection verified.\n');

    // 2. Authentication & Security Services Test
    console.log('[TEST 2/13] Testing Authentication, Scrypt Hashing & JWT Security...');
    const rawPass = 'CreatorSecurePassword2026!';
    const hashed = AuthService.hashPassword(rawPass);
    const validCheck = AuthService.verifyPassword(rawPass, hashed);
    const invalidCheck = AuthService.verifyPassword('WrongPassword', hashed);
    if (!validCheck || invalidCheck) {
      throw new Error('AuthService password hashing/verification failed.');
    }
    const testUser = await AuthService.getOrCreateDefaultUser();
    const token = AuthService.generateToken({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
    });
    const verifiedUser = AuthService.verifyToken(token);
    if (!verifiedUser || verifiedUser.id !== testUser.id) {
      throw new Error('JWT generation or verification failed.');
    }
    console.log(`✓ Auth & Security verified:`);
    console.log(`  - Default User ID: ${testUser.id}`);
    console.log(`  - User Email: ${testUser.email} (Role: ${testUser.role})`);
    console.log(`  - JWT Token successfully issued & validated.\n`);

    // 3. Voice Profiles Management Test
    console.log('[TEST 3/13] Testing Voice Profiles Engine...');
    const voiceCount = await prisma.voiceProfile.count();
    if (voiceCount === 0) {
      await prisma.voiceProfile.create({
        data: {
          name: 'Deep Narration (Christopher)',
          voiceId: 'en-US-ChristopherNeural',
          language: 'en-US',
          gender: 'Male',
          isDefault: true,
        },
      });
    }
    const voices = await prisma.voiceProfile.findMany();
    console.log(`✓ Voice Profiles verified:`);
    console.log(`  - Total Available Voices: ${voices.length}`);
    console.log(`  - Primary Voice: ${voices[0]?.name} (${voices[0]?.voiceId})\n`);

    // 4. Video Project Creation
    console.log('[TEST 4/13] Creating Test Video Project...');
    const project = await prisma.videoProject.create({
      data: {
        title: 'The AI Revolution in Autonomous Robotics',
        topic: 'How autonomous humanoid robots and AI are transforming factories in 2026',
        category: 'Technology & AI',
        language: 'English',
        targetDuration: 30,
        format: 'SHORTS', // Test 9:16 vertical shorts format
        visualStyle: 'Cyberpunk',
        voiceStyle: 'Deep Narration',
        status: 'DRAFT',
        currentStage: 'initial',
        userId: testUser.id,
      },
    });
    testProjectId = project.id;
    console.log(`✓ Project created successfully (ID: ${project.id}, Format: ${project.format})\n`);

    // 5. Research Agent Execution
    console.log('[TEST 5/13] Executing Agent 1: Research Agent...');
    const research = await researchAgent.run(testProjectId);
    console.log(`✓ Research Agent completed:`);
    console.log(`  - Angle: "${research.data.angle}"`);
    console.log(`  - Keywords: ${research.data.keywords.slice(0, 4).join(', ')}...\n`);

    // 6. Script Agent Execution
    console.log('[TEST 6/13] Executing Agent 2: Script Agent...');
    const script = await scriptAgent.run(testProjectId);
    const scenes = await prisma.videoScene.findMany({ where: { projectId: testProjectId } });
    console.log(`✓ Script Agent completed:`);
    console.log(`  - Generated Scenes: ${scenes.length}`);
    console.log(`  - Scene 1 Narration: "${scenes[0]?.narrationText}"\n`);

    // 7. Image Agent Execution
    console.log('[TEST 7/13] Executing Agent 3: Image Agent (Scene 1)...');
    const imageResult = await imageAgent.run(testProjectId, scenes[0].id);
    const scene1AfterImage = await prisma.videoScene.findUnique({ where: { id: scenes[0].id } });
    console.log(`✓ Image Agent completed:`);
    console.log(`  - Image URL: ${scene1AfterImage?.imageUrl}\n`);

    // 8. Voice Agent Execution
    console.log('[TEST 8/13] Executing Agent 5: Voice Agent (Scene 1)...');
    const voiceResult = await voiceAgent.run(testProjectId, scenes[0].id);
    const scene1AfterVoice = await prisma.videoScene.findUnique({ where: { id: scenes[0].id } });
    console.log(`✓ Voice Agent completed:`);
    console.log(`  - Audio URL: ${scene1AfterVoice?.audioUrl}`);
    console.log(`  - Synced Spoken Duration: ${scene1AfterVoice?.duration}s\n`);

    // 9. Video Agent Execution (Dynamic Ken Burns Motion Synthesis)
    console.log('[TEST 9/13] Executing Agent 4: Video Agent (Scene 1)...');
    const videoResult = await videoAgent.run(testProjectId, scenes[0].id);
    const scene1AfterVideo = await prisma.videoScene.findUnique({ where: { id: scenes[0].id } });
    console.log(`✓ Video Agent completed:`);
    console.log(`  - Video Clip URL: ${scene1AfterVideo?.videoUrl}\n`);

    // 10. Editing Agent Execution (FFmpeg Multi-Clip Composition Engine with Audio Ducking & Subtitles)
    console.log('[TEST 10/13] Executing Agent 6: Editing Agent (Multi-Clip Concat, Audio Ducking & Subtitle Burn-In)...');
    const editResult = await editingAgent.run(testProjectId, undefined, {
      resolution: '720p',
      fps: 30,
      enableSubtitles: true,
      subtitleFontSize: 24,
      bgMusicVolume: 0.15,
      voiceVolume: 1.0,
    });
    const projectAfterEdit = await prisma.videoProject.findUnique({ where: { id: testProjectId } });
    console.log(`✓ Editing Agent completed:`);
    console.log(`  - Final Master Video Path: ${projectAfterEdit?.finalVideoPath}`);
    console.log(`  - Final Video URL: ${projectAfterEdit?.finalVideoUrl}`);
    console.log(`  - Subtitles SRT URL: ${editResult.data.subtitlesUrl}`);
    console.log(`  - Subtitles VTT URL: ${editResult.data.subtitlesVttUrl}`);
    console.log(`  - Master MP4 Exists on Disk: ${fs.existsSync(projectAfterEdit?.finalVideoPath || '')}\n`);

    // 11. Thumbnail Agent Execution
    console.log('[TEST 11/13] Executing Agent 7: Thumbnail Agent...');
    const thumbResult = await thumbnailAgent.run(testProjectId);
    const projectAfterThumb = await prisma.videoProject.findUnique({ where: { id: testProjectId } });
    console.log(`✓ Thumbnail Agent completed:`);
    console.log(`  - Thumbnail URL: ${projectAfterThumb?.thumbnailUrl}`);
    console.log(`  - Concept: ${thumbResult.data.concept}\n`);

    // 12. SEO Agent Execution
    console.log('[TEST 12/13] Executing Agent 8: SEO Agent...');
    const seoResult = await seoAgent.run(testProjectId);
    const projectAfterSeo = await prisma.videoProject.findUnique({ where: { id: testProjectId } });
    console.log(`✓ SEO Agent completed:`);
    console.log(`  - SEO Title: "${projectAfterSeo?.seoTitle}"`);
    console.log(`  - Description Length: ${projectAfterSeo?.seoDescription?.length} characters`);
    console.log(`  - Status: ${projectAfterSeo?.status}\n`);

    // 13. Publishing Agent Execution with Safety Gate
    console.log('[TEST 13/13] Testing Publishing Agent & Strict User Approval Guardrail...');
    
    // Connect sandbox test channel
    const testChannel = await prisma.youTubeAccount.upsert({
      where: { channelId: 'UC_TEST_SANDBOX_CHANNEL' },
      update: { isConnected: true },
      create: {
        channelId: 'UC_TEST_SANDBOX_CHANNEL',
        channelTitle: 'AutoTube Test Studio',
        accessToken: 'valid_test_token',
        isConnected: true,
      },
    });

    // Test rejection without approval
    let blockedWithoutApproval = false;
    try {
      await publishingAgent.publishVideo({
        projectId: testProjectId,
        title: projectAfterSeo?.seoTitle || 'Title',
        description: projectAfterSeo?.seoDescription || 'Description',
        privacyStatus: 'PRIVATE',
        userApproved: false, // Intentionally test safety rejection!
      });
    } catch (err: any) {
      blockedWithoutApproval = true;
      console.log(`✓ Policy Guardrail enforced: Rejection confirmed when userApproved = false ("${err.message}")`);
    }

    if (!blockedWithoutApproval) {
      throw new Error('Safety violation: Publishing Agent did not enforce user approval!');
    }

    // Now test with userApproved = true
    const published = await publishingAgent.publishVideo({
      projectId: testProjectId,
      youtubeAccountId: testChannel.id,
      title: projectAfterSeo?.seoTitle || 'Title',
      description: projectAfterSeo?.seoDescription || 'Description',
      privacyStatus: 'PRIVATE',
      userApproved: true,
    });

    console.log(`✓ Publishing Agent succeeded with explicit user approval:`);
    console.log(`  - Video ID: ${published.youtubeVideoId}`);
    console.log(`  - YouTube URL: ${published.youtubeUrl}`);
    console.log(`  - Privacy: ${published.privacyStatus}\n`);

    console.log('======================================================');
    console.log('🎉 ALL 13 END-TO-END TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEndToEndTests();

