import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Tuungane" },
      { name: "description", content: "Get in touch with the Tuungane team. We'd love to hear from you." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-4xl font-bold text-navy">Get in touch</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Questions, partnerships, or feedback? Send us a message.</p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.5fr]">
          <div className="space-y-4">
            <ContactItem icon={Mail} title="Email" value="hello@tuungane.app" />
            <ContactItem icon={Phone} title="Phone" value="+256 700 000 000" />
            <ContactItem icon={MapPin} title="Office" value="Kampala, Uganda" />
          </div>
          <form className="rounded-2xl border border-border bg-card p-6" onSubmit={(e) => { e.preventDefault(); alert("Thanks — we'll be in touch."); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Your name" />
              <Input label="Email" type="email" />
            </div>
            <Input label="Subject" />
            <div>
              <label className="text-xs font-medium text-navy">Message</label>
              <textarea rows={5} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
            </div>
            <button className="mt-4 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-orange-foreground hover:brightness-110">Send message</button>
          </form>
        </div>
      </section>
    </Layout>
  );
}

function ContactItem({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange"><Icon className="h-5 w-5" /></div>
      <div><p className="text-xs text-muted-foreground">{title}</p><p className="font-semibold text-navy">{value}</p></div>
    </div>
  );
}

function Input({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input type={type} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20" />
    </div>
  );
}
