import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/response';

/**
 * Middleware factory for permission-based access control.
 *
 * @example
 *   router.get('/customers', authenticate, requirePerm('customers.view'), controller.list);
 */
export function requirePerm(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Admins have all permissions
    if (req.user?.isAdmin) {
      next();
      return;
    }

    const userPerms = req.user?.permissions ?? [];
    const hasAll = permissions.every((p) => userPerms.includes(p));

    if (!hasAll) {
      throw new ForbiddenError(
        `Missing required permission(s): ${permissions.join(', ')}`,
      );
    }

    next();
  };
}

/** Require the authenticated user to be a tenant admin */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }
  next();
}
