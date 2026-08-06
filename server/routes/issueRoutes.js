import express from 'express';
import {
  approveIssueRequest,
  createIssue,
  createIssueRequest,
  getIssueFeed,
  getMyIssues,
  rejectIssueRequest,
  resolveIssue
} from '../controllers/issueController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, requestIdParamSchema } from '../validation/commonSchemas.js';
import { createIssueRequestSchema, createIssueSchema } from '../validation/issueSchemas.js';
import { cacheAuthenticatedResponse, invalidateCacheDomains } from '../middleware/cache.js';

const router = express.Router();

router.use(protect);

router.post('/', validate({ body: createIssueSchema }), invalidateCacheDomains('issues'), createIssue);
router.get('/feed', cacheAuthenticatedResponse({ domain: 'issues', ttlSeconds: 15 }), getIssueFeed);
router.get('/my', getMyIssues);
router.post('/:id/requests', validate({ params: idParamSchema, body: createIssueRequestSchema }), invalidateCacheDomains('issues'), createIssueRequest);
router.post('/:id/requests/:requestId/approve', validate({ params: requestIdParamSchema }), invalidateCacheDomains('issues'), approveIssueRequest);
router.post('/:id/requests/:requestId/reject', validate({ params: requestIdParamSchema }), invalidateCacheDomains('issues'), rejectIssueRequest);
router.post('/:id/resolve', validate({ params: idParamSchema }), invalidateCacheDomains('issues'), resolveIssue);

export default router;
