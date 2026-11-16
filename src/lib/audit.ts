import { ulid } from "ulid";
import type { Db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/** Zapis u revizijski trag. `meta` ne smije sadržavati osobne podatke. */
export async function audit(
  db: Db,
  a: { actorId: string | null; action: string; entityType?: string; entityId?: string; meta?: Record<string, unknown> },
) {
  await db.insert(auditLog).values({
    id: ulid(),
    actorType: a.actorId ? "user" : "system",
    actorId: a.actorId,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    metaJson: a.meta ? JSON.stringify(a.meta) : null,
  });
}
