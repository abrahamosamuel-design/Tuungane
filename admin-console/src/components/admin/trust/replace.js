import fs from 'fs';

const p = "c:/Users/USER/Desktop/DATA WORK/Tuungane/frontend/src/components/admin/trust/TrustVerificationCenter.tsx";
let code = fs.readFileSync(p, "utf-8");

code = code.replace(
  `import { supabase } from "@/integrations/supabase/client";`,
  `import { apiClient } from "@/lib/api";`
);

// Appeals (TabAppeals)
code = code.replace(
  `let q = supabase.from("profile_trust_appeals").select("*").order("created_at", { ascending: false }).limit(100);\n    if (filter !== "all") q = q.eq("status", filter);\n    const { data } = await q;`,
  `const { data: res } = await apiClient("/admin/trust/appeals?status=" + filter);\n    const data = res.data;`
);

code = code.replace(
  `const { error } = await supabase.rpc("admin_decide_trust_appeal" as never, {\n      _id: id,\n      _action: action,\n      _notes: notes,\n    } as never);`,
  `try {\n      await apiClient.post("/admin/trust/appeals/" + id + "/decide", { action, notes });\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

// Overview (TabOverview)
code = code.replace(
  `const { data } = await supabase\n        .from("admin_trust_stats")\n        .select("*")\n        .maybeSingle();\n      if (data) setStats(data as any);`,
  `const { data: res } = await apiClient("/admin/trust/overview");\n      if (res.data.stats) setStats(res.data.stats as any);`
);

code = code.replace(
  `const { count: pCount } = await supabase\n        .from("profiles")\n        .select("*", { count: "exact", head: true });\n      if (pCount != null) setTotalProfiles(pCount);`,
  `setTotalProfiles(res.data.total_profiles || 0);`
);

code = code.replace(
  `const { data: pr } = await supabase\n        .from("profile_verification_requests")\n        .select("id,profile_id,requested_type,created_at")\n        .in("status", ["pending", "more_info"])\n        .order("created_at", { ascending: true })\n        .limit(5);\n      if (pr) setUrgentRequests(pr as any);`,
  `if (res.data.urgent_requests) setUrgentRequests(res.data.urgent_requests as any);`
);

code = code.replace(
  `const { data: ts } = await supabase\n        .from("profile_trust_status")\n        .select("profile_kind,profile_id,reports_count,manual_level")\n        .gt("reports_count", 0)\n        .order("reports_count", { ascending: false })\n        .limit(5);\n      if (ts) setHighReports(ts as any);`,
  `if (res.data.high_reports) setHighReports(res.data.high_reports as any);`
);

// Requests (TabRequests)
code = code.replace(
  `let q = supabase.from("profile_verification_requests").select("*").order("created_at", { ascending: false }).limit(100);\n    if (filter !== "all") q = q.eq("status", filter);\n    const { data } = await q;`,
  `const { data: res } = await apiClient("/admin/trust/verification-requests?status=" + filter);\n    const data = res.data;`
);

code = code.replace(
  `const { error } = await supabase.rpc("admin_decide_verification_request" as never, {\n      _id: draftId,\n      _status: status,\n      _notes: draftNote,\n    } as never);`,
  `try {\n      await apiClient.post("/admin/trust/verification-requests/" + draftId + "/decide", { status, admin_notes: draftNote });\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

// Reports (TabReports)
code = code.replace(
  `let q = supabase.from("profile_reports").select("*").order("created_at", { ascending: false }).limit(100);\n    if (filter !== "all") q = q.eq("status", filter);\n    const { data } = await q;`,
  `const { data: res } = await apiClient("/admin/trust/reports?status=" + filter);\n    const data = res.data;`
);

code = code.replace(
  `const { error } = await supabase.rpc("admin_resolve_profile_report" as never, {\n      _id: id,\n      _action: action,\n      _notes: note,\n      _update_trust_level: updateTrustLevel || null,\n    } as never);`,
  `try {\n      await apiClient.post("/admin/trust/reports/" + id + "/resolve", { action, admin_notes: note, update_trust_level: updateTrustLevel || null });\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

// setTrustLevel
code = code.replace(
  `const { error } = await supabase.rpc("admin_set_trust_level" as never, { _kind: kind, _id: id, _level: level, _reason: reason } as never);`,
  `try {\n      await apiClient.post("/admin/trust/levels", { kind, id, level, reason });\n    } catch (e: any) {\n      toast.error("Failed to set level");\n      return;\n    }\n    const error = null;`
);

// TabStatus
code = code.replace(
  `let qy = supabase.from("profile_trust_status").select("*").order("updated_at", { ascending: false }).limit(200);\n    if (q) qy = qy.or(\`profile_id.eq.\${q},profile_kind.eq.\${q}\`); // basic search\n    const { data } = await qy;`,
  `const { data: res } = await apiClient("/admin/trust/status?search=" + encodeURIComponent(q || ""));\n    const data = res.data;`
);

code = code.replace(
  `const { error } = await supabase.rpc("admin_set_trust_level" as never, { _kind: r.profile_kind, _id: r.profile_id, _level: level, _reason: "manual change" } as never);`,
  `try {\n      await apiClient.post("/admin/trust/levels", { kind: r.profile_kind, id: r.profile_id, level, reason: "manual change" });\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

code = code.replace(
  `const { error } = await supabase.rpc("admin_clear_manual_trust_level" as never, { _kind: r.profile_kind, _id: r.profile_id, _reason: "cleared" } as never);`,
  `try {\n      await apiClient.post("/admin/trust/status/clear-manual", { kind: r.profile_kind, id: r.profile_id });\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

// TabNotes
code = code.replace(
  `let q = supabase.from("profile_admin_notes").select("*").order("created_at", { ascending: false }).limit(100);\n    if (search) q = q.eq("profile_id", search);\n    const { data } = await q;`,
  `const { data: res } = await apiClient("/admin/trust/notes?search=" + encodeURIComponent(search || ""));\n    const data = res.data;`
);

code = code.replace(
  `const { error } = await supabase.rpc("admin_add_profile_note" as never, { _kind: draft.kind, _id: draft.id, _note: draft.note } as never);`,
  `try {\n      await apiClient.post("/admin/trust/notes", { kind: draft.kind, id: draft.id, note: draft.note });\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

// TabAudit
code = code.replace(
  `let q = supabase.from("trust_audit_log").select("*").order("created_at", { ascending: false }).limit(200);\n      if (filter !== "all") q = q.eq("action", filter);\n      if (target) q = q.eq("target_id", target);\n      const { data } = await q;`,
  `const { data: res } = await apiClient("/admin/trust/audit?action=" + filter + (target ? "&target=" + encodeURIComponent(target) : ""));\n      const data = res.data;`
);

// TabSettings
code = code.replace(
  `const { data } = await supabase.from("trust_settings").select("*").eq("id", 1).maybeSingle();`,
  `const { data: res } = await apiClient("/admin/trust/settings");\n      const data = res.data;`
);

code = code.replace(
  `const { error } = await supabase.from("trust_settings").update(patch as never).eq("id", 1);`,
  `try {\n      await apiClient.put("/admin/trust/settings", patch);\n    } catch (e: any) {\n      toast.error("Failed");\n      return;\n    }\n    const error = null;`
);

fs.writeFileSync(p, code, "utf-8");
console.log("Migration complete.");
