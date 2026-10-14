"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

// Création de compte par email (14/10/2026, page à part à la demande de Jean) :
// 1. nom, email, mot de passe ; 2. code reçu par email pour prouver que
// l'adresse est la sienne — le compte n'est créé qu'à ce moment-là
// (lib/email-auth.ts) ; 3. l'onboarding prend le relais (entreprise, offre).

const INPUT =
  "h-12 w-full rounded-2xl border border-land-line bg-white px-4 text-[15px] text-land-ink outline-none transition-colors placeholder:text-land-faint focus:border-land-ink";
const PRIMARY =
  "h-12 w-full rounded-full bg-land-ink text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const ERRORS: Record<string, string> = {
  InvalidCode: "Code incorrect ou expiré. Vérifiez-le, ou demandez-en un nouveau.",
  WeakPassword: "Le mot de passe doit faire au moins 8 caractères.",
  AccountDisabled: "Ce compte a été désactivé.",
};

export function SignUpForm({ initialEmail = "", callbackUrl = "/brief" }: { initialEmail?: string; callbackUrl?: string }) {
  const [step, setStep] = useState<"details" | "verify">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  async function sendCode(): Promise<boolean> {
    setBusy(true);
    setError(null);
    setAccountExists(false);
    const res = await fetch("/api/auth/email-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), intent: "signup", name: name.trim() }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return true;
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    if (data?.error === "account_exists") {
      setError("Un compte existe déjà avec cette adresse.");
      setAccountExists(true);
    } else {
      setError(data?.error ?? "Impossible d'envoyer le code pour le moment.");
    }
    return false;
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().split(/\s+/).length < 2) return setError("Indiquez votre prénom et votre nom.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Adresse email invalide.");
    if (password.length < 8) return setError(ERRORS.WeakPassword);
    if (await sendCode()) {
      setCode("");
      setStep("verify");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("email-code", {
      email: email.trim(),
      code,
      newPassword: password,
      name: name.trim(),
      redirect: false,
      callbackUrl,
    });
    if (!res || res.error) {
      setBusy(false);
      setError(ERRORS[res?.error ?? ""] ?? "Création impossible pour le moment. Réessayez.");
      return;
    }
    // Navigation complète : la session vient d'être posée. Sans entreprise, le
    // middleware envoie le nouveau compte à l'onboarding.
    window.location.href = res.url ?? callbackUrl;
  }

  const errorBox = error && (
    <div className="rounded-2xl bg-land-coral-soft px-4 py-3 text-[13.5px] text-land-coral-ink">
      {error}
      {accountExists && (
        <Link href="/login" className="mt-1.5 block font-semibold text-land-ink underline underline-offset-4">
          Se connecter
        </Link>
      )}
    </div>
  );

  if (step === "verify") {
    return (
      <form className="space-y-3" onSubmit={submitCode}>
        <div className="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-land-line">
          <p className="text-[14px] font-semibold text-land-ink">Vérifiez votre adresse</p>
          <p className="mt-0.5 text-[13.5px] text-land-muted">
            Code envoyé à <span className="font-medium text-land-ink">{email.trim()}</span>. Pensez à regarder dans les indésirables.
          </p>
        </div>
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
        {errorBox}
        <button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6} className={PRIMARY}>
          {busy ? "Création du compte…" : "Créer mon compte"}
        </button>
        <div className="flex items-center justify-between pt-1 text-[13.5px] font-medium text-land-ink">
          <button type="button" className="underline-offset-4 hover:underline" onClick={() => setStep("details")}>
            Modifier mes informations
          </button>
          <button type="button" disabled={busy} className="underline-offset-4 hover:underline disabled:opacity-50" onClick={() => void sendCode()}>
            Renvoyer le code
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-3" onSubmit={submitDetails} noValidate>
      <input className={INPUT} autoComplete="name" placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} aria-label="Prénom et nom" />
      <input
        className={INPUT}
        type="email"
        autoComplete="email"
        placeholder="Email professionnel"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-label="Email professionnel"
      />
      <input
        className={INPUT}
        type="password"
        autoComplete="new-password"
        placeholder="Mot de passe (8 caractères minimum)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-label="Mot de passe"
      />
      {errorBox}
      <button type="submit" disabled={busy} className={PRIMARY}>
        {busy ? "Envoi du code…" : "Continuer"}
      </button>
      <p className="text-[12.5px] leading-relaxed text-land-faint">
        Nous vous envoyons un code pour vérifier votre adresse. En créant un compte, vous acceptez notre{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-land-ink">
          politique de confidentialité
        </Link>
        .
      </p>
    </form>
  );
}
