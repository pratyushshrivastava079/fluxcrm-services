import { Router } from 'express';
import { authenticate } from '../../core/middleware/auth.middleware';
import { requirePerm } from '../../core/middleware/rbac.middleware';
import * as ctrl from './expenses.controller';

const router = Router();
router.use(authenticate);

// Reference data
router.get('/categories',           requirePerm('expenses.view'),   ctrl.listCategories);
router.post('/categories',          requirePerm('expenses.create'), ctrl.createCategory);
router.delete('/categories/:id',    requirePerm('expenses.delete'), ctrl.deleteCategory);

// Stats
router.get('/stats',                requirePerm('expenses.view'),   ctrl.stats);

// CSV Import
router.post('/import', requirePerm('expenses.create'), ctrl.csvUpload.single('file'), ctrl.importExpenses);

// Expenses CRUD
router.get('/',     requirePerm('expenses.view'),   ctrl.list);
router.post('/',    requirePerm('expenses.create'), ctrl.create);
router.get('/:id',  requirePerm('expenses.view'),   ctrl.get);
router.put('/:id',  requirePerm('expenses.edit'),   ctrl.update);
router.delete('/:id', requirePerm('expenses.delete'), ctrl.remove);

export default router;
