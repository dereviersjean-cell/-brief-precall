"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

// Connexion sans Google ni Microsoft (14/10/2026) : email + mot de passe, ou
// code à 6 chiffres reçu par email. Le code sert aussi à créer un compte et à
// définir ou changer son mot de passe — c'est la preuve qu'on reçoit les
// emails de l'adresse (voir lib/email-auth.ts). Le serveur ne dit jamais si
// une adresse a déjà un compte.

type Mode = "password" | "code";
type CodeIntent = "login" | "signup" | "reset";

const ERRORS: Record<string, string> = {
  InvalidPassword: "Email ou mot de passe incorrect.",
  TooManyAttempts: "Trop d'essais. Réessayez dans un quart d'heure, ou recevez un code par email.",
  AccountDisabled: "Votre compte a été désactivé.",
  InvalidCode: "Code incorrect ou expiré. Vérifiez-le, ou demandez-en un nouveau.",
  WeakPassword: "Le mot de passe doit faire au moins 8 caractères.",
};

const INPUT =
  "h-12 w-full rounded-2xl border border-land-line bg-white px-4 text-[15px] text-land-ink outline-none transition-colors placeholder:text-land-faint focus:border-land-ink";
const LINK = "text-[13.5px] font-medium text-land-ink underline-offset-4 hover:underline disabled:opacity-50";

export function EmailSignIn({ callbackUrl = "/brief" }: { callbackUrl?: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [intent, setIntent] = useState<CodeIntent>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function finish(provider: "email-password" | "email-code", credentials: Record<string, string>) {
    setBusy(true);
    setError(null);
    const res = await signIn(provider, { ...credentials, redirect: false, callbackUrl });
    if (!res || res.error) {
      setBusy(false);
      setError(ERRORS[res?.error ?? ""] ?? "Connexion impossible pour le moment. Réessayez.");
      return;
    }
    // Navigation complète : la session vient d'être posée, toute l'app doit
    // repartir avec.
    window.location.href = res.url ?? callbackUrl;
  }

  async function requestCode(nextIntent: CodeIntent) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Saisissez d'abord votre adresse email.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/email-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const data = (await res?.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Impossible d'envoyer le code pour le moment.");
      return;
    }
    setIntent(nextIntent);
    setMode("code");
    setCode("");
    setInfo(`Code envoyé à ${email.trim()}. Pensez à regarder dans les indésirables.`);
  }

  if (mode === "code") {
    const passwordLabel =
      intent === "signup"
        ? "Choisissez un mot de passe (facultatif)"
        : intent === "reset"
          ? "Nouveau mot de passe"
          : "Définir un mot de passe (facultatif)";
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (intent === "reset" && !newPassword) {
            setError("Choisissez un nouveau mot de passe.");
            return;
          }
          void finish("email-code", { email: email.trim(), code, newPassword });
        }}
      >
        {info && <p className="text-[14px] text-land-muted">{info}</p>}
        <input
          className={`${INPUT} text-center text-[20px] font-semibold tracking-[0.4em]`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          autoFocus
          aria-label="Code reçu par email"
        />
        <div>
          <label className="mb-1.5 block text-[13px] text-land-muted" htmlFor="email-new-password">
            {passwordLabel}
          </label>
          <input
            id="email-new-password"
            className={INPUT}
            type="password"
            autoComplete="new-password"
            placeholder="8 caractères minimum"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-[13.5px] text-land-coral-ink">{error}</p>}
        <button
          type="submit"
          disabled={busy || code.replace(/\s/g, "").length !== 6}
          className="h-12 w-full rounded-full bg-land-ink text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Vérification…" : intent === "signup" ? "Créer mon compte" : "Valider"}
        </button>
        <div className="flex items-center justify-between pt-1">
          <button type="button" className={LINK} onClick={() => setMode("password")}>
            Retour
          </button>
          <button type="button" className={LINK} disabled={busy} onClick={() => void requestCode(intent)}>
            Renvoyer le code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void finish("email-password", { email: email.trim(), password });
      }}
    >
      <input
        className={INPUT}
        type="email"
        autoComplete="email"
        placeholder="vous@entreprise.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Adresse email"
      />
      <input
        className={INPUT}
        type="password"
        autoComplete="current-password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Mot de passe"
      />
      {error && <p className="text-[13.5px] text-land-coral-ink">{error}</p>}
      <button
        type="submit"
        disabled={busy || !email || !password}
        className="h-12 w-full rounded-full bg-land-ink text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Connexion…" : "Se connecter"}
      </button>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
        <button type="button" className={LINK} disabled={busy} onClick={() => void requestCode("login")}>
          Recevoir un code par email
        </button>
        <button type="button" className={LINK} disabled={busy} onClick={() => void requestCode("reset")}>
          Mot de passe oublié ?
        </button>
      </div>
      <p className="pt-2 text-[14px] text-land-muted">
        Pas encore de compte ?{" "}
        <button type="button" className={LINK} disabled={busy} onClick={() => void requestCode("signup")}>
          Créer un compte avec cet email
        </button>
      </p>
    </form>
  );
}
