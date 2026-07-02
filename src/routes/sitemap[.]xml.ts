import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://tuungane.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticEntries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/services", changefreq: "weekly", priority: "0.9" },
          { path: "/businesses", changefreq: "weekly", priority: "0.8" },
          { path: "/requests/browse", changefreq: "daily", priority: "0.8" },
          { path: "/opportunities", changefreq: "daily", priority: "0.8" },
          { path: "/official", changefreq: "weekly", priority: "0.6" },
          { path: "/feed", changefreq: "daily", priority: "0.5" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/trust", changefreq: "monthly", priority: "0.6" },
          { path: "/guides/property-maintenance-kampala", changefreq: "monthly", priority: "0.7" },
        ];

        const dynamicEntries: SitemapEntry[] = [];

        try {
          const [{ data: cats }, { data: businesses }] = await Promise.all([
            supabase.from("service_categories").select("slug,updated_at").eq("active", true).limit(500),
            supabase.from("business_pages").select("slug,updated_at").eq("suspended", false).limit(2000),
          ]);
          for (const c of cats ?? []) {
            dynamicEntries.push({
              path: `/services/${c.slug}`,
              lastmod: c.updated_at ? new Date(c.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.7",
            });
          }
          for (const b of businesses ?? []) {
            dynamicEntries.push({
              path: `/businesses/${b.slug}`,
              lastmod: b.updated_at ? new Date(b.updated_at).toISOString() : undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch {
          // ignore — emit static-only sitemap on failure
        }

        const entries = [...staticEntries, ...dynamicEntries];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
