'use client';

import { motion } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, Camera, CheckCircle, Loader2, MapPin, Settings, Sliders, Sparkles, User, X } from 'lucide-react';

type Units = 'metric' | 'imperial';
type Plan = 'Free' | 'Pro' | 'Enterprise';
type AccountType = 'Gardener' | 'Farmer' | 'Nursery' | 'Agribusiness';

interface SettingsSectionProps {
  user: any;
  settingsName: string;
  settingsLocation: string;
  settingsUnits: Units;
  settingsPlan: Plan;
  settingsAccountType: AccountType;
  settingsAvatarUrl: string;
  settingsError: string;
  settingsSuccess: string;
  settingsSaving: boolean;
  onNameChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onUnitsChange: (value: Units) => void;
  onPlanChange: (value: Plan) => void;
  onAccountTypeChange: (value: AccountType) => void;
  onAvatarChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

const accountTypes: Array<{ value: AccountType; label: string; detail: string }> = [
  { value: 'Gardener', label: 'Home Gardener', detail: 'Personal garden and house plants' },
  { value: 'Farmer', label: 'Commercial Farmer', detail: 'Fields, crops, and farm operations' },
  { value: 'Nursery', label: 'Nursery Operator', detail: 'Inventory, batches, and growing sites' },
  { value: 'Agribusiness', label: 'Agribusiness', detail: 'Portfolio-level crop health tracking' },
];

const plans: Plan[] = ['Free', 'Pro', 'Enterprise'];

function OrganizationSettingsCard() {
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/organizations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrgId(data.organization.id);
          setName(data.organization.name);
        } else {
          setError(data.error || 'Failed to load organization.');
        }
      })
      .catch(() => setError('Failed to load organization.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/organizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Organization name updated.');
      } else {
        setError(data.error || 'Failed to update organization.');
      }
    } catch {
      setError('Failed to update organization.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-sm font-bold text-stone-950 dark:text-slate-50">Organization Info</h2>
      </div>
      <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">
        The organization name shown across Multi-Farm Manager, Team &amp; Roles, and exported compliance reports.
      </p>

      {isLoading ? (
        <div className="mt-4 flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">Organization Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!orgId}
              className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/70 dark:focus:bg-slate-900"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving || !orgId}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            <span>Save</span>
          </button>
        </form>
      )}

      {(error || success) && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
          }`}
        >
          {error ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span>{error || success}</span>
        </div>
      )}
    </section>
  );
}

export default function SettingsSection({
  user,
  settingsName,
  settingsLocation,
  settingsUnits,
  settingsPlan,
  settingsAccountType,
  settingsAvatarUrl,
  settingsError,
  settingsSuccess,
  settingsSaving,
  onNameChange,
  onLocationChange,
  onUnitsChange,
  onPlanChange,
  onAccountTypeChange,
  onAvatarChange,
  onSubmit,
}: SettingsSectionProps) {
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => onAvatarChange(reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-950 dark:text-slate-50">Settings</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500 dark:text-slate-400">
            Update your profile, operation location, dashboard role, and measurement preferences.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{user.email}</span>
        </div>
      </div>

      {(settingsError || settingsSuccess) && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            settingsError
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
          }`}
        >
          {settingsError ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{settingsError || settingsSuccess}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-stone-100 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center">
            <img
              src={settingsAvatarUrl || user.avatarUrl}
              alt={settingsName || user.name}
              className="h-20 w-20 shrink-0 rounded-full border border-stone-200 bg-white object-cover dark:border-slate-700 dark:bg-slate-900"
              onError={(event) => {
                const img = event.target as HTMLImageElement;
                img.onerror = null;
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23d1fae5' rx='40'/%3E%3Ccircle cx='40' cy='30' r='13' fill='%23059669'/%3E%3Cellipse cx='40' cy='66' rx='23' ry='18' fill='%23059669'/%3E%3C/svg%3E";
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-stone-950 dark:text-slate-50">Profile Photo</p>
              <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-slate-400">
                This image is saved to your profile and shown in the dashboard header for every role.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                  <Camera className="h-4 w-4" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
                </label>
                {settingsAvatarUrl && settingsAvatarUrl !== user.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => onAvatarChange(user.avatarUrl || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Display Name
              </span>
              <input
                type="text"
                required
                value={settingsName}
                onChange={(event) => onNameChange(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/70 dark:focus:bg-slate-900"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Operation Location
              </span>
              <input
                type="text"
                required
                value={settingsLocation}
                onChange={(event) => onLocationChange(event.target.value)}
                className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/70 dark:focus:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-6">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">
              <Sliders className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Measurement System
            </span>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { value: 'metric' as Units, title: 'Metric', detail: 'Celsius, km/h, metric field readings' },
                { value: 'imperial' as Units, title: 'Imperial', detail: 'Fahrenheit, mph, imperial field readings' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onUnitsChange(option.value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    settingsUnits === option.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-sm dark:border-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-100'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-emerald-500/40 dark:hover:bg-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <span className="block text-sm font-bold">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 opacity-75">{option.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Plan Tier
              </span>
              <select
                value={settingsPlan}
                onChange={(event) => onPlanChange(event.target.value as Plan)}
                className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/70 dark:focus:bg-slate-900"
              >
                {plans.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                <Settings className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Operation Type
              </span>
              <select
                value={settingsAccountType}
                onChange={(event) => onAccountTypeChange(event.target.value as AccountType)}
                className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/70 dark:focus:bg-slate-900"
              >
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {settingsAccountType !== user.accountType && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Changing the operation type updates the dashboard navigation and role-specific labels. Existing plants, scans, and treatments remain saved.
            </div>
          )}

          <button
            type="submit"
            disabled={settingsSaving}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            <span>{settingsSaving ? 'Saving Settings...' : 'Save & Sync Settings'}</span>
          </button>
        </section>

        <aside className="self-start rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-stone-950 dark:text-slate-50">Current Workspace</h2>
          <div className="mt-4 space-y-3">
            {accountTypes.map((type) => (
              <div
                key={type.value}
                className={`rounded-xl border p-3 ${
                  settingsAccountType === type.value
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400/50 dark:bg-emerald-500/10'
                    : 'border-stone-100 bg-stone-50 dark:border-slate-800 dark:bg-slate-950/60'
                }`}
              >
                <p className="text-xs font-bold text-stone-900 dark:text-slate-100">{type.label}</p>
                <p className="mt-1 text-[11px] leading-4 text-stone-500 dark:text-slate-400">{type.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </form>

      {user.accountType === 'Agribusiness' && <OrganizationSettingsCard />}
    </motion.div>
  );
}
