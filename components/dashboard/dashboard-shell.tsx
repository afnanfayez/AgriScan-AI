'use client';

import React, { useEffect, useState } from 'react';
import { Bell, LogOut, MapPin, Thermometer, Droplets, AlertTriangle, Sprout, X } from 'lucide-react';
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const roleConfig = ROLE_CONFIG[user.accountType as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.Gardener;

  useEffect(() => {
    const storedTheme = localStorage.getItem('agriscan.theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem('agriscan.theme', nextMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextMode);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-4 md:px-6 md:py-4 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="shrink-0 p-1.5 bg-emerald-600 rounded-lg text-white">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="truncate text-base font-semibold tracking-tight text-stone-900 sm:text-lg dark:text-slate-50">AgriScan AI</span>
          <span className="hidden sm:inline px-2 py-0.5 bg-stone-100 text-[10px] text-stone-500 font-semibold rounded border uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {user.plan} Active {roleConfig.planBadgeLabel}
          </span>
        </div>

        {/* Localized Weather strip */}
        <div className="hidden xl:flex items-center space-x-6 text-xs text-stone-500 border-l border-r border-stone-200 px-6 mx-6 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span className="font-semibold text-stone-800 dark:text-slate-100">{weatherData?.resolvedLocation || user.location}</span>
          </div>
          {weatherData && (
            <>
              <div className="flex items-center space-x-2">
                <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                <span>Temp: <strong className="text-stone-800 dark:text-slate-100">{weatherData.current.temp}{weatherData.current.unit}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <Droplets className="h-3.5 w-3.5 text-blue-500" />
                <span>Moisture: <strong className="text-stone-800 dark:text-slate-100">{weatherData.current.soilMoisture}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>Blight Spore Risk: <strong className={`uppercase ${weatherData.current.blightRisk === 'High' ? 'text-red-600 dark:text-red-400' : 'text-stone-700 dark:text-slate-200'}`}>{weatherData.current.blightRisk}</strong></span>
              </div>
            </>
          )}
        </div>

        {/* User profile details, Notifications icon */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <button
            onClick={toggleDarkMode}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs font-semibold text-stone-600 shadow-sm hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <span className={`h-4 w-4 rounded-full border ${isDarkMode ? 'border-amber-300 bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.45)]' : 'border-slate-400 bg-slate-800'}`} />
            <span className="hidden sm:inline">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={() => setIsMobileNavOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-stone-600 hover:bg-stone-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            title="Open navigation"
            aria-expanded={isMobileNavOpen}
          >
            {isMobileNavOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <span className="flex h-5 w-5 flex-col justify-center gap-1" aria-hidden="true">
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
                <span className="h-0.5 rounded-full bg-current" />
              </span>
            )}
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onToggleNotifDrawer}
            className="p-2 text-stone-500 hover:bg-stone-100 rounded-xl relative cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Meta info */}
          <div className="hidden items-center space-x-3 sm:flex">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-8 w-8 rounded-full border border-stone-200 object-cover bg-stone-100 dark:border-slate-700 dark:bg-slate-800"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                // Generic user silhouette SVG — always renders, zero network dependency
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23d1fae5' rx='16'/%3E%3Ccircle cx='16' cy='12' r='5' fill='%23059669'/%3E%3Cellipse cx='16' cy='26' rx='9' ry='7' fill='%23059669'/%3E%3C/svg%3E";
              }}
            />
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-stone-900 dark:text-slate-100">{user.name}</p>
              <p className="text-stone-400 capitalize dark:text-slate-500">{user.accountType}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        </div>
      </header>

      {isMobileNavOpen && (
        <div className="sticky top-[57px] z-30 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-stone-200 bg-white/95 p-3 shadow-sm backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <nav className="grid grid-cols-2 gap-2">
            {roleConfig.tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setIsMobileNavOpen(false);
                  }}
                  className={`flex min-h-12 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-all sm:px-3 sm:text-sm ${isSelected ? (tab.accent ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-200') : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50'}`}
                >
                  <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? '' : 'text-stone-400 dark:text-slate-500'}`} />
                  <span className="min-w-0 leading-tight line-clamp-2">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Panel Body */}
      <div className="flex-1 flex md:flex-row">
        {/* Sidebar Navigation */}
        <nav className="hidden w-64 shrink-0 border-r border-stone-200 bg-white p-4 md:flex md:flex-col md:space-y-1.5 lg:w-72 dark:border-slate-800 dark:bg-slate-950">
          {roleConfig.tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-semibold tracking-wide transition-all duration-200 lg:px-4 lg:text-[15px] ${isSelected ? (tab.accent ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-200') : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}`}
              >
                <IconComponent className={`h-4.5 w-4.5 shrink-0 ${isSelected ? '' : 'text-stone-400 dark:text-slate-500'}`} />
                <span className="min-w-0 whitespace-normal leading-snug">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Box */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-5 md:p-6 xl:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
