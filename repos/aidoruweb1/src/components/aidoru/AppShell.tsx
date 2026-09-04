import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChevronRight,
  Dices,
  GalleryHorizontalEnd,
  LayoutDashboard,
  LogOut,
  Menu,
  PawPrint,
  ShoppingBag,
  Sparkles,
  Swords,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useLogout, useSession } from "./session";
import { UserAvatar } from "./UserAvatar";
import { ConnectionNotice } from "./ConnectionNotice";
import { formatCompactCoins, rankFromLevel, trainerLevelProgress } from "@/lib/game";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Leaderboards", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/cards", label: "Cards", icon: GalleryHorizontalEnd },
  { to: "/pets", label: "Pets", icon: PawPrint },
  { to: "/journey", label: "Journey", icon: Sparkles },
  { to: "/mart", label: "Shop", icon: ShoppingBag },
  { to: "/guild", label: "Guild", icon: Users },
  { to: "/arcade", label: "Arcade", icon: Dices },
  { to: "/battle", label: "Battle", icon: Swords },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { data: user, error: sessionError, isLoading } = useSession();
  const logout = useLogout();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!isLoading && user === null) {
      const isBattleRoute = pathname === "/battle" || pathname.startsWith("/battle/");
      const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
      const isPublicRoute = isBattleRoute || isDashboardRoute;

      if (!isPublicRoute) {
        window.location.replace("/");
      }
    }
  }, [isLoading, user, pathname]);

  if (sessionError) return <ConnectionNotice error={sessionError} onRetry={() => window.location.reload()} />;
  
  const isBattleRoute = pathname === "/battle" || pathname.startsWith("/battle/");
  const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isPublicRoute = isBattleRoute || isDashboardRoute;

  if (isLoading || (!user && !isPublicRoute))
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="hof-kicker">Loading AIDORU</span>
      </div>
    );

  const progress = user ? trainerLevelProgress(user.trainerLevel, user.trainerXp) : null;
  return (
    <div className={cn("min-h-screen bg-background aidoru-app", `aidoru-app-${pathname.replace(/^\//, "").replaceAll("/", "-") || "home"}`)}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 px-3 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 transition hover:border-cyan-300/45 hover:text-cyan-200 sm:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/dashboard" className="flex shrink-0 items-center gap-3">
            <span className="hof-heading text-2xl tracking-[0.16em]">AIDORU</span>
          </Link>
          <nav className="ml-5 hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "rounded-lg px-3 py-2 font-display text-sm font-semibold transition",
                  pathname === to ? "bg-cyan-300/10 text-cyan-200" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user && (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 sm:flex">
                  <span className="hof-label">$</span>
                  <span className="font-mono-ui text-xs text-cyan-200">{formatCompactCoins(user.coins)}</span>
                </div>
                {progress && (
                  <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 md:flex">
                    <span className="hof-label">LV {progress.level}</span>
                    <span className="font-mono-ui text-xs text-muted-foreground">
                      {rankFromLevel(progress.level)}
                    </span>
                  </div>
                )}
                <Link to="/profile" aria-label="Open your profile" className="rounded-full outline-none ring-cyan-300/60 focus-visible:ring-2">
                  <UserAvatar name={user.name} src={user.avatarUrl} videoSrc={user.avatarVideoUrl} className="size-10 border-cyan-300/50" />
                </Link>
                <button
                  type="button"
                  onClick={() => logout.mutate()}
                  aria-label="Sign out"
                  className="hidden size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:text-cyan-200 sm:grid"
                >
                  <LogOut className="size-4" />
                </button>
              </>
            )}
            {!user && (
              <a
                href="/"
                className="bg-gradient-brand text-foreground inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      <div
        className={cn(
          "aidoru-mobile-menu fixed inset-0 z-50 transition",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "aidoru-mobile-menu-panel absolute right-0 top-0 flex h-full min-h-0 w-[min(88vw,22rem)] flex-col overflow-hidden border-l border-cyan-300/15 bg-[#07151f]/96 p-5 shadow-2xl backdrop-blur-2xl transition-[transform,opacity] duration-300 ease-out",
            menuOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="hof-kicker">Menu</p>
              <p className="hof-heading mt-1 text-2xl">AIDORU</p>
            </div>
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-cyan-300/45 hover:text-cyan-200"
            >
              <X className="size-5" />
            </button>
          </div>

          {user ? (
            <div className="mt-6 rounded-2xl border border-cyan-300/18 bg-cyan-300/7 p-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={user.name} src={user.avatarUrl} videoSrc={user.avatarVideoUrl} className="size-14 border-cyan-300/50" />
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.title}</p>
                  <p className="mt-1 font-mono-ui text-[9px] tracking-[0.12em] text-cyan-200">WHATSAPP LINKED</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                <ProfileStat label="Coins" value={formatCompactCoins(user.coins)} />
                <ProfileStat label="Level" value={`${progress?.level || 1}`} />
                <ProfileStat label="Party" value={`${user.partyPokemon.length}/6`} />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-cyan-300/18 bg-cyan-300/7 p-6 text-center">
              <p className="hof-kicker">Welcome, Trainer</p>
              <p className="text-muted-foreground mt-2 text-sm">Sign in to unlock your full profile and collection.</p>
              <a
                href="/"
                className="bg-gradient-brand text-foreground mt-4 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold"
              >
                Sign in
              </a>
            </div>
          )}

          <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-3 pr-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "menu-nav-link flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 transition duration-200",
                    active
                      ?                       "border-cyan-300/55 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                      : "border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/5 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1 font-display text-lg font-semibold">{label}</span>
                  <ChevronRight className="size-4 opacity-45" />
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="menu-signout mt-auto flex items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/7 px-4 py-3 font-display text-base font-semibold text-rose-100 transition hover:bg-rose-300/12 disabled:opacity-50"
          >
            <LogOut className="size-4" />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </button>
        </aside>
      </div>

      <main className="aidoru-route-main mx-auto max-w-[1180px] px-3 pt-8 sm:px-6 sm:pt-10">
        <div className="mb-7">
          <p className="hof-kicker">Trainer hub</p>
          <h1 className="hof-heading mt-1 text-4xl sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>

    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="hof-label truncate">{label}</p>
      <p className="mt-1 truncate font-mono-ui text-xs font-bold text-cyan-100">{value}</p>
    </div>
  );
}

export function PokeballMark({ small = false }: { small?: boolean }) {
  return <span className={`pokeball-mark ${small ? "pokeball-mark-small" : ""}`} aria-hidden="true"><span className="pokeball-mark-band" /><span className="pokeball-mark-button" /></span>;
}
