import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { orchestrator } from '../agents/orchestrator.js';

const router = Router();

// Run entire workflow pipeline
router.post('/pipeline/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { startFromStage } = req.body;

    const result = await orchestrator.runPipeline(projectId, startFromStage);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Run a specific agent
router.post('/run/:agentType/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentType, projectId } = req.params;
    const result = await orchestrator.runAgent(agentType.toUpperCase() as any, projectId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get agent executions for a project
router.get('/history/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const history = await prisma.agentExecution.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

export default router;

