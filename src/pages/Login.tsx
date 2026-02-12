import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Mail, ArrowRight } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithOtp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signInWithOtp(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-white to-brand-50/30 px-4">
        <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 shadow-sm">
          <div className="rounded-full bg-brand-100 p-3 w-fit">
            <Mail className="h-6 w-6 text-brand-600" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-slate-900">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-surface-600">
            We sent a magic link to <strong>{email}</strong>. Click it to sign
            in.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-white to-brand-50/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">ParsePort</h1>
          <p className="mt-1 text-surface-600">Offer-to-Order Pipeline</p>
        </div>
        <div className="rounded-2xl border border-surface-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-surface-500">
            We’ll send you a magic link — no password needed.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-slate-900 placeholder-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
