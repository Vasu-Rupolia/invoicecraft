import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ReceiptText,
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  ChevronDown,
  Check,
  Plus,
  X,
  Building2,
  Loader2,
  Settings,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";

type BusinessForm = {
  name: string;
  business_type: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  gstin: string;
};

const initialBusinessForm: BusinessForm = {
  name: "",
  business_type: "freelancer",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  postal_code: "",
  gstin: "",
};

function getImageUrl(path?: string | null) {
  if (!path) return null;

  const apiBase = api.defaults.baseURL || "http://127.0.0.1:8001/api";
  const backendUrl = apiBase.replace(/\/api\/?$/, "");

  // Agar Laravel ne complete URL diya hai, tab bhi correct backend use karo.
  const imagePath = path.replace(/^https?:\/\/[^/]+\/storage\//i, "");

  const normalizedPath = imagePath
    .replace(/^\/+/, "")
    .replace(/^storage\//, "");

  return `${backendUrl}/storage/${normalizedPath}`;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const {
    businesses,
    activeBusiness,
    selectBusiness,
    refreshBusinesses,
  } = useBusiness();

  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [businessForm, setBusinessForm] =
    useState<BusinessForm>(initialBusinessForm);

  const [businessError, setBusinessError] = useState("");

  const navigation = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Invoices", path: "/invoices", icon: FileText },
    { label: "Quotations", path: "/quotations", icon: ReceiptText },
    { label: "Customers", path: "/customers", icon: Users },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  // Supports both avatar_url and avatar_path.
  const avatarUrl = getImageUrl(user?.avatar_path);

    console.log("LOGGED IN USER:", user);
    console.log("AVATAR PATH:", user?.avatar_path);
    console.log("AVATAR URL:", user?.avatar_url);
    console.log("FINAL IMAGE URL:", avatarUrl);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleBusinessChange = async (businessId: number) => {
    const business = businesses.find((item) => item.id === businessId);

    if (!business) return;

    try {
      await selectBusiness(business);
      setShowBusinessMenu(false);
      navigate("/dashboard");
    } catch {
      // Keep the current workspace if switching fails.
    }
  };

  const openAddBusiness = () => {
    setBusinessForm(initialBusinessForm);
    setBusinessError("");
    setShowBusinessMenu(false);
    setShowAddBusiness(true);
  };

  const closeAddBusiness = () => {
    if (creatingBusiness) return;

    setShowAddBusiness(false);
    setBusinessError("");
  };

  const updateBusinessField = (
    field: keyof BusinessForm,
    value: string,
  ) => {
    setBusinessForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateBusiness = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setBusinessError("");
    setCreatingBusiness(true);

    try {
      const response = await api.post("/businesses", businessForm);

      const newBusiness = response.data.business;

      if (!newBusiness?.id) {
        throw new Error("Business was created but its ID was not returned.");
      }

      localStorage.setItem(
        "invoicecraft_business_id",
        String(newBusiness.id),
      );

      await refreshBusinesses();

      setShowAddBusiness(false);
      setBusinessForm(initialBusinessForm);

      navigate("/dashboard");
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
            errors?: Record<string, string[]>;
          };
        };
        message?: string;
      };

      const validationErrors = axiosError.response?.data?.errors;

      if (validationErrors) {
        const firstError = Object.values(validationErrors)[0]?.[0];
        setBusinessError(firstError || "Please check the entered details.");
      } else {
        setBusinessError(
          axiosError.response?.data?.message ||
            axiosError.message ||
            "Unable to create business. Please try again.",
        );
      }
    } finally {
      setCreatingBusiness(false);
    }
  };

  const handleOpenSettings = () => {
    setShowProfileMenu(false);
    navigate("/settings");
  };

  const renderAvatar = (size: "header" | "menu" = "header") => {
    const sizeClass = size === "header" ? "h-10 w-10" : "h-10 w-10";

    return (
      <div
        className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-indigo-100 text-sm font-bold text-indigo-700`}
      >
        {avatarUrl && !avatarFailed ? (
          <img
            src={avatarUrl}
            alt={user?.name || "Profile"}
            className="h-full w-full object-cover"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          user?.name?.charAt(0).toUpperCase() || "U"
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <Link
          to="/dashboard"
          className="flex h-20 items-center gap-3 border-b border-slate-100 px-6"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ReceiptText className="h-6 w-6" />
          </div>

          <span className="text-xl font-semibold tracking-tight text-slate-900">
            InvoiceCraft
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    isActive
                      ? "bg-indigo-50 font-semibold text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur lg:px-10">
          {/* Business selector */}
          <div>
            <p className="text-xs font-medium text-slate-400">
              WORKSPACE
            </p>

            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => {
                  setShowBusinessMenu((current) => !current);
                  setShowProfileMenu(false);
                }}
                className="flex max-w-[220px] items-center gap-2 text-sm font-semibold text-slate-900"
              >
                <span className="truncate">
                  {activeBusiness?.name || "Select business"}
                </span>

                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>

              {showBusinessMenu && (
                <div className="absolute left-0 top-9 z-30 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your businesses
                  </p>

                  {businesses.map((business) => (
                    <button
                      type="button"
                      key={business.id}
                      onClick={() => handleBusinessChange(business.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{business.name}</span>
                      </span>

                      {business.id === activeBusiness?.id && (
                        <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                      )}
                    </button>
                  ))}

                  <div className="my-2 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={openAddBusiness}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="h-4 w-4" />
                    Add another business
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu((current) => !current);
                setShowBusinessMenu(false);
              }}
              className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-50"
            >
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>

              {renderAvatar("header")}

              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-14 z-40 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-4">
                  <div className="flex items-center gap-3">
                    {renderAvatar("menu")}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserRound className="h-4 w-4 text-slate-400" />
                    Profile & Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <Outlet />
        </main>
      </div>

      {/* Add Business Modal */}
      {showAddBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Add a business
                  </h2>
                  <p className="text-sm text-slate-500">
                    Create another workspace in InvoiceCraft.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAddBusiness}
                disabled={creatingBusiness}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness}>
              <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
                {businessError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {businessError}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Business name <span className="text-red-500">*</span>
                  </label>

                  <input
                    required
                    maxLength={255}
                    value={businessForm.name}
                    onChange={(event) =>
                      updateBusinessField("name", event.target.value)
                    }
                    placeholder="e.g. VNK Lifestyle"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Business type
                  </label>

                  <select
                    value={businessForm.business_type}
                    onChange={(event) =>
                      updateBusinessField("business_type", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="freelancer">Freelancer</option>
                    <option value="retail">Retail</option>
                    <option value="services">Services</option>
                    <option value="agency">Agency</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      maxLength={255}
                      value={businessForm.email}
                      onChange={(event) =>
                        updateBusinessField("email", event.target.value)
                      }
                      placeholder="business@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Phone
                    </label>

                    <input
                      type="tel"
                      maxLength={30}
                      value={businessForm.phone}
                      onChange={(event) =>
                        updateBusinessField("phone", event.target.value)
                      }
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Address
                  </label>

                  <textarea
                    rows={2}
                    value={businessForm.address}
                    onChange={(event) =>
                      updateBusinessField("address", event.target.value)
                    }
                    placeholder="Street address, building, area..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      City
                    </label>

                    <input
                      maxLength={100}
                      value={businessForm.city}
                      onChange={(event) =>
                        updateBusinessField("city", event.target.value)
                      }
                      placeholder="City"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      State
                    </label>

                    <input
                      maxLength={100}
                      value={businessForm.state}
                      onChange={(event) =>
                        updateBusinessField("state", event.target.value)
                      }
                      placeholder="State"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Country
                    </label>

                    <input
                      maxLength={100}
                      value={businessForm.country}
                      onChange={(event) =>
                        updateBusinessField("country", event.target.value)
                      }
                      placeholder="Country"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Postal code
                    </label>

                    <input
                      maxLength={20}
                      value={businessForm.postal_code}
                      onChange={(event) =>
                        updateBusinessField("postal_code", event.target.value)
                      }
                      placeholder="Postal code"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    GSTIN
                  </label>

                  <input
                    maxLength={15}
                    value={businessForm.gstin}
                    onChange={(event) =>
                      updateBusinessField(
                        "gstin",
                        event.target.value.toUpperCase(),
                      )
                    }
                    placeholder="15-character GSTIN"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeAddBusiness}
                  disabled={creatingBusiness}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingBusiness || !businessForm.name.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingBusiness ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create business
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}