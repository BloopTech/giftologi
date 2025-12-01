"use server";

export async function logAdminActivityWithClient(supabase, params) {
  if (!supabase) return;

  const {
    adminId,
    adminRole,
    adminEmail,
    adminName,
    action,
    entity,
    targetId,
    details,
  } = params || {};

  if (!adminId || !action) return;

  try {
    await supabase.from("admin_activity_log").insert([
      {
        admin_id: adminId,
        admin_role: adminRole || null,
        admin_email: adminEmail || null,
        admin_name: adminName || null,
        action,
        entity: entity || null,
        target_id: targetId || null,
        details: details || null,
      },
    ]);
  } catch (error) {
    console.error("Failed to log admin activity", error);
  }
}

export async function logSystemEventWithClient(supabase, params) {
  const base = params || {};
  return logAdminActivityWithClient(supabase, {
    ...base,
    action: "system_event",
  });
}

export async function logViewReportWithClient(supabase, params) {
  const base = params || {};
  return logAdminActivityWithClient(supabase, {
    ...base,
    action: "view_report",
  });
}
