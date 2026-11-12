import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import type { Business } from "../types";

type BusinessContextType = {
  businesses: Business[];
  activeBusiness: Business | null;
  loading: boolean;
  selectBusiness: (business: Business) => Promise<void>;
  refreshBusinesses: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(
  undefined
);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshBusinesses = useCallback(async () => {
    if (!user) {
      setBusinesses([]);
      setActiveBusiness(null);
      return;
    }

    setLoading(true);

    try {
      const response = await api.get("/businesses");

      const availableBusinesses: Business[] =
        response.data.businesses || [];

      setBusinesses(availableBusinesses);

      const savedBusinessId = Number(
        localStorage.getItem("invoicecraft_business_id")
      );

      const selected =
        availableBusinesses.find(
          (business) => business.id === savedBusinessId
        ) ||
        (availableBusinesses.length === 1
          ? availableBusinesses[0]
          : null);

      if (selected) {
        setActiveBusiness(selected);
        localStorage.setItem(
          "invoicecraft_business_id",
          String(selected.id)
        );
      } else {
        setActiveBusiness(null);
        localStorage.removeItem("invoicecraft_business_id");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshBusinesses().catch(() => {
      setBusinesses([]);
      setActiveBusiness(null);
    });
  }, [refreshBusinesses]);

  const selectBusiness = useCallback(async (business: Business) => {
    await api.post(`/businesses/${business.id}/switch`);

    localStorage.setItem(
      "invoicecraft_business_id",
      String(business.id)
    );

    setActiveBusiness(business);
  }, []);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        loading,
        selectBusiness,
        refreshBusinesses,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);

  if (!context) {
    throw new Error("useBusiness must be used inside BusinessProvider");
  }

  return context;
}