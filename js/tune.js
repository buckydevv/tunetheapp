// Tune! on the web: your account, the same one as in the app.
// Loaded as a module by every page. It draws the account button in the top bar, and gives the
// account and people pages one small API over Supabase (or a pretend one for local testing).

export const SUPABASE = "https://dhawbwlaiypaddpnjaav.supabase.co";
// The public key: what it can read and write is limited by the database's own rules.
const KEY = "sb_publishable_j261GWZGiPVW8MXbR-1nXQ_Q0VWXuym";
const STORE = "sb-dhawbwlaiypaddpnjaav-auth-token";
const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const local = ["localhost", "127.0.0.1"].includes(location.hostname);
/** Local testing only: `?mock` pretends to be signed in, with made-up people. */
export const MOCK = local && new URLSearchParams(location.search).has("mock");
/** Cloudflare's check that you're a person. Its always-passes test key on this PC. */
export const CAPTCHA_KEY = local ? "1x00000000000000000000AA" : "0x4AAAAAAF8hcYKbJAasbokj";

const COLS = "id, handle, display_name, bio, avatar_path, banner_path, accent, created_at, handle_changed_at, profile_badges(badge)";

// ── Small helpers ──

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const pic = (p) => (p ? `${SUPABASE}/storage/v1/object/public/avatars/${p.split("/").map(encodeURIComponent).join("/")}` : null);
export const initial = (s) => esc((s || "?").trim().charAt(0).toUpperCase());
export const $ = (sel, root = document) => root.querySelector(sel);

/** A round picture, or the first letter of their name on their colour. */
export function avatar(p, size = 40) {
  const src = pic(p?.avatar_path);
  const name = p?.display_name || p?.handle || "?";
  return `<span class="av" style="--s:${size}px;--a:${esc(p?.accent || "#ff2e88")}">${src ? `<img src="${src}" alt="" loading="lazy">` : initial(name)}</span>`;
}
export const badge = (p) => (p?.badge === "developer" ? ' <span class="dev-badge" title="Tune! developer">Developer</span>' : "");

function flatten(row) {
  if (!row) return row;
  const b = row.profile_badges;
  const { profile_badges: _drop, ...rest } = row;
  return { ...rest, badge: (Array.isArray(b) ? b[0]?.badge : b?.badge) ?? null };
}

/** Supabase's messages, in plain English (the same wording as the app). */
export function friendly(e) {
  const msg = e?.message ?? String(e);
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Confirm your email first with the code we sent you.";
  if (m.includes("token has expired") || m.includes("otp_expired") || m.includes("invalid or has expired")) return "That code has expired or isn't right. Send a new one and try again.";
  if (m.includes("user already registered")) return "There's already an account with that email. Sign in instead.";
  if (m.includes("password should be at least")) return "Use a password of at least 8 characters.";
  if (m.includes("email rate limit")) return "Tune! has sent too many emails this hour. Try again later.";
  if (m.includes("once every 24 hours") || m.includes("once a week")) return "You can change your username once a week.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a minute and try again.";
  if (m.includes("captcha")) return 'The "are you a person?" check didn\'t go through. Wait for it to tick, then try again.';
  if (m.includes("profiles_handle_key") || m.includes("duplicate key")) return "Someone just took that username. Try another.";
  if (m.includes("reserved")) return "That username is reserved. Try another.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Can't reach Tune!'s servers. Check your internet connection.";
  return msg;
}
const fail = (e) => {
  throw new Error(friendly(e));
};

/** Username rules, as the database checks them. */
export function handleProblem(h) {
  if (!h) return "Pick a username";
  if (h.length < 3) return "At least 3 characters";
  if (h.length > 20) return "20 characters at most";
  if (!/^[a-z0-9._]+$/.test(h)) return "Only letters, numbers, dots and underscores";
  if (h.startsWith(".") || h.endsWith(".")) return "Can't start or end with a dot";
  if (h.includes("..")) return "No two dots in a row";
  return null;
}

/** Squares and shrinks a picture to a 512 px WebP, exactly like the app does. */
export async function squareAvatar(file) {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const size = Math.min(512, side);
  const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  return await new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("Couldn't read that picture"))), "image/webp", 0.9));
}

// ── The real thing: Supabase ──

let clientPromise;
function client() {
  clientPromise ??= import(LIB).then(({ createClient }) => createClient(SUPABASE, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }));
  return clientPromise;
}

