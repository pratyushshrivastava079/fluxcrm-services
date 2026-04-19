import { Request, Response } from 'express';
import { parsePagination } from '../../core/utils/pagination';
import { ok, created, noContent } from '../../core/utils/response';
import * as svc from './proposals.service';
import { CreateProposalSchema, UpdateProposalSchema, SignProposalSchema } from './proposals.schema';

export async function listProposals(req: Request, res: Response) {
  const params = {
    ...parsePagination(req),
    toType: req.query.to_type as string | undefined,
    toId: req.query.to_id as string | undefined,
  };
  const data = await svc.listProposals(req.tenant.id, params);
  ok(res, data);
}

export async function getProposal(req: Request, res: Response) {
  const data = await svc.getProposalById(req.tenant.id, req.params.id);
  ok(res, data);
}

export async function createProposal(req: Request, res: Response) {
  const input = CreateProposalSchema.parse(req.body);
  const data = await svc.createProposal(req.tenant.id, req.user.id, input);
  created(res, data);
}

export async function updateProposal(req: Request, res: Response) {
  const input = UpdateProposalSchema.parse(req.body);
  const data = await svc.updateProposal(req.tenant.id, req.params.id, input);
  ok(res, data);
}

export async function deleteProposal(req: Request, res: Response) {
  await svc.deleteProposal(req.tenant.id, req.params.id);
  noContent(res);
}

export async function sendProposal(req: Request, res: Response) {
  const senderName = `${req.user.firstName} ${req.user.lastName}`.trim() || 'Performex CRM';
  const data = await svc.sendProposal(req.tenant.id, req.params.id, senderName);
  ok(res, data);
}

// ── Public endpoints (no auth) ────────────────────────────────────────────────

export async function getPublicProposal(req: Request, res: Response) {
  const data = await svc.getProposalByHash(req.params.hash);
  ok(res, data);
}

export async function signPublicProposal(req: Request, res: Response) {
  const input = SignProposalSchema.parse(req.body);
  const signerIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.socket.remoteAddress
    ?? '';
  const data = await svc.signProposal(req.params.hash, input, signerIp);
  ok(res, data);
}
