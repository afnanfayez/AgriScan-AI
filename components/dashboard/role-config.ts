import {
  CloudSun, Sprout, Camera, Heart, Users, Settings, type Icon,
  Map, ChartLine, Droplets, ClipboardList,
  Boxes, ShieldCheck, Truck, ChartPie,
} from 'lucide-react';
import type { AccountType } from '@/types/domain';

export interface DashboardTabConfig {
  id:
    | 'dashboard' | 'plants' | 'scan' | 'treatments' | 'community' | 'settings'
    // Commercial Farmer
    | 'fieldmap' | 'analytics' | 'irrigation' | 'labor'
    // Nursery Operator
    | 'batches' | 'grading' | 'orders' | 'reports';
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
      { id: 'dashboard', label: 'Farm Overview', icon: CloudSun },
      { id: 'fieldmap', label: 'Field Map', icon: Map },
      { id: 'scan', label: 'Crop Scanner', icon: Camera, accent: true },
      { id: 'analytics', label: 'Yield & Risk Analytics', icon: ChartLine },
      { id: 'irrigation', label: 'Irrigation & Inputs', icon: Droplets },
      { id: 'labor', label: 'Labor/Tasks', icon: ClipboardList },
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
      { id: 'dashboard', label: 'Inventory Overview', icon: CloudSun },
      { id: 'batches', label: 'Batches', icon: Boxes },
      { id: 'scan', label: 'Health Screening', icon: Camera, accent: true },
      { id: 'grading', label: 'Quality Grading', icon: ShieldCheck },
      { id: 'orders', label: 'Orders & Dispatch', icon: Truck },
      { id: 'reports', label: 'Loss & Turnover Reports', icon: ChartPie },
      { id: 'community', label: 'Community', icon: Users },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
    overviewTitle: 'Inventory Overview',
    overviewSubtitle: 'Current stock health across your growing sites.',
    locationLabel: 'Site',
    planBadgeLabel: 'Plan',
  },
};
