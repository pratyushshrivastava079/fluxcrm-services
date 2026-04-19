import { db } from '../../core/config/database';
import { ForbiddenError, NotFoundError } from '../../core/utils/response';
import { CreateAnnouncementInput, UpdateAnnouncementInput } from './announcements.schema';

async function getAnnouncement(tenantId: string, id: string) {
  const row = await db('announcements').where({ id, tenant_id: tenantId }).first();
  if (!row) throw new NotFoundError('Announcement');
  return row;
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** List active announcements; includes whether the current user has read each one */
export async function listAnnouncements(tenantId: string, userId: string) {
  const rows = await db('announcements as a')
    .leftJoin('announcement_reads as ar', function () {
      this.on('ar.announcement_id', 'a.id').andOn('ar.user_id', db.raw('?', [userId]));
    })
    .join('users as u', 'u.id', 'a.created_by')
    .where('a.tenant_id', tenantId)
    .where('a.is_active', true)
    .orderBy('a.created_at', 'desc')
    .select(
      'a.id', 'a.title', 'a.content', 'a.is_active', 'a.created_at',
      db.raw("concat(u.first_name, ' ', u.last_name) as created_by_name"),
      db.raw('case when ar.user_id is not null then true else false end as is_read'),
    );

  return rows;
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createAnnouncement(
  tenantId: string,
  userId: string,
  isAdmin: boolean,
  input: CreateAnnouncementInput,
) {
  if (!isAdmin) throw new ForbiddenError('Only admins can create announcements');
  const [row] = await db('announcements')
    .insert({ tenant_id: tenantId, created_by: userId, ...input })
    .returning('*');
  return row;
}

export async function updateAnnouncement(
  tenantId: string,
  userId: string,
  isAdmin: boolean,
  id: string,
  input: UpdateAnnouncementInput,
) {
  if (!isAdmin) throw new ForbiddenError('Only admins can update announcements');
  await getAnnouncement(tenantId, id);
  const [row] = await db('announcements')
    .where({ id })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function deleteAnnouncement(
  tenantId: string,
  isAdmin: boolean,
  id: string,
) {
  if (!isAdmin) throw new ForbiddenError('Only admins can delete announcements');
  await getAnnouncement(tenantId, id);
  await db('announcements').where({ id }).delete();
}

export async function markRead(announcementId: string, userId: string) {
  await db('announcement_reads')
    .insert({ announcement_id: announcementId, user_id: userId })
    .onConflict(['announcement_id', 'user_id'])
    .ignore();
}
