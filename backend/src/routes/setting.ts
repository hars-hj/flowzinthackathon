import { Router } from 'express';
import {authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { createAgent } from '../controllers/manageAgents.js';

import {
  getSettings,
  updateWidgetConfig,
  regenerateWidgetKey,
} from '../controllers/settingsController.js';

const settingRouter = Router();

settingRouter.get('/', authenticateToken, getSettings);
settingRouter.put('/widget-config', authenticateToken, updateWidgetConfig);
settingRouter  .post('/regenerate-key', authenticateToken, regenerateWidgetKey);
settingRouter  .post('/create-agent', authenticateToken, requireAdmin, createAgent);

export default settingRouter;