const real = {
  async me() {
    const sb = await client();
    const { data } = await sb.auth.getSession();
    const user = data.session?.user ?? null;
    if (!user) return null;
    const { data: row, error } = await sb.from("profiles").select(COLS).eq("id", user.id).maybeSingle();
    if (error) fail(error);
    return { user: { id: user.id, email: user.email }, profile: flatten(row) };
  },
  async signIn(email, password, captchaToken) {
    const sb = await client();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } });
    if (error?.message.toLowerCase().includes("email not confirmed")) return "confirm";
    if (error) fail(error);
    return "ok";
  },
  async signUp(email, password, captchaToken) {
    const sb = await client();
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { captchaToken } });
    if (error) fail(error);
    return !data.session; // true: confirm the email first
  },
  async confirm(email, code) {
    const sb = await client();
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "signup" });
    if (error) fail(error);
  },
  async resend(email, captchaToken) {
    const sb = await client();
    const { error } = await sb.auth.resend({ type: "signup", email: email.trim(), options: { captchaToken } });
    if (error) fail(error);
  },
  async sendReset(email, captchaToken) {
    const sb = await client();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { captchaToken });
    if (error) fail(error);
  },
  async resetWithCode(email, code, password) {
    const sb = await client();
    const v = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    if (v.error) fail(v.error);
    const u = await sb.auth.updateUser({ password });
    if (u.error) fail(u.error);
  },
  async signOut() {
    const sb = await client();
    await sb.auth.signOut();
  },
  async handleAvailable(h) {
    const sb = await client();
    const { data, error } = await sb.rpc("handle_available", { h });
    if (error) fail(error);
    return !!data;
  },
  async uploadAvatar(blob) {
    const sb = await client();
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("Sign in first");
    // A new name each time, so it never has to overwrite (the same as the app).
    const path = `${id}/avatar-${Date.now()}.webp`;
    const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/webp", upsert: false });
    if (error) throw new Error(`Couldn't upload your picture. ${friendly(error)}`);
    return path;
  },
  async saveProfile(p) {
    const sb = await client();
    const { data: s } = await sb.auth.getSession();
    const id = s.session?.user.id;
    if (!id) throw new Error("Sign in first");
    const row = { id, handle: p.handle.toLowerCase(), display_name: p.display_name.trim(), bio: p.bio.trim(), avatar_path: p.avatar_path, accent: p.accent ?? null };
    const { data, error } = await sb.from("profiles").upsert(row).select(COLS).single();
    if (error) throw new Error(`Couldn't save your profile. ${friendly(error)}`);
    return flatten(data);
  },
  async deleteAccount() {
    const sb = await client();
    const { data: s } = await sb.auth.getSession();
    const id = s.session?.user.id;
    if (!id) throw new Error("Sign in first");
    // Pictures first (only you can remove them), then the account takes everything else with it.
    const { data: files } = await sb.storage.from("avatars").list(id, { limit: 1000 });
    if (files?.length) await sb.storage.from("avatars").remove(files.map((f) => `${id}/${f.name}`));
    const { error } = await sb.rpc("delete_my_account");
    if (error) throw new Error(`Couldn't delete your account. ${friendly(error)}`);
    await sb.auth.signOut({ scope: "local" }).catch(() => {});
  },
  async search(q) {
    const text = q.trim().replace(/^@/, "").replace(/[%,()*\\]/g, "");
    if (text.length < 2) return [];
    const sb = await client();
    const like = `%${text}%`;
    const { data, error } = await sb.from("profiles").select(COLS).or(`handle.ilike.${like},display_name.ilike.${like}`).limit(24);
    if (error) fail(error);
    return (data ?? []).map(flatten);
  },
  async byHandle(handle) {
    const sb = await client();
    const { data, error } = await sb.from("profiles").select(COLS).eq("handle", handle.toLowerCase()).maybeSingle();
    if (error) fail(error);
    return flatten(data);
  },
  async isFollowing(me, them) {
    const sb = await client();
    const { count } = await sb.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", me).eq("followee_id", them);
    return (count ?? 0) > 0;
  },
  async follow(me, them) {
    const sb = await client();
    const { error } = await sb.from("follows").insert({ follower_id: me, followee_id: them });
    if (error && error.code !== "23505") fail(error);
  },
  async unfollow(me, them) {
    const sb = await client();
    const { error } = await sb.from("follows").delete().eq("follower_id", me).eq("followee_id", them);
    if (error) fail(error);
  },
};

// ── Pretend, for testing on this PC (?mock) ──

