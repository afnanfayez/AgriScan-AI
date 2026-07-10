'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FarmField, PlantCrop, NotificationItem, AccountType } from '@/types/domain';

export type { FarmField, PlantCrop, NotificationItem, AccountType };

interface OnboardChoices {
  accountType?: AccountType;
  location?: string;
  units?: 'metric' | 'imperial';
  plan?: 'Free' | 'Pro' | 'Enterprise';
  firstFarmName?: string;
}

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedPlantId: string | null;
  setSelectedPlantId: (id: string | null) => void;
  farms: FarmField[];
  plants: PlantCrop[];
  notifications: NotificationItem[];
  unreadCount: number;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, accountType: AccountType) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  onboard: (choices: OnboardChoices) => Promise<{ success: boolean; error?: string }>;
  refreshAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  verifyEmail: (code: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationCode: (email?: string) => Promise<{ success: boolean; error?: string; devCode?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyResetCode: (email: string, code: string) => Promise<{ success: boolean; error?: string; verifiedToken?: string }>;
  confirmPasswordReset: (email: string, verifiedToken: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  
  const [farms, setFarms] = useState<FarmField[]>([]);
  const [plants, setPlants] = useState<PlantCrop[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refreshAll = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      
      if (meData.authenticated && meData.user) {
        setUser(meData.user);
        
        // Fetch child resources
        const [farmsRes, plantsRes, notifsRes] = await Promise.all([
          fetch('/api/farms'),
          fetch('/api/plants'),
          fetch('/api/notifications')
        ]);

        const [farmsData, plantsData, notifsData] = await Promise.all([
          farmsRes.json(),
          plantsRes.json(),
          notifsRes.json()
        ]);

        if (farmsData.success) setFarms(farmsData.farms);
        if (plantsData.success) setPlants(plantsData.plants);
        if (notifsData.success) setNotifications(notifsData.notifications);
      } else {
        setUser(null);
        setFarms([]);
        setPlants([]);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      refreshAll();
    }, 0);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        await refreshAll();
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  const signup = async (email: string, password: string, name: string, accountType: AccountType) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, accountType }),
      });
      const data = await res.json();
      // Signup only sends an OTP email — the account doesn't exist yet, so
      // there's no user/session to hydrate until /api/auth/verify succeeds.
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Signup failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setFarms([]);
      setPlants([]);
      setNotifications([]);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const onboard = async (choices: OnboardChoices) => {
    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(choices),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        await refreshAll();
        return { success: true };
      }
      return { success: false, error: data.error || 'Onboarding failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  const refreshNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  };

  const verifyEmail = async (code: string, email?: string) => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshAll();
        return { success: true };
      }
      return { success: false, error: data.error || 'Verification failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  const resendVerificationCode = async (email?: string) => {
    try {
      const res = await fetch('/api/auth/verify/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, devCode: data.devCode };
      }
      return { success: false, error: data.error || 'Failed to resend code' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'Password reset request failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  /** Step 2: validate OTP only — returns verifiedToken for confirm step */
  const verifyResetCode = async (email: string, code: string) => {
    try {
      const res = await fetch('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, verifiedToken: data.verifiedToken };
      }
      return { success: false, error: data.error || 'Invalid or expired code' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  /** Step 3: set new password using verifiedToken — auto-logs user in */
  const confirmPasswordReset = async (email: string, verifiedToken: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verifiedToken, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refresh user state so they land on dashboard automatically
        await refreshAll();
        return { success: true };
      }
      return { success: false, error: data.error || 'Password reset confirmation failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        activeTab,
        setActiveTab,
        selectedPlantId,
        setSelectedPlantId,
        farms,
        plants,
        notifications,
        unreadCount,
        login,
        signup,
        logout,
        onboard,
        refreshAll,
        refreshNotifications,
        markAllNotificationsRead,
        verifyEmail,
        resendVerificationCode,
        requestPasswordReset,
        verifyResetCode,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
