import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import { AreaAutocomplete } from "@/components/AreaAutocomplete";
import { MapPicker } from "@/components/MapPicker";
import { findDistrictBounds, type Bounds } from "@/lib/geocoding";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Tuungane" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState<string>("");
  const [isProvider, setIsProvider] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [phone, setPhone] = useState("");
  const [notif, setNotif] = useState({ requests: true, messages: true, credits: true, official: true });
  const [privacy, setPrivacy] = useState({ showPhone: true, whatsapp: true, calls: true, chatOnly: false });
  const [provider, setProvider] = useState({ availability: "", areas: "", category: "", contactPref: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name,is_provider")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setIsProvider(!!data.is_provider);
      }
      setLoaded(true);
    })();
    try {
      const p = localStorage.getItem("tuungane_settings_prefs");
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.notif) setNotif(parsed.notif);
        if (parsed.privacy) setPrivacy(parsed.privacy);
        if (parsed.provider) setProvider(parsed.provider);
      }
    } catch {}
  }, [user?.id]);

  const persist = (next: { phone?: string; notif?: typeof notif; privacy?: typeof privacy; provider?: typeof provider }) => {
    const current = { phone, notif, privacy, provider, ...next };
    if (next.phone !== undefined) setPhone(next.phone);
    if (next.notif) setNotif(next.notif);
    if (next.privacy) setPrivacy(next.privacy);
    if (next.provider) setProvider(next.provider);
    localStorage.setItem("tuungane_settings_prefs", JSON.stringify(current));
  };

  if (!user || !loaded) return null;

  const saveName = async (v: string) => {
    if (v === fullName) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: v }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { setFullName(v); toast.success("Saved"); }
  };

  const changePassword = async () => {
    const np = prompt("Enter a new password (min 6 characters):");
    if (!np || np.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: np });
    if (error) toast.error(error.message);
    else toast.success("Password updated");
  };

  return (
    <Layout>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="font-display text-2xl font-bold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>

        <Section title="Account">
          <Field label="Name" defaultValue={fullName} onSave={saveName} disabled={busy} />
          <Field label="Email" defaultValue={user.email ?? ""} readOnly />
          <Field label="Phone number" defaultValue={phone} onSave={(v) => persist({ phone: v })} />
          <button onClick={changePassword} className="mt-2 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:border-orange">
            Change password
          </button>
        </Section>

        <LocationSection />


        <Section title="Notifications">
          <Toggle label="Request responses" checked={notif.requests} onChange={(v) => persist({ notif: { ...notif, requests: v } })} />
          <Toggle label="Messages" checked={notif.messages} onChange={(v) => persist({ notif: { ...notif, messages: v } })} />
          <Toggle label="Credit updates" checked={notif.credits} onChange={(v) => persist({ notif: { ...notif, credits: v } })} />
          <Toggle label="Official Tuungane updates" checked={notif.official} onChange={(v) => persist({ notif: { ...notif, official: v } })} />
        </Section>

        <Section title="Privacy & contact">
          <Toggle label="Show phone number" checked={privacy.showPhone} onChange={(v) => persist({ privacy: { ...privacy, showPhone: v } })} />
          <Toggle label="Allow phone calls" checked={privacy.calls} onChange={(v) => persist({ privacy: { ...privacy, calls: v } })} />
          <Toggle label="Use Tuungane messages only" checked={privacy.chatOnly} onChange={(v) => persist({ privacy: { ...privacy, chatOnly: v } })} />
          <p className="text-[11px] text-muted-foreground">For safety, tracking, and verified reviews, Tuungane recommends keeping communication on the platform.</p>
        </Section>

        {isProvider && <ProviderContactPolicySection />}

        {isProvider && (
          <Section title="Provider settings">
            <Field label="Availability" defaultValue={provider.availability} onSave={(v) => persist({ provider: { ...provider, availability: v } })} />
            <Field label="Areas served" defaultValue={provider.areas} onSave={(v) => persist({ provider: { ...provider, areas: v } })} />
            <Field label="Main skill / category" defaultValue={provider.category} onSave={(v) => persist({ provider: { ...provider, category: v } })} />
            <Field label="Contact preference" defaultValue={provider.contactPref} onSave={(v) => persist({ provider: { ...provider, contactPref: v } })} />
          </Section>
        )}

        <Section title="Security">
          <button onClick={() => signOut()} className="inline-flex rounded-full border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10">
            Log out
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Need to delete your account? <Link to="/contact" className="text-orange underline">Contact support</Link>.
          </p>
        </Section>
      </section>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-base font-bold text-navy">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  defaultValue,
  onSave,
  disabled,
  readOnly,
}: {
  label: string;
  defaultValue: string;
  onSave?: (v: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  // Controlled so external updates (e.g. GPS autofill of district/town/area)
  // visibly refresh the input. We still only persist on blur via onSave.
  const [value, setValue] = useState(defaultValue);
  const lastExternal = useRef(defaultValue);
  useEffect(() => {
    if (defaultValue !== lastExternal.current) {
      lastExternal.current = defaultValue;
      setValue(defaultValue);
    }
  }, [defaultValue]);
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => onSave && e.target.value !== defaultValue && onSave(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange disabled:opacity-60"
      />
    </div>
  );
}


function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="text-sm text-navy">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange" />
    </label>
  );
}