const PEOPLE = [
  { id: "u1", handle: "lucidavenue", display_name: "Lucid Avenue", bio: "Synths at midnight", avatar_path: null, accent: "#22e4ff" },
  { id: "u2", handle: "neonfever", display_name: "Neon Fever", bio: "Mostly drum and bass", avatar_path: null, accent: "#b8ff3c" },
  { id: "u3", handle: "glass.hearts", display_name: "Glass Hearts", bio: "", avatar_path: null, accent: "#ffd23f" },
  { id: "u4", handle: "static_bloom", display_name: "Static Bloom", bio: "Making playlists for long drives", avatar_path: null, accent: "#7b2ff7" },
];
const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const mockState = JSON.parse(sessionStorage.getItem("tune-mock") || "null") ?? {
  signedIn: true,
  profile: { id: "mock-me", handle: "you", display_name: "You", bio: "Testing the website", avatar_path: null, accent: "#ff2e88", badge: null },
  follows: [],
};
const keep = () => sessionStorage.setItem("tune-mock", JSON.stringify(mockState));
const mock = {
  async me() {
    await wait(200);
    return mockState.signedIn ? { user: { id: "mock-me", email: "you@example.com" }, profile: mockState.profile } : null;
  },
  async signIn(email, password) {
    await wait();
    if (password === "wrong") throw new Error("That email and password don't match.");
    mockState.signedIn = true;
    keep();
    return "ok";
  },
  async signUp() {
    await wait();
    return true;
  },
  async confirm() {
    await wait();
    mockState.signedIn = true;
    keep();
  },
  resend: wait,
  sendReset: wait,
  async resetWithCode() {
    await wait();
    mockState.signedIn = true;
    keep();
  },
  async signOut() {
    mockState.signedIn = false;
    keep();
  },
  async handleAvailable(h) {
    await wait(250);
    return !["admin", "tune", "seazy"].includes(h);
  },
  async uploadAvatar() {
    await wait();
    return null;
  },
  async saveProfile(p) {
    await wait();
    mockState.profile = { ...mockState.profile, ...p, handle: p.handle.toLowerCase() };
    keep();
    return mockState.profile;
  },
  async deleteAccount() {
    await wait();
    mockState.signedIn = false;
    keep();
  },
  async search(q) {
    await wait();
    const t = q.trim().replace(/^@/, "").toLowerCase();
    return t.length < 2 ? [] : PEOPLE.filter((p) => `${p.handle} ${p.display_name}`.toLowerCase().includes(t));
  },
  async byHandle(h) {
    return PEOPLE.find((p) => p.handle === h) ?? null;
  },
  async isFollowing(_me, them) {
    return mockState.follows.includes(them);
  },
  async follow(_me, them) {
    mockState.follows.push(them);
    keep();
  },
  async unfollow(_me, them) {
    mockState.follows = mockState.follows.filter((x) => x !== them);
    keep();
  },
};

export const api = MOCK ? mock : real;

/** Whether a sign-in is saved in this browser (without loading anything). */
export function maybeSignedIn() {
  if (MOCK) return mockState.signedIn;
  try {
    return !!localStorage.getItem(STORE);
  } catch {
    return false;
  }
}

/** Keeps `?mock` on links while testing, so the pretend session follows you around. */
export const href = (path) => (MOCK ? `${path}${path.includes("?") ? "&" : "?"}mock` : path);

// ── The account button in the top bar ──

let mePromise;
/** You (and your profile), once; null when signed out. */
export function whoami() {
  mePromise ??= maybeSignedIn() ? api.me().catch(() => null) : Promise.resolve(null);
  return mePromise;
}

function drawAccountButton(slot, me) {
  if (!me) {
    slot.innerHTML = `<a class="signin-link" href="${href("/account")}">Sign in</a>`;
    return;
  }
  const p = me.profile ?? { handle: "", display_name: me.user.email };
  slot.innerHTML = `
    <div class="me-menu">
      <button class="me-btn" aria-haspopup="menu" aria-expanded="false" aria-label="Your account">
        ${avatar(p, 32)}
      </button>
      <div class="menu" role="menu" hidden>
        <div class="menu-who">
          <strong>${esc(p.display_name || "Your account")}</strong>
          ${p.handle ? `<span>@${esc(p.handle)}</span>` : `<span>${esc(me.user.email)}</span>`}
        </div>
        ${p.handle ? `<a role="menuitem" href="${href(`/u/${esc(p.handle)}`)}">Your profile</a>` : ""}
        <a role="menuitem" href="${href("/people")}">Find people</a>
        <a role="menuitem" href="${href("/account")}">Account</a>
        <button role="menuitem" data-signout>Sign out</button>
      </div>
    </div>`;
  const btn = $(".me-btn", slot);
  const menu = $(".menu", slot);
  const close = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    btn.setAttribute("aria-expanded", String(!menu.hidden));
    if (!menu.hidden) menu.querySelector("a,button")?.focus();
  });
  document.addEventListener("click", (e) => !slot.contains(e.target) && close());
  slot.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      btn.focus();
    }
  });
  $("[data-signout]", slot).addEventListener("click", async () => {
    await api.signOut().catch(() => {});
    location.href = href("/");
  });
}

/** Redraws the top-bar button after your profile changes. */
export function refreshAccountButton(me) {
  mePromise = Promise.resolve(me);
  document.querySelectorAll("[data-account]").forEach((s) => drawAccountButton(s, me));
}

/** Fills every `[data-account]` slot in the top bar. */
export async function mountAccountButton() {
  const slots = document.querySelectorAll("[data-account]");
  if (!slots.length) return;
  const me = await whoami();
  slots.forEach((s) => drawAccountButton(s, me));
}

mountAccountButton();
