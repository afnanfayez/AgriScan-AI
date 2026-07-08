/**
 * LEGACY FILE - RETAINED FOR TYPE COMPATIBILITY ONLY
 *
 * This file previously contained a local JSON file-based database
 * (agriscan_db.json) used during early development.
 *
 * ALL data persistence has been migrated to Supabase (Postgres + Auth + Storage).
 * No API routes import from this file. The actual Supabase clients live in lib/supabase.ts.
 *
 * The type definitions below are kept here for any legacy imports but should
 * be migrated to their Supabase equivalents over time.
 *
 * DO NOT add any `fs`, `path`, `getDb()`, or `saveDb()` calls here.
 */

// ─── Legacy type definitions (kept for compatibility) ─────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: 'Gardener' | 'Farmer' | 'Nursery' | 'Agribusiness';
  location: string;
  units: 'metric' | 'imperial';
  plan: 'Free' | 'Pro' | 'Enterprise';
  createdAt: string;
}

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

export interface PlantScan {
  id: string;
  plantId: string;
  userId: string;
  imageUrl: string;
  diagnosis: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string;
  createdAt: string;
}

export interface TreatmentPlan {
  id: string;
  scanId: string;
  plantId: string;
  userId: string;
  type: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  organicSteps: string[];
  chemicalSteps: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface PlantNote {
  id: string;
  plantId: string;
  userId: string;
  content: string;
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

export interface TeamMember {
  id: string;
  farmId: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Worker';
  joinedAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  userId: string;
  authorName: string;
  category: 'General' | 'Diseases' | 'Tips' | 'Farming Tech';
  likes: string[];
  createdAt: string;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  userId: string;
  authorName: string;
  createdAt: string;
}

export interface ExpertReview {
  id: string;
  scanId: string;
  plantId: string;
  userId: string;
  status: 'Pending' | 'Reviewed';
  expertReply?: string;
  createdAt: string;
}

export interface DiseaseReference {
  id: string;
  name: string;
  description: string;
  symptoms: string;
  prevention: string;
  organicTreatments: string[];
  chemicalTreatments: string[];
}
