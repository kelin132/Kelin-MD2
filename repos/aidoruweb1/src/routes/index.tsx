import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Fingerprint,
  KeyRound,
  Menu,
  MessageCircle,
  Sparkles,
  Swords,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { ConnectionNotice } from "@/components/aidoru/ConnectionNotice";
import { sessionKey, useSession } from "@/components/aidoru/session";
import {
  phoneLogin,
  requestPasswordReset,
  resetPassword,
  verifyPhone,
} from "@/lib/aidoru.functions";
import type { PublicUser } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "aidoru community" },
      {
        name: "description",
        content: "aidoru community is the anime-inspired portal for your bot trainer account.",
      },
      { property: "og:title", content: "aidoru community" },
    ],
    links: [
      {
        rel: "preload",
        href: "/page-previews/welcome.jpg",
        as: "image",
        type: "image/jpeg",
      },
    ],
  }),
  component: Portal,
});

type AuthMode = "login" | "forgot" | "verify";

function Portal() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [countryCode, setCountryCode] = useState("263");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationKind, setVerificationKind] = useState<"login" | "reset">("login");
  const [notice, setNotice] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, error: sessionError } = useSession();
  const doLogin = useServerFn(phoneLogin);
  const doRequestReset = useServerFn(requestPasswordReset);
  const doVerifyPhone = useServerFn(verifyPhone);
  const doResetPassword = useServerFn(resetPassword);

  const finishAuth = (user: PublicUser) => {
    queryClient.setQueryData(sessionKey, user);
    toast.success(`Welcome back, ${user.name}`);
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    const destination = normalizeBattleDestination(returnTo);
    if (destination) window.location.assign(destination);
    else void navigate({ to: "/dashboard" });
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!phoneNumber.trim()) throw new Error("Enter the phone number registered with the bot.");
      if (password.length < 8) throw new Error("Enter your website password.");
      return doLogin({ data: { countryCode, phoneNumber, password } });
    },
    onSuccess: (result) => {
      if (result.status === "verified") {
        finishAuth(result.user);
        return;
      }
      setVerificationKind("login");
      setNotice(
        `Open a private chat with the WhatsApp bot and send *.otp*. Then enter the six-digit code here. It expires at ${new Date(result.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      );
      setMode("verify");
    },
    onError: (error: Error) => toast.error(error.message || "Unable to open your trainer world."),
  });

  const requestReset = useMutation({
    mutationFn: async () => {
      if (!phoneNumber.trim()) throw new Error("Enter the phone number registered with the bot.");
      if (newPassword.length < 8) throw new Error("Your new password must be at least 8 characters.");
      if (newPassword !== confirmPassword) throw new Error("Your passwords do not match.");
      return doRequestReset({ data: { countryCode, phoneNumber, password: newPassword } });
    },
    onSuccess: ({ expiresAt }) => {
      setNotice(
        `Open a private chat with the WhatsApp bot and send *.otp*. Then enter the six-digit code here. It expires at ${new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      );
      setVerificationKind("reset");
      setMode("verify");
    },
    onError: (error: Error) => toast.error(error.message || "Could not start password recovery."),
  });

  const verify = useMutation({
    mutationFn: () =>
      verificationKind === "login"
        ? doVerifyPhone({ data: { countryCode, phoneNumber, code: otp } })
        : doResetPassword({ data: { countryCode, phoneNumber, code: otp } }),
    onSuccess: finishAuth,
    onError: (error: Error) => toast.error(error.message || "That code could not be verified."),
  });

  useEffect(() => {
    if (!session) return;
    const returnTo = new URLSearchParams(window.location.search).get("returnTo");
    const destination = normalizeBattleDestination(returnTo);
    if (destination) window.location.replace(destination);
    else void navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (sessionError)
    return <ConnectionNotice error={sessionError} onRetry={() => window.location.reload()} />;

  const isBusy = submit.isPending || requestReset.isPending || verify.isPending;
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const isVerify = mode === "verify";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#04131b] text-white">
      <div
        className="landing-bg-bloom pointer-events-none absolute inset-0"
        style={{ transform: `translate3d(0, ${Math.min(scrollY * 0.12, 70)}px, 0) scale(1.03)` }}
      />
      <div
        className="landing-character-scene pointer-events-none absolute inset-x-0 bottom-0 h-[66vh]"
        style={{ transform: `translate3d(0, ${Math.min(scrollY * 0.2, 110)}px, 0)` }}
      />
      <div className="landing-bg-shade pointer-events-none absolute inset-0" />
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="landing-orb landing-orb-cyan pointer-events-none absolute -left-20 top-24 size-80 rounded-full blur-3xl" />
      <div className="landing-orb landing-orb-rose pointer-events-none absolute right-[-10rem] top-[-6rem] size-[28rem] rounded-full blur-3xl" />
      <div className="landing-leaves pointer-events-none absolute inset-0" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span key={index} className={`landing-leaf landing-leaf-${index + 1}`} />
        ))}
      </div>
      <button
        type="button"
        aria-label="Open menu"
        className="landing-menu absolute left-6 top-6 z-20 grid size-14 place-items-center rounded-full border border-white/20 bg-black/35 backdrop-blur-xl sm:left-10 sm:top-10"
      >
        <Menu className="size-7" />
      </button>

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 pb-10 pt-24 sm:px-10 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:px-14 lg:py-14">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
          className="relative z-10 text-center lg:text-left"
        >
          <h1 className="landing-title mt-0">
            WELCOME TO
            <br />
            <span className="text-cyan-300">AIDORU</span>
          </h1>
          <p className="landing-copy mx-auto mt-6 max-w-xl lg:mx-0">
            The anime-powered home for your bot life. Raise your Pokémon, build your party, spend
            your coins, and meet your community in one glowing trainer world.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <Feature icon={Sparkles} label="Your Journey" copy="Live party and Pokémon progress" />
            <Feature icon={WalletCards} label="Your Economy" copy="Shop, wallet and rewards" />
            <Feature icon={Swords} label="Your Arcade" copy="Virtual-coin games and bets" />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.08 }}
          className="relative z-10 lg:justify-self-end lg:w-full lg:max-w-[32rem]"
        >
          <div className="landing-login-card rounded-[2rem] border border-white/15 p-6 shadow-2xl sm:p-9">
            <div className="mb-7">
              <p className="landing-kicker">AIDORU TRAINER PORTAL</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
                {isLogin
                  ? "Open your world"
                  : isForgot
                    ? "Recover your world"
                    : "Check your signal"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {isLogin
                  ? "Use the phone number already registered with the WhatsApp bot. Your existing trainer progress stays attached."
                  : isForgot
                    ? "Choose a new website password, then confirm the code from your private bot chat."
                    : "Your code is tied to the phone number you entered. It can only be used once."}
              </p>
            </div>

            {notice && (
              <div className="mb-4 flex gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs leading-relaxed text-cyan-50">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                <span>{notice}</span>
              </div>
            )}

            {isLogin && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-[7rem_1fr] gap-3">
                  <Field
                    icon={MessageCircle}
                    label="COUNTRY"
                    value={countryCode}
                    onChange={(value) => setCountryCode(value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="263"
                    inputMode="numeric"
                    autoComplete="tel-country-code"
                  />
                  <Field
                    icon={Fingerprint}
                    label="PHONE NUMBER"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 14))}
                    placeholder="771234567"
                    inputMode="numeric"
                    autoComplete="tel-national"
                  />
                </div>
                <Field
                  icon={KeyRound}
                  label="WEBSITE PASSWORD"
                  value={password}
                  onChange={setPassword}
                  placeholder="Your website password"
                  type="password"
                  autoComplete="current-password"
                />
                <button type="submit" disabled={isBusy} className="landing-button mt-3 w-full">
                  {submit.isPending ? "OPENING WORLD…" : "OPEN TRAINER WORLD"}
                </button>
              </form>
            )}

            {isForgot && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  requestReset.mutate();
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-[7rem_1fr] gap-3">
                  <Field
                    icon={MessageCircle}
                    label="COUNTRY"
                    value={countryCode}
                    onChange={(value) => setCountryCode(value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="263"
                    inputMode="numeric"
                    autoComplete="tel-country-code"
                  />
                  <Field
                    icon={Fingerprint}
                    label="PHONE NUMBER"
                    value={phoneNumber}
                    onChange={(value) => setPhoneNumber(value.replace(/\D/g, "").slice(0, 14))}
                    placeholder="771234567"
                    inputMode="numeric"
                    autoComplete="tel-national"
                  />
                </div>
                <Field
                  icon={KeyRound}
                  label="NEW WEBSITE PASSWORD"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="At least 8 characters"
                  type="password"
                  autoComplete="new-password"
                />
                <Field
                  icon={KeyRound}
                  label="CONFIRM PASSWORD"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Repeat your password"
                  type="password"
                  autoComplete="new-password"
                />
                <button type="submit" disabled={isBusy} className="landing-button mt-3 w-full">
                  {requestReset.isPending ? "PREPARING RECOVERY…" : "CONTINUE TO WHATSAPP"}
                </button>
              </form>
            )}

            {isVerify && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  verify.mutate();
                }}
                className="space-y-4"
              >
                <Field
                  icon={MessageCircle}
                  label="SIX-DIGIT OTP"
                  value={otp}
                  onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <button type="submit" disabled={isBusy} className="landing-button mt-3 w-full">
                  {verify.isPending ? "VERIFYING CODE…" : "VERIFY OTP"}
                </button>
              </form>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center text-[11px] text-slate-400">
              {isLogin && (
                <button
                  type="button"
                  className="text-cyan-300 transition hover:text-white"
                  onClick={() => {
                    setNotice("");
                    setMode("forgot");
                  }}
                >
                  Forgot password?
                </button>
              )}
              {!isLogin && (
                <button
                  type="button"
                  className="text-cyan-300 transition hover:text-white"
                  onClick={() => {
                    setNotice("");
                    setMode("login");
                  }}
                >
                  Back to sign in
                </button>
              )}
            </div>
            {isLogin && (
              <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
                Use the same phone number you use with the WhatsApp bot. New accounts and password
                recovery are verified with <span className="text-cyan-300">.otp</span> in a private bot chat.
              </p>
            )}
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function normalizeBattleDestination(value: string | null): string | null {
  if (!value || !value.startsWith("/battle")) return null;
  const [path = "", query = ""] = value.split("?", 2);
  if (path.startsWith("/battle/")) return path;
  if (path !== "/battle") return null;
  const params = new URLSearchParams(query);
  const reference = params.get("room") || params.get("code");
  return reference ? `/battle/${encodeURIComponent(reference)}` : "/battle";
}

function Feature({
  icon: Icon,
  label,
  copy,
}: {
  icon: typeof Sparkles;
  label: string;
  copy: string;
}) {
  return (
    <div className="landing-feature flex min-w-[13rem] flex-1 items-center gap-3 rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-left backdrop-blur-xl">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cyan-300 text-[#04202b]">
        <Icon className="size-4" />
      </span>
      <span>
        <strong className="block text-sm text-white">{label}</strong>
        <small className="mt-0.5 block text-xs text-slate-400">{copy}</small>
      </span>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
}: {
  icon: typeof Fingerprint;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block">
      <span className="landing-kicker mb-2 block">{label}</span>
      <span className="landing-input flex items-center gap-3 rounded-full border border-white/15 px-4 py-3.5 transition focus-within:border-cyan-300/70">
        <Icon className="size-4 shrink-0 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
      </span>
    </label>
  );
}
