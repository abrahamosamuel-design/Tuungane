import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { apiClient } from "@/lib/api";
import { Briefcase } from "lucide-react";

export function MyServicesSummary() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<{ data: any[] }>("/services/me");
        setServices(res.data || []);
      } catch (err) {
        console.error("Failed to load my services:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-navy">My Services</h3>
        <Link to="/profiles/" className="text-sm font-semibold text-orange hover:underline">
          Manage All
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-muted-foreground">Loading...</div>
      ) : services.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-navy">No services listed yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Offer a service to start earning on Tuungane.</p>
          <Link to="/businesses/new" className="mt-4 inline-block rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-white shadow">
            Create Service Profile
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {services.slice(0, 3).map((service) => (
            <div key={service.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-orange/50">
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-navy">{service.title}</p>
                <p className="truncate text-xs text-muted-foreground">{service.profile?.name}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/service/$id"
                  params={{ id: service.id }}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-navy hover:bg-orange/10 hover:text-orange"
                >
                  View
                </Link>
                <Link
                  to="/profiles/$id"
                  params={{ id: service.profile_id }}
                  className="rounded-full bg-orange px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange/90"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
