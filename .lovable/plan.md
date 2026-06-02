### Add "Remember me" option to login page

#### Goal
Add a "Remember me / Stay signed in" checkbox to the Tuungane login form that controls whether the user's session persists across browser restarts.

#### Current behavior
The Supabase client uses `localStorage` for auth persistence by default. Sessions always survive browser restarts.

#### Desired behavior
- **Checked** (default): Session persists in `localStorage` — user stays logged in across browser restarts.
- **Unchecked**: Session is tied to the current browser session only — user is signed out when they close the browser/tab. Page refreshes within the same session keep the user logged in.

---

#### Implementation

**1. Login form UI (`src/routes/login.tsx`)**
- Add a "Remember me" checkbox below the password field, shown only on the **Log in** tab (not Sign up).
- Default state: checked.
- Style with existing `Checkbox` component from `@/components/ui/checkbox` and a label.

**2. Login submit logic (`src/routes/login.tsx`)**
- On successful login with "Remember me" unchecked:
  - Save `tuungane_remember_me = "false"` to `localStorage`
  - Save `tuungane_session_active = "true"` to `sessionStorage`
- On successful login with "Remember me" checked:
  - Save `tuungane_remember_me = "true"` to `localStorage`
  - Remove any existing `tuungane_session_active` from `sessionStorage`

**3. AuthProvider init logic (`src/hooks/use-auth.tsx`)**
- After `supabase.auth.getSession()` returns a session:
  - Read `tuungane_remember_me` from `localStorage`
  - Read `tuungane_session_active` from `sessionStorage`
  - If `rememberMe === "false"` AND `sessionActive` is missing:
    - This is a fresh browser session (user previously unchecked "Remember me")
    - Call `supabase.auth.signOut()` and do not set the session state
  - Otherwise, keep the restored session
  - If session is kept and `rememberMe === "false"`, ensure `sessionStorage.setItem('tuungane_session_active', 'true')` so refreshes stay logged in

**4. Sign-out cleanup (`src/hooks/use-auth.tsx`)**
- The existing `signOut` function already calls `supabase.auth.signOut()`.
- Also clear both `tuungane_remember_me` from `localStorage` and `tuungane_session_active` from `sessionStorage`.

---

#### Why this works
- `sessionStorage` survives page refreshes but is cleared on browser/tab close.
- On a fresh browser start, if the user had unchecked "Remember me", the `localStorage` flag says so but `sessionStorage` is empty — we detect this and sign them out.
- On a page refresh within the same session, `sessionStorage` still holds the flag — we keep them logged in.
- When "Remember me" is checked, we skip all the extra logic and let Supabase's default `localStorage` persistence handle everything.

---

#### Files to modify
- `src/routes/login.tsx` — add checkbox + save preference on login
- `src/hooks/use-auth.tsx` — gate session restore based on preference