import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './kb.controller';

const router = Router();
router.use(authenticate);

// Full tree (groups + articles)
router.get('/tree', requirePerm('knowledge_base.view'), ctrl.getTree);

// Groups
router.get('/groups',        requirePerm('knowledge_base.view'),   ctrl.listGroups);
router.post('/groups',       requirePerm('knowledge_base.create'), ctrl.createGroup);
router.put('/groups/:id',    requirePerm('knowledge_base.edit'),   ctrl.updateGroup);
router.delete('/groups/:id', requirePerm('knowledge_base.delete'), ctrl.deleteGroup);

// Articles
router.get('/articles',           requirePerm('knowledge_base.view'),   ctrl.listArticles);
router.post('/articles',          requirePerm('knowledge_base.create'), ctrl.createArticle);
router.get('/articles/slug/:slug', requirePerm('knowledge_base.view'),  ctrl.getArticleBySlug);
router.get('/articles/:id',       requirePerm('knowledge_base.view'),   ctrl.getArticle);
router.put('/articles/:id',       requirePerm('knowledge_base.edit'),   ctrl.updateArticle);
router.delete('/articles/:id',    requirePerm('knowledge_base.delete'), ctrl.deleteArticle);
router.post('/articles/:id/vote', requirePerm('knowledge_base.view'),   ctrl.voteArticle);

export default router;
