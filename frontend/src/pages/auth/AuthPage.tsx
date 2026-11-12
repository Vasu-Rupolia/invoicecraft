import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  FileText,
  Lock,
  Mail,
  ReceiptText,
  Sparkles,
  TrendingUp,
  User,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { RegisterPayload } from "../../types";

type AuthPageProps = {
  mode: "login" | "register";
};

export default function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<RegisterPayload>({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    business_name: "",
    business_type: "freelancer",
  });

  const updateForm = (field: keyof RegisterPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const response = (
        err as {
          response?: {
            data?: {
              message?: string;
              errors?: Record<string, string[]>;
            };
          };
        }
      ).response;

      const validationErrors = response?.data?.errors;

      setError(
        validationErrors
          ? Object.values(validationErrors).flat().join(" ")
          : response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isRegister = mode === "register";

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
            <ReceiptText className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            InvoiceCraft
          </span>
        </div>

        <div className="relative max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-indigo-200">
            <Sparkles className="h-4 w-4" />
            Invoicing, made effortless
          </div>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Your business deserves
            <span className="text-indigo-400"> better paperwork.</span>
          </h1>

          <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
            Create professional invoices, manage customers, track payments
            and grow your business — all in one place.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <FileText className="mb-4 h-6 w-6 text-indigo-400" />
              <p className="font-medium">Smart invoicing</p>
              <p className="mt-1 text-sm text-slate-400">
                Professional invoices in minutes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <TrendingUp className="mb-4 h-6 w-6 text-indigo-400" />
              <p className="font-medium">Business insights</p>
              <p className="mt-1 text-sm text-slate-400">
                Keep track of your cash flow.
              </p>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-slate-500">
          © 2026 InvoiceCraft. Built for businesses that move forward.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ReceiptText className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold">InvoiceCraft</span>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
              {isRegister ? "Get started" : "Welcome back"}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {isRegister ? "Create your account" : "Sign in to your account"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isRegister
                ? "Set up your account and create your first business workspace."
                : "Enter your details to access your workspace."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {isRegister && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Your name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      required
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      required
                      value={form.business_name}
                      onChange={(e) =>
                        updateForm("business_name", e.target.value)
                      }
                      placeholder="Your business name"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business type
                  </label>
                  <select
                    value={form.business_type}
                    onChange={(e) =>
                      updateForm("business_type", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="small_business">Small business</option>
                    <option value="agency">Agency</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password_confirmation}
                    onChange={(e) =>
                      updateForm("password_confirmation", e.target.value)
                    }
                    placeholder="Enter password again"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isRegister ? "Create account" : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isRegister ? "Sign in" : "Create account"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}