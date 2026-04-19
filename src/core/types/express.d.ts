// Augment Express Request with our auth context
import 'express';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        tenantId: string;
        email: string;
        firstName: string;
        lastName: string;
        isAdmin: boolean;
        permissions: string[];
      };
      tenant: {
        id: string;
        name: string;
        slug: string;
      };
    }
  }
}
