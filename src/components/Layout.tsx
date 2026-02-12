import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Inbox, GitBranch, BarChart3, LogOut } from "lucide-react";

const nav = [
  { to: "/offers", label: "Offer Inbox", icon: Inbox },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Layout() {
  const { user, orgName, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <header className="sticky top-0 z-30 border-b border-surface-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <NavLink
              to="/"
              className="flex items-center gap-2 font-semibold text-slate-900"
            >
              <span className="text-brand-600">ParsePort</span>
              <span className="hidden text-surface-400 sm:inline">
                Offer-to-Order
              </span>
            </NavLink>
            <nav className="hidden md:flex items-center gap-1">
              {nav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-surface-600 hover:bg-surface-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {orgName && (
              <span className="hidden sm:inline text-sm text-surface-500">
                {orgName}
              </span>
            )}
            <span
              className="text-sm text-surface-600 truncate max-w-[160px]"
              title={user?.email}
            >
              {user?.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-slate-700"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
