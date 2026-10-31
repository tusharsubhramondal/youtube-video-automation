import { prisma } from '../services/prisma.service.js';
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
    console.log('[TEST 1/11] Testing Database Connectivity...');
    await prisma.$connect();
    console.log('✓ Database connection verified.\n');

    // 2. Video Project Creation
    console.log('[TEST 2/11] Creating Test Video Project...');
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
      },
    });
    testProjectId = project.id;
    console.log(`✓ Project created successfully (ID: ${project.id}, Format: ${project.format})\n`);

    // 3. Research Agent Execution
    console.log('[TEST 3/11] Executing Agent 1: Research Agent...');
    const research = await researchAgent.run(testProjectId);
    console.log(`✓ Research Agent completed:`);
    console.log(`  - Angle: "${research.data.angle}"`);
    console.log(`  - Keywords: ${research.data.keywords.slice(0, 4).join(', ')}...\n`);

    // 4. Script Agent Execution
    console.log('[TEST 4/11] Executing Agent 2: Script Agent...');
    const script = await scriptAgent.run(testProjectId);
    const scenes = await prisma.videoScene.findMany({ where: { projectId: testProjectId } });
    console.log(`✓ Script Agent completed:`);
    console.log(`  - Generated Scenes: ${scenes.length}`);
    console.log(`  - Scene 1 Narration: "${scenes[0]?.narrationText}"\n`);

    // 5. Image Agent Execution
    console.log('[TEST 5/11] Executing Agent 3: Image Agent (Scene 1)...');
    const imageResult = await imageAgent.run(testProjectId, scenes[0].id);
    const scene1AfterImage = await prisma.videoScene.findUnique({ where: { id: scenes[0].id } });
    console.log(`✓ Image Agent completed:`);
    console.log(`  - Image URL: ${scene1AfterImage?.imageUrl}\n`);

    // 6. Voice Agent Execution
    console.log('[TEST 6/11] Executing Agent 5: Voice Agent (Scene 1)...');
    const voiceResult = await voiceAgent.run(testProjectId, scenes[0].id);
    const scene1AfterVoice = await prisma.videoScene.findUnique({ where: { id: scenes[0].id } });
    console.log(`✓ Voice Agent completed:`);
    console.log(`  - Audio URL: ${scene1AfterVoice?.audioUrl}`);
    console.log(`  - Synced Spoken Duration: ${scene1AfterVoice?.duration}s\n`);

    // 7. Video Agent Execution (Dynamic Ken Burns Motion Synthesis)
    console.log('[TEST 7/11] Executing Agent 4: Video Agent (Scene 1)...');
    const videoResult = await videoAgent.run(testProjectId, scenes[0].id);
    const scene1AfterVideo = await prisma.videoScene.findUnique({ where: { id: scenes[0].id } });
    console.log(`✓ Video Agent completed:`);
    console.log(`  - Video Clip URL: ${scene1AfterVideo?.videoUrl}\n`);

    // 8. Editing Agent Execution (FFmpeg Multi-Clip Composition Engine)
    console.log('[TEST 8/11] Executing Agent 6: Editing Agent (Master MP4 Render)...');
    const editResult = await editingAgent.run(testProjectId);
    const projectAfterEdit = await prisma.videoProject.findUnique({ where: { id: testProjectId } });
    console.log(`✓ Editing Agent completed:`);
    console.log(`  - Final Master Video Path: ${projectAfterEdit?.finalVideoPath}`);
    console.log(`  - Final Video URL: ${projectAfterEdit?.finalVideoUrl}`);
    console.log(`  - Exists on Disk: ${fs.existsSync(projectAfterEdit?.finalVideoPath || '')}\n`);

    // 9. Thumbnail Agent Execution
    console.log('[TEST 9/11] Executing Agent 7: Thumbnail Agent...');
    const thumbResult = await thumbnailAgent.run(testProjectId);
    const projectAfterThumb = await prisma.videoProject.findUnique({ where: { id: testProjectId } });
    console.log(`✓ Thumbnail Agent completed:`);
    console.log(`  - Thumbnail URL: ${projectAfterThumb?.thumbnailUrl}`);
    console.log(`  - Concept: ${thumbResult.data.concept}\n`);

    // 10. SEO Agent Execution
    console.log('[TEST 10/11] Executing Agent 8: SEO Agent...');
    const seoResult = await seoAgent.run(testProjectId);
    const projectAfterSeo = await prisma.videoProject.findUnique({ where: { id: testProjectId } });
    console.log(`✓ SEO Agent completed:`);
    console.log(`  - SEO Title: "${projectAfterSeo?.seoTitle}"`);
    console.log(`  - Description Length: ${projectAfterSeo?.seoDescription?.length} characters`);
    console.log(`  - Status: ${projectAfterSeo?.status}\n`);

    // 11. Publishing Agent Execution with Safety Gate
    console.log('[TEST 11/11] Testing Publishing Agent & Strict User Approval Guardrail...');
    
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
    console.log('🎉 ALL 11 END-TO-END TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runEndToEndTests();

