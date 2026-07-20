import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserLocation } from "@/hooks/use-user-location";
import { toast } from "sonner";
import { MapPin, Loader2, User, Building2 } from "lucide-react";
import { AreaAutocomplete } from "@/components/AreaAutocomplete";
import { MapPicker } from "@/components/MapPicker";
import { findDistrictBounds, type Bounds } from "@/lib/geocoding";
import { organisationTypes } from "@/data/organisationTypes";

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
  const [dirty, setDirty] = useState(false);

  const [phone, setPhone] = useState("");
  const [notif, setNotif] = useState({ requests: true, messages: true, credits: true, official: true });
  const [privacy, setPrivacy] = useState({ showPhone: true, whatsapp: true, calls: true, chatOnly: false });
  const [provider, setProvider] = useState({ availability: "", areas: "", category: "", contactPref: "" });

  // Original values for dirty tracking
  const [origName, setOrigName] = useState("");
  const [origPhone, setOrigPhone] = useState("");
  const [origNotif, setOrigNotif] = useState({ requests: true, messages: true, credits: true, official: true });
  const [origPrivacy, setOrigPrivacy] = useState({ showPhone: true, whatsapp: true, calls: true, chatOnly: false });
  const [origProvider, setOrigProvider] = useState({ availability: "", areas: "", category: "", contactPref: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await apiClient<{ data: { full_name: string; is_provider: boolean } }>(`/profiles/me`);
        if (data) {
          const name = data.full_name ?? "";
          setFullName(name);
          setOrigName(name);
          setIsProvider(!!data.is_provider);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
      setLoaded(true);
    })();
    try {
      const p = localStorage.getItem("tuungane_settings_prefs");
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.phone) { setPhone(parsed.phone); setOrigPhone(parsed.phone); }
        if (parsed.notif) { setNotif(parsed.notif); setOrigNotif(parsed.notif); }
        if (parsed.privacy) { setPrivacy(parsed.privacy); setOrigPrivacy(parsed.privacy); }
        if (parsed.provider) { setProvider(parsed.provider); setOrigProvider(parsed.provider); }
      }
    } catch {}
  }, [user?.id]);

  const checkDirty = (next: { fullName?: string; phone?: string; notif?: typeof notif; privacy?: typeof privacy; provider?: typeof provider }) => {
    let d = false;
    if (next.fullName !== undefined && next.fullName !== origName) d = true;
    if (next.phone !== undefined && next.phone !== origPhone) d = true;
    if (next.notif && JSON.stringify(next.notif) !== JSON.stringify(origNotif)) d = true;
    if (next.privacy && JSON.stringify(next.privacy) !== JSON.stringify(origPrivacy)) d = true;
    if (next.provider && JSON.stringify(next.provider) !== JSON.stringify(origProvider)) d = true;
    setDirty(d);
  };

  const saveAll = async () => {
    if (!user) return;
    setBusy(true);
    const tasks: Promise<unknown>[] = [];

    if (fullName !== origName) {
      tasks.push(
        apiClient(`/profiles/me`, {
          method: 'PUT',
          body: JSON.stringify({ full_name: fullName })
        }).then(() => {
          setOrigName(fullName);
        }).catch((err) => {
          throw new Error(err.message || "Failed to update name");
        })
      );
    }

    const prefs = { phone, notif, privacy, provider };
    if (phone !== origPhone || JSON.stringify(notif) !== JSON.stringify(origNotif) || JSON.stringify(privacy) !== JSON.stringify(origPrivacy) || JSON.stringify(provider) !== JSON.stringify(origProvider)) {
      localStorage.setItem("tuungane_settings_prefs", JSON.stringify(prefs));
      setOrigPhone(phone);
      setOrigNotif({ ...notif });
      setOrigPrivacy({ ...privacy });
      setOrigProvider({ ...provider });
    }

    try {
      await Promise.all(tasks);
      toast.success("All changes saved");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!user || !loaded) return null;

  const changePassword = async () => {
    const np = prompt("Enter a new password (min 6 characters):");
    if (!np || np.length < 6) return;
    const { error } = await supabase.auth.updateUser({ password: np });
    if (error) toast.error(error.message);
    else toast.success("Password updated");
  };

  return (
    <>
      <section className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences.</p>
          </div>
          <button
            onClick={saveAll}
            disabled={!dirty || busy}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground shadow-sm transition hover:brightness-110 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>

        <Section title="Account">
          <Field label="Name" defaultValue={fullName} onSave={(v) => { setFullName(v); checkDirty({ fullName: v }); }} disabled={busy} />
          <Field label="Email" defaultValue={user.email ?? ""} readOnly />
          <Field label="Phone number" defaultValue={phone} onSave={(v) => { setPhone(v); checkDirty({ phone: v }); }} />
          <button onClick={changePassword} className="mt-2 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-navy hover:border-orange">
            Change password
          </button>
        </Section>

        <ProfileIdentitySection />

        <LocationSection />




        <Section title="Notifications">
          <Toggle label="Request responses" checked={notif.requests} onChange={(v) => { const next = { ...notif, requests: v }; setNotif(next); checkDirty({ notif: next }); }} />
          <Toggle label="Messages" checked={notif.messages} onChange={(v) => { const next = { ...notif, messages: v }; setNotif(next); checkDirty({ notif: next }); }} />
          <Toggle label="Credit updates" checked={notif.credits} onChange={(v) => { const next = { ...notif, credits: v }; setNotif(next); checkDirty({ notif: next }); }} />
          <Toggle label="Official Tuungane updates" checked={notif.official} onChange={(v) => { const next = { ...notif, official: v }; setNotif(next); checkDirty({ notif: next }); }} />
        </Section>

        <Section title="Privacy & contact">
          <Toggle label="Show phone number" checked={privacy.showPhone} onChange={(v) => { const next = { ...privacy, showPhone: v }; setPrivacy(next); checkDirty({ privacy: next }); }} />
          <Toggle label="Allow phone calls" checked={privacy.calls} onChange={(v) => { const next = { ...privacy, calls: v }; setPrivacy(next); checkDirty({ privacy: next }); }} />
          <Toggle label="Use Tuungane messages only" checked={privacy.chatOnly} onChange={(v) => { const next = { ...privacy, chatOnly: v }; setPrivacy(next); checkDirty({ privacy: next }); }} />
          <p className="text-[11px] text-muted-foreground">For safety, tracking, and verified reviews, Tuungane recommends keeping communication on the platform.</p>
        </Section>

        {isProvider && <ProviderContactPolicySection />}

        {isProvider && (
          <Section title="Provider settings">
            <Field label="Availability" defaultValue={provider.availability} onSave={(v) => { const next = { ...provider, availability: v }; setProvider(next); checkDirty({ provider: next }); }} />
            <Field label="Areas served" defaultValue={provider.areas} onSave={(v) => { const next = { ...provider, areas: v }; setProvider(next); checkDirty({ provider: next }); }} />
            <Field label="Main skill / category" defaultValue={provider.category} onSave={(v) => { const next = { ...provider, category: v }; setProvider(next); checkDirty({ provider: next }); }} />
            <Field label="Contact preference" defaultValue={provider.contactPref} onSave={(v) => { const next = { ...provider, contactPref: v }; setProvider(next); checkDirty({ provider: next }); }} />
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
    </>
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

function ProviderContactPolicySection() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<"after_request" | "after_accept" | "after_selected" | "never">("after_request");
  const [phoneVis, setPhoneVis] = useState<"allow_calls" | "messages_first" | "logged_in_only" | "hidden">("logged_in_only");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await apiClient<{ data: { contact_reveal_policy: string; phone_visibility: string } }>(`/profiles/me/privacy`);
        if (data?.contact_reveal_policy) setPolicy(data.contact_reveal_policy as typeof policy);
        if (data?.phone_visibility) setPhoneVis(data.phone_visibility as typeof phoneVis);
      } catch (err) {
        console.error("Failed to load privacy settings", err);
      }
      setLoaded(true);
    })();
  }, [user?.id]);

  const save = async (next: typeof policy) => {
    if (!user) return;
    setPolicy(next);
    try {
      await apiClient(`/profiles/me/privacy`, {
        method: 'PUT',
        body: JSON.stringify({ contact_reveal_policy: next })
      });
      toast.success("Contact preference saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contact preference");
    }
  };

  const savePhoneVis = async (next: typeof phoneVis) => {
    if (!user) return;
    setPhoneVis(next);
    try {
      await apiClient(`/profiles/me/privacy`, {
        method: 'PUT',
        body: JSON.stringify({ phone_visibility: next })
      });
      toast.success("Phone visibility saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save phone visibility");
    }
  };

  if (!loaded) return null;

  const options: { value: typeof policy; label: string; hint: string }[] = [
    { value: "after_request", label: "After I respond to a request", hint: "Default — phone shown to a member once you've responded to their request." },
    { value: "after_selected", label: "Only after the member selects me", hint: "Phone shown only when the member chooses you." },
    { value: "never", label: "Use Tuungane messages only", hint: "Phone never shown. Members can only reach you via Tuungane messages." },
  ];

  const phoneOptions: { value: typeof phoneVis; label: string; hint: string }[] = [
    { value: "allow_calls", label: "Allow members to call me", hint: "Phone is shown to any signed-in member who finds you on Tuungane." },
    { value: "logged_in_only", label: "Show phone only to logged-in members", hint: "Default. Phone is shown to signed-in members, never to anonymous visitors." },
    { value: "messages_first", label: "Tuungane messages first", hint: "Phone is hidden by default — members must start a Tuungane conversation first." },
    { value: "hidden", label: "Hide phone number completely", hint: "Phone is never shown. Only Tuungane messages." },
  ];

  return (
    <>
      <Section title="Phone visibility">
        <p className="text-xs text-muted-foreground">Controls whether members can see your phone number on Tuungane. Tuungane messages remain the recommended way to talk.</p>
        <div className="space-y-2">
          {phoneOptions.map((o) => (
            <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${phoneVis === o.value ? "border-orange bg-orange/5" : "border-border bg-background"}`}>
              <input type="radio" name="phone_visibility" checked={phoneVis === o.value} onChange={() => savePhoneVis(o.value)} className="mt-1 h-4 w-4 accent-orange" />
              <div>
                <p className="text-sm font-semibold text-navy">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Contact reveal timing">
        <p className="text-xs text-muted-foreground">When your phone is allowed to be shown, choose how early in the request flow members can see it.</p>
        <div className="space-y-2">
          {options.map((o) => (
            <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${policy === o.value ? "border-orange bg-orange/5" : "border-border bg-background"}`}>
              <input type="radio" name="contact_reveal_policy" checked={policy === o.value} onChange={() => save(o.value)} className="mt-1 h-4 w-4 accent-orange" />
              <div>
                <p className="text-sm font-semibold text-navy">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>
    </>
  );
}

function ProfileIdentitySection() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [identity, setIdentity] = useState<"individual" | "institution">("individual");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState<string>("");
  const [contactPerson, setContactPerson] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [description, setDescription] = useState("");
  const [registration, setRegistration] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await apiClient<{ data: any }>(`/profiles/me`);
        if (data) {
          setIdentity((data.profile_identity as "individual" | "institution") ?? "individual");
          setOrgName(data.organisation_name ?? "");
          setOrgType(data.organisation_type ?? "");
          setContactPerson(data.contact_person ?? "");
          setOrgPhone(data.org_phone ?? "");
          setOrgEmail(data.org_email ?? "");
          setDescription(data.description ?? "");
          setRegistration(data.registration_status ?? "");
        }
      } catch (err) {
        console.error("Failed to load profile identity", err);
      }
      setLoaded(true);
    })();

  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const patch = {
      profile_identity: identity,
      organisation_name: identity === "institution" ? orgName.trim() || null : null,
      organisation_type: identity === "institution" ? orgType || null : null,
      contact_person: identity === "institution" ? contactPerson.trim() || null : null,
      org_phone: identity === "institution" ? orgPhone.trim() || null : null,
      org_email: identity === "institution" ? orgEmail.trim() || null : null,
      description: identity === "institution" ? description.trim() || null : null,
      registration_status: identity === "institution" ? registration.trim() || null : null,
    };
    try {
      await apiClient(`/profiles/me`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      toast.success("Profile identity updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile identity");
    } finally {
      setBusy(false);
    }
  };

  if (!user || !loaded) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-base font-bold text-navy">Profile Identity</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Choose how you appear on Tuungane. Changing this never deletes your posts, listings, requests, followers, or messages.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <IdentityOption
          selected={identity === "individual"}
          onClick={() => setIdentity("individual")}
          icon={<User className="h-4 w-4" />}
          title="Individual Profile"
          body="For people who connect, request, offer services and share updates."
        />
        <IdentityOption
          selected={identity === "institution"}
          onClick={() => setIdentity("institution")}
          icon={<Building2 className="h-4 w-4" />}
          title="Institution / Organisation"
          body="For schools, NGOs, churches, companies, SACCOs, training centres and more."
        />
      </div>

      {identity === "institution" && (
        <div className="mt-4 space-y-3 rounded-xl border border-green/20 bg-green/5 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldControl label="Organisation name" value={orgName} onChange={setOrgName} />
            <div>
              <label className="text-xs font-medium text-navy">Organisation type</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a type…</option>
                {organisationTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <FieldControl label="Contact person" value={contactPerson} onChange={setContactPerson} />
            <FieldControl label="Phone number" value={orgPhone} onChange={setOrgPhone} />
            <FieldControl label="Email address (optional)" value={orgEmail} onChange={setOrgEmail} />
            <FieldControl label="Registration status (optional)" value={registration} onChange={setRegistration} />
          </div>
          <div>
            <label className="text-xs font-medium text-navy">Description / About</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-green"
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2 text-sm font-semibold text-orange-foreground shadow hover:brightness-110 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save identity
        </button>
      </div>
    </div>
  );
}

function IdentityOption({
  selected, onClick, icon, title, body,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-3 text-left transition ${
        selected ? "border-orange bg-orange/5" : "border-border bg-background hover:border-navy/40"
      }`}
    >
      <div className="flex items-center gap-2 text-navy">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </button>
  );
}

function FieldControl({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-navy">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange"
      />
    </div>
  );
}


