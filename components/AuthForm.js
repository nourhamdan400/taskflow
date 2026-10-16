"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { friendlyError } from "@/lib/utils";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Alert } from "./States";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_COUNTRIES = [
  { code: "1", name: "United States / Canada (+1)" },
  { code: "44", name: "United Kingdom (+44)" },
  { code: "971", name: "United Arab Emirates (+971)" },
  { code: "966", name: "Saudi Arabia (+966)" },
  { code: "20", name: "Egypt (+20)" },
  { code: "962", name: "Jordan (+962)" },
  { code: "961", name: "Lebanon (+961)" },
  { code: "965", name: "Kuwait (+965)" },
  { code: "974", name: "Qatar (+974)" },
  { code: "61", name: "Australia (+61)" },
  { code: "91", name: "India (+91)" },
  { code: "49", name: "Germany (+49)" },
  { code: "33", name: "France (+33)" },
];

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    sendPhoneCode,
  } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");
  const [method, setMethod] = useState("email");
  const [countryCode, setCountryCode] = useState("1");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [saving, setSaving] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    if (!secondsLeft) return undefined;
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(
    () => () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
    },
    [],
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (isRegister && form.name.trim().length < 2)
      e.name = "Name must be at least 2 characters.";
    if (!EMAIL_RE.test(form.email.trim()))
      e.email = "Enter a valid email address.";
    if (form.password.length < 6)
      e.password = "Password must be at least 6 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setFormError("");
    setFormNotice("");
    if (!validate()) return;
    setSaving(true);
    try {
      if (isRegister)
        await register(form.name.trim(), form.email.trim(), form.password);
      else await login(form.email.trim(), form.password);
      router.replace("/dashboard");
    } catch (err) {
      setFormError(friendlyError(err));
      setSaving(false);
    }
  };

  const createVerifier = () => {
    recaptchaVerifierRef.current?.clear();
    const verifier = new RecaptchaVerifier(
      auth,
      recaptchaContainerRef.current,
      {
        size: "invisible",
      },
    );
    recaptchaVerifierRef.current = verifier;
    return verifier;
  };

  const onSendCode = async (ev) => {
    ev.preventDefault();
    setFormError("");
    setFormNotice("");
    const nationalNumber = phone.replace(/\D/g, "").replace(/^0/, "");
    if (nationalNumber.length < 7 || nationalNumber.length > 15) {
      setFormError(
        "Enter a valid phone number. Include the area code, without the country code.",
      );
      return;
    }

    let verifier;
    setPhoneBusy(true);
    try {
      verifier = createVerifier();
      const result = await sendPhoneCode(
        `+${countryCode}${nationalNumber}`,
        verifier,
      );
      setConfirmation(result);
      setVerificationCode("");
      setSecondsLeft(60);
      setFormNotice(
        "A verification code was sent by SMS. Enter it below to finish signing in.",
      );
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      verifier?.clear();
      if (recaptchaVerifierRef.current === verifier)
        recaptchaVerifierRef.current = null;
      setPhoneBusy(false);
    }
  };

  const onVerifyCode = async (ev) => {
    ev.preventDefault();
    setFormError("");
    setFormNotice("");
    if (!/^\d{6}$/.test(verificationCode)) {
      setFormError("Enter the 6-digit verification code from your SMS.");
      return;
    }
    setPhoneBusy(true);
    try {
      await confirmation.confirm(verificationCode);
      router.replace("/dashboard");
    } catch (err) {
      setFormError(friendlyError(err));
      if (["auth/code-expired", "auth/session-expired"].includes(err?.code)) {
        setConfirmation(null);
        setSecondsLeft(0);
      }
    } finally {
      setPhoneBusy(false);
    }
  };

  const onSocialSignIn = async (provider) => {
    setFormError("");
    setFormNotice("");
    setSaving(true);
    try {
      if (provider === "google") await loginWithGoogle();
      else await loginWithFacebook();
      router.replace("/dashboard");
    } catch (err) {
      setFormError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main id="main" className="auth-page">
      <div className="card auth-card">
        <Link href="/login" className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            t
          </span>{" "}
          taskflow<span className="brand-period">.</span>
        </Link>
        <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {isRegister
            ? "Start organising your team's work."
            : "Sign in to your TaskFlow account."}
        </p>
        {!isFirebaseConfigured && (
          <Alert kind="warn">
            Firebase is not configured. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code> and fill in your keys.
          </Alert>
        )}
        <Alert>{formError}</Alert>
        <Alert kind="success">{formNotice}</Alert>
        <div
          className="auth-method-tabs"
          role="tablist"
          aria-label="Sign-in method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={method === "email"}
            className={method === "email" ? "active" : ""}
            onClick={() => {
              setMethod("email");
              setFormError("");
              setFormNotice("");
            }}
          >
            Email
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "phone"}
            className={method === "phone" ? "active" : ""}
            onClick={() => {
              setMethod("phone");
              setFormError("");
              setFormNotice("");
            }}
          >
            Phone
          </button>
        </div>

        {method === "email" ? (
          <form onSubmit={onSubmit} noValidate>
            {isRegister && (
              <Field id="name" label="Full name" error={errors.name}>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={set("name")}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-err" : undefined}
                />
              </Field>
            )}
            <Field id="email" label="Email" error={errors.email}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-err" : undefined}
              />
            </Field>
            <Field id="password" label="Password" error={errors.password}>
              <input
                id="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={form.password}
                onChange={set("password")}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-err" : undefined}
              />
            </Field>
            <button className="btn btn-block" type="submit" disabled={saving}>
              {saving ? "Please wait…" : isRegister ? "Register" : "Log in"}
            </button>
          </form>
        ) : (
          <section className="phone-flow" aria-label="Phone sign in">
            {!confirmation ? (
              <form onSubmit={onSendCode}>
                <Field
                  id="phone-number"
                  label="Phone number"
                  hint="Choose your country, then enter your number without the country code."
                >
                  <div className="phone-entry">
                    <label className="sr-only" htmlFor="country-code">
                      Country dialing code
                    </label>
                    <select
                      id="country-code"
                      aria-label="Country dialing code"
                      value={countryCode}
                      onChange={(event) => setCountryCode(event.target.value)}
                    >
                      {PHONE_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    <input
                      id="phone-number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="555 123 4567"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      required
                    />
                  </div>
                </Field>
                <button
                  className="btn btn-block"
                  type="submit"
                  disabled={phoneBusy}
                >
                  {phoneBusy ? "Sending code…" : "Send SMS code"}
                </button>
              </form>
            ) : (
              <form onSubmit={onVerifyCode}>
                <p className="phone-sent-to">
                  Code sent to{" "}
                  <strong>
                    +{countryCode} {phone}
                  </strong>
                </p>
                <Field id="verification-code" label="6-digit verification code">
                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    required
                  />
                </Field>
                <button
                  className="btn btn-block"
                  type="submit"
                  disabled={phoneBusy}
                >
                  {phoneBusy ? "Verifying…" : "Verify and continue"}
                </button>
                <div className="otp-actions">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setConfirmation(null);
                      setVerificationCode("");
                      setFormError("");
                      setFormNotice("");
                      setSecondsLeft(0);
                    }}
                  >
                    Change phone number
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={onSendCode}
                    disabled={phoneBusy || secondsLeft > 0}
                  >
                    {secondsLeft > 0
                      ? `Resend in ${secondsLeft}s`
                      : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        <div className="auth-divider">
          <span>or continue with</span>
        </div>
        <div className="social-buttons">
          <button
            type="button"
            className="social-button"
            onClick={() => onSocialSignIn("google")}
            disabled={saving || phoneBusy}
          >
            <span className="social-mark google" aria-hidden="true">
              G
            </span>{" "}
            Google
          </button>
          <button
            type="button"
            className="social-button"
            onClick={() => onSocialSignIn("facebook")}
            disabled={saving || phoneBusy}
          >
            <span className="social-mark facebook" aria-hidden="true">
              f
            </span>{" "}
            Facebook
          </button>
        </div>
        <p className="muted center-text">
          {isRegister ? (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/register">Create an account</Link>
            </>
          )}
        </p>
        <div ref={recaptchaContainerRef} className="recaptcha-container" />
      </div>
    </main>
  );
}

export function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <small className="muted">{hint}</small>}
      {error && (
        <small id={`${id}-err`} className="field-error">
          ⚠ {error}
        </small>
      )}
    </div>
  );
}
