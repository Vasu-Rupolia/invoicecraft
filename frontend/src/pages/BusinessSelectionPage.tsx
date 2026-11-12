import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Loader2, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";

export default function BusinessSelectionPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { businesses, selectBusiness } = useBusiness();

  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleSelect = async (businessId: number) => {
    const business = businesses.find((item) => item.id === businessId);
    if (!business) return;

    setSelectingId(businessId);
    setError("");

    try {
      await selectBusiness(business);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Unable to select this workspace. Please try again.");
    } finally {
      setSelectingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Building2 className="h-6 w-6" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-slate-900">
          Choose your workspace
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Select the business you want to manage.
        </p>

        <div className="mt-6 space-y-3">
          {businesses.map((business) => (
            <button
              key={business.id}
              onClick={() => handleSelect(business.id)}
              disabled={selectingId !== null}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {business.name}
                </p>
                <p className="mt-1 text-xs capitalize text-slate-500">
                  {business.business_type?.replace("_", " ")}
                </p>
              </div>

              {selectingId === business.id ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              ) : (
                <ArrowRight className="h-5 w-5 text-slate-400" />
              )}
            </button>
          ))}
        </div>

        {businesses.length === 0 && (
          <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            No active business workspaces were found for this account.
          </p>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleLogout}
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}