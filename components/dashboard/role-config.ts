import { CloudSun, Sprout, Camera, Heart, Users, Settings, type Icon } from 'lucide-react';
import type { AccountType } from '@/types/domain';

export interface DashboardTabConfig {
  id: 'dashboard' | 'plants' | 'scan' | 'treatments' | 'community' | 'settings';
  label: string;
  icon: Icon;
  accent?: boolean;
}

export interface RoleConfig {
  tabs: DashboardTabConfig[];
  overviewTitle: string;
  overviewSubtitle: string;
  /** What a `farms` row is called for this role - "My Garden", "Field/Plot", "Site", "Location". */
  locationLabel: string;
  planBadgeLabel: string;
}

export const ROLE_CONFIG: Record<AccountType, RoleConfig> = {
  Gardener: {
    tabs: [
      { id: 'dashboard', label: 'My Garden', icon: CloudSun },
      { id: 'plants', label: 'My Plants', icon: Sprout },
      { id: 'scan', label: 'Plant Doctor', icon: Camera, accent: true },
      { id: 'treatments', label: 'Care Plans', icon: Heart },
      { id: 'community', label: 'Community', icon: Users },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    overviewTitle: 'Welcome back to your garden 🌱',
    overviewSubtitle: "Here's how your plants are doing today.",
    locationLabel: 'My Garden',
    planBadgeLabel: 'Plan',
  },
  Farmer: {
    tabs: [
      { id: 'dashboard', label: 'Operations', icon: CloudSun },
      { id: 'plants', label: 'Fields & Crops', icon: Sprout },
      { id: 'scan', label: 'Crop Diagnostics', icon: Camera, accent: true },
      { id: 'treatments', label: 'Treatment Plans', icon: Heart },
      { id: 'community', label: 'Community', icon: Users },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    overviewTitle: 'Farm Operations Overview',
    overviewSubtitle: "Today's field conditions and crop health at a glance.",
    locationLabel: 'Field / Plot',
    planBadgeLabel: 'Plan',
  },
  Nursery: {
    tabs: [
      { id: 'dashboard', label: 'Inventory Snapshot', icon: CloudSun },
      { id: 'plants', label: 'Stock', icon: Sprout },
      { id: 'scan', label: 'Health Check', icon: Camera, accent: true },
      { id: 'treatments', label: 'Treatment Plans', icon: Heart },
      { id: 'community', label: 'Community', icon: Users },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    overviewTitle: 'Inventory Snapshot',
    overviewSubtitle: 'Current stock health across your growing sites.',
    locationLabel: 'Site',
    planBadgeLabel: 'Plan',
  },
  Agribusiness: {
    tabs: [
      { id: 'dashboard', label: 'Portfolio Overview', icon: CloudSun },
      { id: 'plants', label: 'Crop Portfolio', icon: Sprout },
      { id: 'scan', label: 'Diagnostics', icon: Camera, accent: true },
      { id: 'treatments', label: 'Treatment Plans', icon: Heart },
      { id: 'community', label: 'Community', icon: Users },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    overviewTitle: 'Portfolio Overview',
    overviewSubtitle: 'Aggregated performance across all locations.',
    locationLabel: 'Location',
    planBadgeLabel: 'Plan',
  },
};
