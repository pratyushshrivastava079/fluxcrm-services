import { db } from '../../core/config/database';
import { NotFoundError } from '../../core/utils/response';
import {
  CreateGroupInput, UpdateGroupInput,
  CreateArticleInput, UpdateArticleInput,
} from './kb.schema';

// ── Slug generation ───────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(tenantId: string, base: string, excludeId?: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const q = db('kb_articles').where({ tenant_id: tenantId, slug: candidate });
    if (excludeId) q.whereNot('id', excludeId);
    const exists = await q.first();
    if (!exists) return candidate;
    suffix++;
  }
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function listGroups(tenantId: string, includeInactive = false) {
  let q = db('kb_groups').where({ tenant_id: tenantId }).orderBy('sort_order').orderBy('name');
  if (!includeInactive) q = q.where('is_active', true);

  const groups = await q.select('*');

  // Attach article counts
  const counts = await db('kb_articles')
    .where({ tenant_id: tenantId })
    .whereIn('group_id', groups.map((g: { id: string }) => g.id))
    .groupBy('group_id')
    .select('group_id')
    .count('id as count');

  const countMap = Object.fromEntries(
    (counts as Array<{ group_id: string; count: string | number }>).map((r) => [r.group_id, Number(r.count)]),
  );

  return groups.map((g: { id: string }) => ({
    ...g,
    article_count: countMap[g.id] ?? 0,
  }));
}

export async function getGroup(tenantId: string, id: string) {
  const group = await db('kb_groups').where({ id, tenant_id: tenantId }).first();
  if (!group) throw new NotFoundError('KB Group');
  return group;
}

export async function createGroup(tenantId: string, input: CreateGroupInput) {
  const [row] = await db('kb_groups')
    .insert({ tenant_id: tenantId, ...input })
    .returning('*');
  return row;
}

export async function updateGroup(tenantId: string, id: string, input: UpdateGroupInput) {
  await getGroup(tenantId, id);
  const [row] = await db('kb_groups')
    .where({ id })
    .update({ ...input, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function deleteGroup(tenantId: string, id: string) {
  await getGroup(tenantId, id);
  // cascade deletes articles via FK
  await db('kb_groups').where({ id }).delete();
}

// ── Articles ──────────────────────────────────────────────────────────────────

export async function listArticles(
  tenantId: string,
  params: { group_id?: string; search?: string; active_only?: boolean },
) {
  let q = db('kb_articles as a')
    .leftJoin('kb_groups as g', 'g.id', 'a.group_id')
    .leftJoin('users as u',     'u.id', 'a.author_id')
    .where('a.tenant_id', tenantId)
    .select(
      'a.id', 'a.title', 'a.slug', 'a.is_active', 'a.visible_to_client',
      'a.sort_order', 'a.views', 'a.thumbs_up', 'a.thumbs_down',
      'a.created_at', 'a.updated_at',
      'g.id as group_id', 'g.name as group_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as author_name"),
    );

  if (params.group_id)   q = q.where('a.group_id', params.group_id);
  if (params.active_only) q = q.where('a.is_active', true);
  if (params.search) {
    q = q.where((b) =>
      b.whereILike('a.title', `%${params.search}%`)
       .orWhereILike('a.content', `%${params.search}%`),
    );
  }

  return q.orderBy('a.sort_order').orderBy('a.created_at', 'desc');
}

export async function getArticle(tenantId: string, id: string) {
  const article = await db('kb_articles as a')
    .leftJoin('kb_groups as g', 'g.id', 'a.group_id')
    .leftJoin('users as u',     'u.id', 'a.author_id')
    .where('a.id', id).where('a.tenant_id', tenantId)
    .select(
      'a.*',
      'g.name as group_name',
      db.raw("concat(u.first_name, ' ', u.last_name) as author_name"),
    )
    .first();

  if (!article) throw new NotFoundError('KB Article');
  return article;
}

export async function getArticleBySlug(tenantId: string, slug: string) {
  const article = await db('kb_articles as a')
    .leftJoin('kb_groups as g', 'g.id', 'a.group_id')
    .where('a.slug', slug).where('a.tenant_id', tenantId)
    .where('a.is_active', true)
    .select('a.*', 'g.name as group_name')
    .first();

  if (!article) throw new NotFoundError('KB Article');

  // Increment view count
  await db('kb_articles').where({ id: article.id }).increment('views', 1);

  return { ...article, views: article.views + 1 };
}

export async function createArticle(tenantId: string, userId: string, input: CreateArticleInput) {
  const slug = input.slug
    ? await uniqueSlug(tenantId, input.slug)
    : await uniqueSlug(tenantId, input.title);

  const [row] = await db('kb_articles')
    .insert({
      tenant_id:        tenantId,
      author_id:        userId,
      group_id:         input.group_id,
      title:            input.title,
      content:          input.content,
      slug,
      is_active:        input.is_active ?? true,
      visible_to_client: input.visible_to_client ?? true,
      sort_order:       input.sort_order ?? 0,
    })
    .returning('*');

  return row;
}

export async function updateArticle(tenantId: string, id: string, input: UpdateArticleInput) {
  await getArticle(tenantId, id);

  const updates: Record<string, unknown> = { ...input, updated_at: db.fn.now() };

  // Regenerate slug if title changed and no explicit slug
  if (input.title && !input.slug) {
    updates.slug = await uniqueSlug(tenantId, input.title, id);
  } else if (input.slug) {
    updates.slug = await uniqueSlug(tenantId, input.slug, id);
  }

  const [row] = await db('kb_articles').where({ id }).update(updates).returning('*');
  return row;
}

export async function deleteArticle(tenantId: string, id: string) {
  await getArticle(tenantId, id);
  await db('kb_articles').where({ id }).delete();
}

export async function voteArticle(tenantId: string, id: string, vote: 'up' | 'down') {
  await getArticle(tenantId, id);
  const col = vote === 'up' ? 'thumbs_up' : 'thumbs_down';
  await db('kb_articles').where({ id }).increment(col, 1);
}

// ── Full KB tree (groups with their articles) ─────────────────────────────────

export async function getKbTree(tenantId: string, staffView = true) {
  const groups  = await listGroups(tenantId, staffView);
  const articles = await listArticles(tenantId, { active_only: !staffView });

  const artMap: Record<string, unknown[]> = {};
  (articles as Array<{ group_id: string }>).forEach((a) => {
    (artMap[a.group_id] ??= []).push(a);
  });

  return (groups as Array<{ id: string }>).map((g) => ({
    ...g,
    articles: artMap[g.id] ?? [],
  }));
}
