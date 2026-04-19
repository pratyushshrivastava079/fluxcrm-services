import { Request } from 'express';

export interface PaginationParams {
  page: number;
  perPage: number;
  offset: number;
  search?: string;
  sortBy?: string;
  sortDir: 'asc' | 'desc';
}

export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const perPage = Math.min(100, Math.max(1, parseInt(String(req.query.per_page ?? '15'), 10)));
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const sortBy = req.query.sort_by ? String(req.query.sort_by) : undefined;
  const sortDir = req.query.sort_dir === 'asc' ? 'asc' : 'desc';

  return { page, perPage, offset: (page - 1) * perPage, search, sortBy, sortDir };
}

export function buildMeta(total: number, page: number, perPage: number) {
  return {
    total,
    page,
    per_page: perPage,
    last_page: Math.max(1, Math.ceil(total / perPage)),
  };
}