function LocationSection() {
  const { location, requestingGeo, updateLocation, requestBrowserLocation } = useUserLocation();
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [area, setArea] = useState("");
  const [districtBounds, setDistrictBounds] = useState<Bounds | null>(null);
  const [visibility, setVisibility] = useState<"area" | "town" | "district" | "hidden">("area");

  useEffect(() => {
    if (!location) return;
    setCountry(location.country ?? "Uganda");
    setRegion(location.region ?? "");
    setDistrict(location.district ?? "");
    setCity(location.city ?? "");
    setTown(location.town ?? "");
    setArea(location.area ?? "");
    setVisibility((location.location_visibility as "area" | "town" | "district" | "hidden") ?? "area");
  }, [location]);

  const save = async (patch: Partial<import("@/lib/location").UserLocation>) => {
    await updateLocation(patch);
    toast.success("Location saved");
  };

  const useBrowserGeo = async () => {
    const next = await requestBrowserLocation();
    if (!next || next.latitude == null) {
      toast.error("Location permission denied or unavailable");
      return;
    }
    const filled = [next.district, next.town, next.area].filter(Boolean).length > 0;
    toast.success(filled ? "Location detected — fields autofilled" : "Using your current location");
  };

  const hasCoords = location?.latitude != null && location?.longitude != null;

  return (
    <Section title="Location">
      <p className="text-xs text-muted-foreground">
        Tuungane shows you what's closest first. Set your location so we can rank requests, providers, businesses, and posts near you.
      </p>

      <div>
        <label className="text-xs font-medium text-navy">Search and pick your location</label>
        <AreaAutocomplete
          className="mt-1"
          bounds={districtBounds}
          onSelect={(p) => {
            const patch = {
              country: p.country ?? undefined,
              region: p.region ?? undefined,
              district: p.district ?? undefined,
              city: p.city ?? undefined,
              town: p.town ?? undefined,
              area: p.area ?? undefined,
              latitude: p.latitude,
              longitude: p.longitude,
            };
            if (p.country) setCountry(p.country);
            if (p.region) setRegion(p.region);
            if (p.district) setDistrict(p.district);
            if (p.city) setCity(p.city);
            if (p.town) setTown(p.town);
            if (p.area) setArea(p.area);
            save(patch);
            if (p.bounds) setDistrictBounds(p.bounds);
            if (p.district) {
              findDistrictBounds(p.district).then((b) => {
                if (b) setDistrictBounds(b);
              });
            }
            toast.success("Location updated");
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">Pick a precise neighbourhood or district to auto-fill the fields below.</p>
      </div>

      <MapPicker
        latitude={location?.latitude ?? null}
        longitude={location?.longitude ?? null}
        bounds={districtBounds}
        onChange={(lat, lng, place) => {
          const patch: Partial<import("@/lib/location").UserLocation> = {
            latitude: lat,
            longitude: lng,
          };
          if (place) {
            if (place.country) { patch.country = place.country; setCountry(place.country); }
            if (place.region) { patch.region = place.region; setRegion(place.region); }
            if (place.district) { patch.district = place.district; setDistrict(place.district); }
            if (place.city) { patch.city = place.city; setCity(place.city); }
            if (place.town) { patch.town = place.town; setTown(place.town); }
            if (place.area) { patch.area = place.area; setArea(place.area); }
            if (place.district) {
              findDistrictBounds(place.district).then((b) => {
                if (b) setDistrictBounds(b);
              });
            }
          }
          save(patch);
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Country" defaultValue={country} onSave={(v) => save({ country: v })} />
        <Field label="Region" defaultValue={region} onSave={(v) => save({ region: v })} />
        <Field label="District" defaultValue={district} onSave={(v) => save({ district: v })} />
        <Field label="City / municipality" defaultValue={city} onSave={(v) => save({ city: v })} />
        <Field label="Town" defaultValue={town} onSave={(v) => save({ town: v })} />
        <Field label="Area / neighbourhood" defaultValue={area} onSave={(v) => save({ area: v })} />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-navy">
          <MapPin className="h-4 w-4 text-orange" />
          {hasCoords ? (
            <span>Precise location set ({location?.latitude?.toFixed(3)}, {location?.longitude?.toFixed(3)})</span>
          ) : (
            <span>Optional: use your device's location for more accurate ranking.</span>
          )}
        </div>
        <button
          onClick={useBrowserGeo}
          disabled={requestingGeo}
          className="inline-flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {requestingGeo ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
          {hasCoords ? "Refresh device location" : "Use my current location"}
        </button>
      </div>

      <div>
        <label className="text-xs font-medium text-navy">Public location visibility</label>
        <select
          value={visibility}
          onChange={(e) => {
            const v = e.target.value as "area" | "town" | "district" | "hidden";
            setVisibility(v);
            updateLocation({ location_visibility: v });
          }}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="area">Show my area (e.g. Kitoro, Entebbe)</option>
          <option value="town">Show only my town</option>
          <option value="district">Show only my district</option>
          <option value="hidden">Hide my location publicly</option>
        </select>
        <p className="mt-1 text-[11px] text-muted-foreground">Exact coordinates are never shown publicly — they are only used to rank nearby content.</p>
      </div>
    </Section>
  );
}
