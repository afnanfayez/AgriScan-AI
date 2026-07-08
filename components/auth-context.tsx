'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
// Types matching the Supabase schema (previously imported from the legacy lib/db local file)
export interface FarmField {
  id: string;
  name: string;
  userId: string;
  zoneCount: number;
  createdAt: string;
}

export interface PlantCrop {
  id: string;
  name: string;
  type: string;
  plantingDate: string;
  healthStatus: 'Healthy' | 'Warning' | 'Critical';
  photoUrl: string;
  farmId: string;
  userId: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'Scan' | 'Treatment' | 'Alert' | 'Community' | 'System';
  read: boolean;
  createdAt: string;
}

interface OnboardChoices {
  accountType?: 'Gardener' | 'Farmer' | 'Nursery' | 'Agribusiness';
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
  signup: (email: string, password: string, name: string, accountType: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  onboard: (choices: OnboardChoices) => Promise<{ success: boolean; error?: string }>;
  refreshAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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

  const signup = async (email: string, password: string, name: string, accountType: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, accountType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        await refreshAll();
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
