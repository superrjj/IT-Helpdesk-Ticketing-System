export const NOTIFICATIONS_CHANGED_EVENT = "itdesk-notifications-changed";

/** Untyped client — matches createClient() from @supabase/supabase-js */
type Db = { from: (t: string) => any };

export function dispatchNotificationsChanged(): void {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

async function fetchActiveAdminIds(supabase: Db): Promise<string[]> {
  const { data } = await supabase
    .from("user_accounts")
    .select("id")
    .eq("is_active", true)
    .eq("role", "Administrator");
  return (data ?? [])
    .map((r: any) => (r?.id ? String(r.id) : null))
    .filter(Boolean) as string[];
}

export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("session_user_id");
  return id && id.trim() ? id.trim() : null;
}

function clip(s: string, max: number): string {
  const t = s.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
  return t.length <= max ? t : t.slice(0, max);
}

export async function insertActivityLog(
  supabase: Db,
  row: {
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  const action = clip(row.action, 120);
  const entityType = clip(row.entityType, 80);
  if (!action || !entityType) return;
  await supabase.from("activity_log").insert({
    actor_user_id: row.actorUserId,
    action,
    entity_type: entityType,
    entity_id: row.entityId ?? null,
    meta: row.meta && typeof row.meta === "object" ? row.meta : {},
  });
}

export async function insertNotification(
  supabase: Db,
  row: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    entityType?: string | null;
    entityId?: string | null;
  }
): Promise<void> {
  const title = clip(row.title, 200);
  const body = clip(row.body ?? "", 2000);
  const type = clip(row.type, 80);
  if (!row.userId || !title || !type) return;
  await supabase.from("app_notifications").insert({
    user_id: row.userId,
    type,
    title,
    body,
    entity_type: row.entityType ? clip(row.entityType, 80) : null,
    entity_id: row.entityId ?? null,
  });
}

/** Notify users newly added to assigned_to (ticket). */
export async function notifyTicketAssignees(
  supabase: Db,
  assigneeIds: string[],
  ctx: { ticketId: string; ticketTitle: string; ticketNumber?: string | null }
): Promise<void> {
  const label = ctx.ticketNumber?.trim() || "Ticket";
  for (const uid of assigneeIds) {
    if (!uid) continue;
    await insertNotification(supabase, {
      userId: uid,
      type: "ticket_assigned",
      title: "New ticket assigned to you",
      body: `${label}: ${clip(ctx.ticketTitle, 180)}`,
      entityType: "file_report",
      entityId: ctx.ticketId,
    });
  }

  // Also notify administrators so the admin UI/bell updates.
  const adminIds = await fetchActiveAdminIds(supabase);
  for (const uid of adminIds) {
    await insertNotification(supabase, {
      userId: uid,
      type: "ticket_assigned_admin",
      title: "Ticket assigned",
      body: `${label}: ${clip(ctx.ticketTitle, 180)}`,
      entityType: "file_report",
      entityId: ctx.ticketId,
    });
  }
  dispatchNotificationsChanged();
}

/** Notify users newly added to assigned_to (repair job). */
export async function notifyRepairAssignees(
  supabase: Db,
  assigneeIds: string[],
  ctx: { repairId: string; summary: string }
): Promise<void> {
  for (const uid of assigneeIds) {
    if (!uid) continue;
    await insertNotification(supabase, {
      userId: uid,
      type: "repair_assigned",
      title: "New repair job assigned to you",
      body: clip(ctx.summary, 2000),
      entityType: "repair",
      entityId: ctx.repairId,
    });
  }

  const adminIds = await fetchActiveAdminIds(supabase);
  for (const uid of adminIds) {
    await insertNotification(supabase, {
      userId: uid,
      type: "repair_added_admin",
      title: "Repair job added",
      body: clip(ctx.summary, 2000),
      entityType: "repair",
      entityId: ctx.repairId,
    });
  }
  dispatchNotificationsChanged();
}

export async function notifyAdminsTicketStatusChanged(
  supabase: Db,
  ctx: { ticketId: string; ticketTitle: string; ticketNumber?: string | null; status: string }
): Promise<void> {
  const label = ctx.ticketNumber?.trim() || "Ticket";
  const adminIds = await fetchActiveAdminIds(supabase);
  for (const uid of adminIds) {
    await insertNotification(supabase, {
      userId: uid,
      type: "ticket_status_changed_admin",
      title: "Ticket status updated",
      body: `${label}: ${clip(ctx.ticketTitle, 180)} → ${clip(ctx.status, 80)}`,
      entityType: "file_report",
      entityId: ctx.ticketId,
    });
  }
  dispatchNotificationsChanged();
}

export async function notifyAdminsRepairStatusChanged(
  supabase: Db,
  ctx: { repairId: string; summary: string; status: string }
): Promise<void> {
  const adminIds = await fetchActiveAdminIds(supabase);
  for (const uid of adminIds) {
    await insertNotification(supabase, {
      userId: uid,
      type: "repair_status_changed_admin",
      title: "Repair status updated",
      body: `${clip(ctx.summary, 2000)} → ${clip(ctx.status, 80)}`,
      entityType: "repair",
      entityId: ctx.repairId,
    });
  }
  dispatchNotificationsChanged();
}

export function diffNewAssignees(prev: string[], next: string[]): string[] {
  const p = new Set(prev);
  return next.filter(id => id && !p.has(id));
}
