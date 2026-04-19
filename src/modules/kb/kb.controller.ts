import { Request, Response } from 'express';
import * as svc from './kb.service';
import { createGroupSchema, updateGroupSchema, createArticleSchema, updateArticleSchema } from './kb.schema';
import { ok, created, noContent } from '../../core/utils/response';

// ── Groups ────────────────────────────────────────────────────────────────────

export async function listGroups(req: Request, res: Response) {
  const all = req.query.all === 'true';
  ok(res, await svc.listGroups(req.user.tenantId, all));
}

export async function createGroup(req: Request, res: Response) {
  const input = createGroupSchema.parse(req.body);
  created(res, await svc.createGroup(req.user.tenantId, input));
}

export async function updateGroup(req: Request, res: Response) {
  const input = updateGroupSchema.parse(req.body);
  ok(res, await svc.updateGroup(req.user.tenantId, req.params.id, input));
}

export async function deleteGroup(req: Request, res: Response) {
  await svc.deleteGroup(req.user.tenantId, req.params.id);
  noContent(res);
}

// ── Articles ──────────────────────────────────────────────────────────────────

export async function listArticles(req: Request, res: Response) {
  const params = {
    group_id:   req.query.group_id   as string | undefined,
    search:     req.query.search     as string | undefined,
    active_only: req.query.active_only === 'true',
  };
  ok(res, await svc.listArticles(req.user.tenantId, params));
}

export async function getArticle(req: Request, res: Response) {
  ok(res, await svc.getArticle(req.user.tenantId, req.params.id));
}

export async function getArticleBySlug(req: Request, res: Response) {
  ok(res, await svc.getArticleBySlug(req.user.tenantId, req.params.slug));
}

export async function createArticle(req: Request, res: Response) {
  const input = createArticleSchema.parse(req.body);
  created(res, await svc.createArticle(req.user.tenantId, req.user.id, input));
}

export async function updateArticle(req: Request, res: Response) {
  const input = updateArticleSchema.parse(req.body);
  ok(res, await svc.updateArticle(req.user.tenantId, req.params.id, input));
}

export async function deleteArticle(req: Request, res: Response) {
  await svc.deleteArticle(req.user.tenantId, req.params.id);
  noContent(res);
}

export async function voteArticle(req: Request, res: Response) {
  const { vote } = req.body as { vote: 'up' | 'down' };
  await svc.voteArticle(req.user.tenantId, req.params.id, vote);
  noContent(res);
}

// ── Full tree ─────────────────────────────────────────────────────────────────

export async function getTree(req: Request, res: Response) {
  ok(res, await svc.getKbTree(req.user.tenantId, true));
}
