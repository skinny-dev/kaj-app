import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import type { User } from "../types";
import * as api from "../services/api";

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (phone: string, otp: string, name?: string) => Promise<void>;
  logout: () => void;
  addAddress: (address: string) => Promise<void>;
  addAddressDetailed: (data: {
    address: string;
    details?: string;
    title?: string;
    phone?: string;
    isDefault?: boolean;
  }) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("kaj-token");
    if (token) {
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
      } catch (error: any) {
        console.warn(
          "[Auth] getCurrentUser failed, retrying once...",
          error?.message || error
        );
        // One quick retry in case of transient network/app restart after payment redirect
        try {
          await new Promise((r) => setTimeout(r, 700));
          const user2 = await api.getCurrentUser();
          setCurrentUser(user2);
        } catch (e: any) {
          const msg = String(e?.message || "");
          // Only clear token if it's clearly unauthorized (HTTP 401)
          if (/HTTP\s*401/i.test(msg)) {
            console.warn("[Auth] Unauthorized, clearing token");
            localStorage.removeItem("kaj-token");
            setCurrentUser(null);
          } else {
            console.warn(
              "[Auth] Non-auth error; keeping token for later retry"
            );
          }
        }
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const requestOtp = async (phone: string) => {
    await api.requestOtp(phone);
  };

  const login = async (phone: string, otp: string, name?: string) => {
    const result = await api.verifyOtp(phone, otp, name);
    if (!result) {
      throw new Error("OTP verification failed - no response from server");
    }
    const { token, user } = result;
    if (!token || !user) {
      throw new Error("OTP verification failed - invalid response format");
    }
    localStorage.setItem("kaj-token", token);
    setCurrentUser(user);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("kaj-token");
    localStorage.removeItem("kaj-mock-user");
    localStorage.removeItem("kaj-mock-orders");
  };

  const addAddress = async (address: string) => {
    if (currentUser) {
      const updatedUser = await api.addUserAddressSimple(address);
      setCurrentUser(updatedUser);
    }
  };

  const addAddressDetailed = async (data: {
    address: string;
    details?: string;
    title?: string;
    phone?: string;
    isDefault?: boolean;
  }) => {
    if (!currentUser) return;
    const payload = {
      title: data.title || "آدرس",
      // Merge details into address for backend persistence if separate field not supported
      address: data.details
        ? `${data.address} - ${data.details}`
        : data.address,
      phone: data.phone || currentUser.phone,
      isDefault:
        data.isDefault ?? (currentUser.addresses?.length ? false : true),
    };
    try {
      await api.addUserAddress(payload);
      const refreshed = await api.getCurrentUser();
      setCurrentUser(refreshed);
    } catch (e) {
      console.error("Failed to add detailed address", e);
      throw e;
    }
  };

  const updateName = async (name: string) => {
    if (currentUser) {
      const updatedUser = await api.updateUserName(name);
      if (!updatedUser) throw new Error("Failed to update user");
      setCurrentUser(updatedUser);
    }
  };

  const refreshUser = async () => {
    if (currentUser) {
      try {
        const updatedUser = await api.fetchCurrentUser();
        setCurrentUser(updatedUser);
      } catch (error) {
        console.error("Failed to refresh user data", error);
      }
    }
  };

  const value = {
    currentUser,
    isLoading,
    login,
    logout,
    addAddress,
    addAddressDetailed,
    updateName,
    requestOtp,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
