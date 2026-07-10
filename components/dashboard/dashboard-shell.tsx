'use client';

import React from 'react';
import { Bell, LogOut, MapPin, Thermometer, Droplets, AlertTriangle, Sprout } from 'lucide-react';
import { ROLE_CONFIG, type DashboardTabConfig } from './role-config';

interface DashboardShellProps {
  user: any;
  activeTab: string;
  onTabChange: (tabId: DashboardTabConfig['id']) => void;
  weatherData: any;
  onToggleNotifDrawer: () => void;
  unreadCount: number;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  activeTab,
  onTabChange,
  weatherData,
  onToggleNotifDrawer,
  unreadCount,
  onLogout,
  children,
}: DashboardShellProps) {
  const roleConfig = ROLE_CONFIG[user.accountType as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.Gardener;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-800">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-stone-900 font-mono">AgriScan AI</span>
          <span className="hidden sm:inline px-2 py-0.5 bg-stone-100 text-[10px] text-stone-500 font-mono rounded border uppercase">
            {user.plan} Active {roleConfig.planBadgeLabel}
          </span>
        </div>

        {/* Localized Weather strip */}
        <div className="hidden lg:flex items-center space-x-6 text-xs text-stone-500 border-l border-r border-stone-200 px-6 mx-6">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold text-stone-800">{user.location}</span>
          </div>
          {weatherData && (
            <>
              <div className="flex items-center space-x-2">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                <span>Temp: <strong className="text-stone-800">{weatherData.current.temp}{weatherData.current.unit}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <span>Moisture: <strong className="text-stone-800">{weatherData.current.soilMoisture}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Blight Spore Risk: <strong className={`uppercase ${weatherData.current.blightRisk === 'High' ? 'text-red-600' : 'text-stone-700'}`}>{weatherData.current.blightRisk}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* User profile details, Notifications icon */}
        <div className="flex items-center space-x-4">
          {/* Notifications Trigger */}
          <button
            onClick={onToggleNotifDrawer}
            className="p-2 text-stone-500 hover:bg-stone-100 rounded-xl relative cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Meta info */}
          <div className="flex items-center space-x-3">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full border border-stone-200 object-cover bg-stone-100"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                // Generic user silhouette SVG — always renders, zero network dependency
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23d1fae5' rx='16'/%3E%3Ccircle cx='16' cy='12' r='5' fill='%23059669'/%3E%3Cellipse cx='16' cy='26' rx='9' ry='7' fill='%23059669'/%3E%3C/svg%3E";
              }}
            />
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-stone-900">{user.name}</p>
              <p className="text-stone-400 capitalize">{user.accountType}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Panel Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <nav className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-stone-200 p-4 flex flex-row md:flex-col space-y-0 md:space-y-1.5 overflow-x-auto md:overflow-x-visible">
          {roleConfig.tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide font-sans cursor-pointer transition-all whitespace-nowrap md:w-full ${isSelected ? (tab.accent ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-950') : 'text-stone-500 hover:bg-stone-50'}`}
              >
                <IconComponent className={`h-4.5 w-4.5 ${isSelected ? '' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Box */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
