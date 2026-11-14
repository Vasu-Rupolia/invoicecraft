import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Building2,
  UserRound,
  Upload,
  Trash2,
  Save,
  Loader2,
  Camera,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import type { Business, User } from "../types";

type BusinessForm = {
  name: string;
  business_type: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  country: string;
  postal_code: string;
  gstin: string;
  currency: string;
  timezone: string;
  invoice_prefix: string;
  quotation_prefix: string;
};

type ProfileForm = {
  name: string;
  email: string;
};

const indianStates = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
];

const emptyBusinessForm: BusinessForm = {
  name: "",
  business_type: "freelancer",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  state_code: "",
  country: "India",
  postal_code: "",
  gstin: "",
  currency: "INR",
  timezone: "Asia/Kolkata",
  invoice_prefix: "INV",
  quotation_prefix: "QUO",
};

function assetUrl(path?: string | null): string | null {
  if (!path) return null;

  const apiBase = api.defaults.baseURL || "http://127.0.0.1:8001/api";
  const backendUrl = apiBase.replace(/\/api\/?$/, "");

  const imagePath = path.replace(
    /^https?:\/\/[^/]+\/storage\//i,
    "",
  );

  const normalizedPath = imagePath
    .replace(/^\/+/, "")
    .replace(/^storage\//, "");

  return `${backendUrl}/storage/${normalizedPath}`;
}

function getErrorMessage(error: unknown): string {
  const axiosError = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
    message?: string;
  };

  const errors = axiosError.response?.data?.errors;

  if (errors) {
    return Object.values(errors)[0]?.[0] || "Please check your details.";
  }

  return (
    axiosError.response?.data?.message ||
    axiosError.message ||
    "Something went wrong. Please try again."
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { activeBusiness, refreshBusinesses } = useBusiness();

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [businessForm, setBusinessForm] =
    useState<BusinessForm>(emptyBusinessForm);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    assetUrl(user?.avatar_path),
  );

  const [logoUrl, setLogoUrl] = useState<string | null>(
    assetUrl(activeBusiness?.logo_path || activeBusiness?.logo_url),
  );

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [businessMessage, setBusinessMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [businessError, setBusinessError] = useState("");

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
    });

    setAvatarUrl(assetUrl(user?.avatar_path));
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      if (!activeBusiness?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setBusinessError("");

      try {
        const response = await api.get(
          `/businesses/${activeBusiness.id}/profile`,
        );

        if (cancelled) return;

        const business: Business = response.data.business;

        setBusinessForm({
          name: business.name || "",
          business_type: business.business_type || "freelancer",
          email: business.email || "",
          phone: business.phone || "",
          address: business.address || "",
          city: business.city || "",
          state: business.state || "",
          state_code: business.state_code || "",
          country: business.country || "India",
          postal_code: business.postal_code || "",
          gstin: business.gstin || "",
          currency: business.currency || "INR",
          timezone: business.timezone || "Asia/Kolkata",
          invoice_prefix: business.invoice_prefix || "INV",
          quotation_prefix: business.quotation_prefix || "QUO",
        });

        setLogoUrl(
          assetUrl(business.logo_path || business.logo_url),
        );
      } catch (error) {
        if (!cancelled) {
          setBusinessError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setProfileMessage("");
    setProfileError("");

    event.target.value = "";
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setBusinessMessage("");
    setBusinessError("");

    event.target.value = "";
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const formData = new FormData();

      formData.append("name", profileForm.name);
      formData.append("email", profileForm.email);

      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await api.post("/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser: User = response.data.user;

      updateUser(updatedUser);

      setAvatarUrl(assetUrl(updatedUser.avatar_path));
      setAvatarFile(null);
      setAvatarPreview(null);

      setProfileMessage("Your profile has been updated successfully.");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleBusinessSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeBusiness?.id) return;

    setSavingBusiness(true);
    setBusinessError("");
    setBusinessMessage("");

    try {
      const formData = new FormData();

      Object.entries(businessForm).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await api.post(
        `/businesses/${activeBusiness.id}/profile`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const updatedBusiness: Business = response.data.business;

      setBusinessForm((current) => ({
        ...current,
        state: updatedBusiness.state || current.state,
        state_code: updatedBusiness.state_code || current.state_code,
      }));

      setLogoUrl(
        assetUrl(updatedBusiness.logo_path || updatedBusiness.logo_url),
      );

      setLogoFile(null);
      setLogoPreview(null);

      await refreshBusinesses();

      setBusinessMessage("Business profile has been updated successfully.");
    } catch (error) {
      setBusinessError(getErrorMessage(error));
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl && !avatarFile) return;

    setRemovingAvatar(true);
    setProfileError("");
    setProfileMessage("");

    try {
      if (avatarFile) {
        setAvatarFile(null);
        setAvatarPreview(null);
      } else {
        const response = await api.delete("/profile/avatar");

        updateUser(response.data.user);
        setAvatarUrl(null);
        setAvatarPreview(null);
      }

      setProfileMessage("Profile photo removed.");
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!activeBusiness?.id) return;

    setRemovingLogo(true);
    setBusinessError("");
    setBusinessMessage("");

    try {
      if (logoFile) {
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        const response = await api.delete(
          `/businesses/${activeBusiness.id}/profile/logo`,
        );

        setLogoUrl(
          assetUrl(
            response.data.business.logo_path ||
            response.data.business.logo_url,
          ),
        );

        await refreshBusinesses();
      }

      setBusinessMessage("Business logo removed.");
    } catch (error) {
      setBusinessError(getErrorMessage(error));
    } finally {
      setRemovingLogo(false);
    }
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

  const handleStateChange = (stateCode: string) => {
    const selectedState = indianStates.find(
      (state) => state.code === stateCode,
    );

    setBusinessForm((current) => ({
      ...current,
      state_code: stateCode,
      state: selectedState?.name || "",
    }));

    setBusinessError("");
    setBusinessMessage("");
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-indigo-600">PREFERENCES</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage your personal profile and business information.
        </p>
      </div>

      {/* Business profile */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Business profile</h2>
            <p className="text-sm text-slate-500">
              Details displayed on your invoices and quotations.
            </p>
          </div>
        </div>

        <form onSubmit={handleBusinessSave}>
          <div className="space-y-6 p-6">
            {businessError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {businessError}
              </div>
            )}

            {businessMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {businessMessage}
              </div>
            )}

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                {logoPreview || logoUrl ? (
                  <img
                    src={logoPreview || logoUrl || ""}
                    alt="Business logo"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <Building2 className="h-9 w-9 text-slate-300" />
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Business logo
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG or WebP. Maximum file size 4 MB.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Upload size={15} />
                    Upload logo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>

                  {(logoUrl || logoFile) && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={removingLogo}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingLogo ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <InputField
                label="Business name *"
                value={businessForm.name}
                onChange={(value) => updateBusinessField("name", value)}
              />

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

              <InputField
                label="Business email"
                type="email"
                value={businessForm.email}
                onChange={(value) => updateBusinessField("email", value)}
              />

              <InputField
                label="Phone"
                value={businessForm.phone}
                onChange={(value) => updateBusinessField("phone", value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Address
              </label>
              <textarea
                rows={3}
                value={businessForm.address}
                onChange={(event) =>
                  updateBusinessField("address", event.target.value)
                }
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <InputField
                label="City"
                value={businessForm.city}
                onChange={(value) => updateBusinessField("city", value)}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  State *
                </label>
                <select
                  required
                  value={businessForm.state_code}
                  onChange={(event) => handleStateChange(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select state</option>
                  {indianStates.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>
              </div>

              <InputField
                label="Country"
                value={businessForm.country}
                onChange={(value) => updateBusinessField("country", value)}
              />

              <InputField
                label="Postal code"
                value={businessForm.postal_code}
                onChange={(value) => updateBusinessField("postal_code", value)}
              />

              <InputField
                label="GSTIN"
                value={businessForm.gstin}
                maxLength={15}
                onChange={(value) =>
                  updateBusinessField("gstin", value.toUpperCase())
                }
              />

              <InputField
                label="Currency"
                value={businessForm.currency}
                maxLength={3}
                onChange={(value) =>
                  updateBusinessField("currency", value.toUpperCase())
                }
              />

              <InputField
                label="Invoice prefix"
                value={businessForm.invoice_prefix}
                onChange={(value) =>
                  updateBusinessField("invoice_prefix", value)
                }
              />

              <InputField
                label="Quotation prefix"
                value={businessForm.quotation_prefix}
                onChange={(value) =>
                  updateBusinessField("quotation_prefix", value)
                }
              />

              <div className="sm:col-span-2">
                <InputField
                  label="Timezone"
                  value={businessForm.timezone}
                  onChange={(value) =>
                    updateBusinessField("timezone", value)
                  }
                  placeholder="Asia/Kolkata"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Your business state is used to determine whether GST is
              calculated as CGST + SGST or IGST.
            </p>
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="submit"
              disabled={
                savingBusiness ||
                !businessForm.name.trim() ||
                !businessForm.state_code
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingBusiness ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save business profile
            </button>
          </div>
        </form>
      </section>

      {/* Personal profile */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <UserRound size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Personal profile</h2>
            <p className="text-sm text-slate-500">
              Your account details and profile photo.
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSave}>
          <div className="space-y-6 p-6">
            {profileError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {profileError}
              </div>
            )}

            {profileMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {profileMessage}
              </div>
            )}

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-indigo-50 text-2xl font-bold text-indigo-600">
                {avatarPreview || avatarUrl ? (
                  <img
                    src={avatarPreview || avatarUrl || ""}
                    alt="Your profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Profile photo
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG or WebP. Maximum file size 4 MB.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Camera size={15} />
                    Upload photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>

                  {(avatarUrl || avatarFile) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={removingAvatar}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingAvatar ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <InputField
                label="Full name"
                value={profileForm.name}
                onChange={(value) =>
                  setProfileForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
              />

              <InputField
                label="Email address"
                type="email"
                value={profileForm.email}
                onChange={(value) =>
                  setProfileForm((current) => ({
                    ...current,
                    email: value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="submit"
              disabled={
                savingProfile ||
                !profileForm.name.trim() ||
                !profileForm.email.trim()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save personal profile
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}