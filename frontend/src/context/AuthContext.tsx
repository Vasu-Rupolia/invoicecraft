import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import api from "../services/api";
import type { User, RegisterPayload } from "../types";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("invoicecraft_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get("/me");
        setUser(response.data.user);
      } catch {
        localStorage.removeItem("invoicecraft_token");
        localStorage.removeItem("invoicecraft_business_id");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post("/login", { email, password });

    localStorage.setItem("invoicecraft_token", response.data.token);
    setUser(response.data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await api.post("/register", payload);

    localStorage.setItem("invoicecraft_token", response.data.token);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } finally {
      localStorage.removeItem("invoicecraft_token");
      localStorage.removeItem("invoicecraft_business_id");
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}