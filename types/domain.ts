// Shared domain types used by services (server) and components (client).
// These mirror the camelCase shapes returned by the API (see services/*'s mapX() functions).

// The single role field (profiles.account_type) that drives which dashboard
// experience a user sees. Reused as-is rather than introducing a parallel
// "operation_type" column - see supabase_role_features_patch.sql.
export type AccountType = 'Gardener' | 'Farmer' | 'Nursery' | 'Agribusiness';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountType: AccountType;
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
  location?: string;
  acreage?: number;
  latitude?: number;
  longitude?: number;
  cropType?: string;
  cropTypes?: string[];
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
  photoUrl?: string;
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
  category: 'General' | 'Diseases' | 'Tips' | 'Farming Tech' | 'QA';
  likes: string[];
  replyCount?: number;
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

// ─── Role-specific domain types (see supabase_role_features_patch.sql) ───

// Hobbyist Gardener
export interface CareReminder {
  id: string;
  plantId: string;
  userId: string;
  reminderType: 'Watering' | 'Fertilizing' | 'Pruning' | 'Repotting' | 'Pest Check' | 'Custom';
  dueDate: string;
  recurringDays?: number;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

// Commercial Farmer + Agribusiness Professional
export interface Expense {
  id: string;
  userId: string;
  farmId?: string;
  category: 'Seed' | 'Fertilizer' | 'Equipment' | 'Labor' | 'Water' | 'Pesticide' | 'Other';
  type: 'Expense' | 'Revenue';
  amount: number;
  description?: string;
  occurredOn: string;
  createdAt: string;
}

// Commercial Farmer
export interface Equipment {
  id: string;
  userId: string;
  farmId?: string;
  name: string;
  equipmentType: 'Tractor' | 'Irrigation' | 'Sprayer' | 'Harvester' | 'Tool' | 'Other';
  status: 'Operational' | 'Maintenance' | 'Retired';
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
}

// Commercial Farmer (worker scheduling) / Agribusiness (team tasks)
export interface FarmTask {
  id: string;
  userId: string;
  farmId?: string;
  assigneeEmail?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
}

// Nursery Operator
export interface InventoryBatch {
  id: string;
  userId: string;
  farmId?: string;
  plantType: string;
  batchName?: string;
  quantity: number;
  unitPrice?: number;
  propagationDate?: string;
  readyDate?: string;
  status: 'Propagating' | 'Growing' | 'Ready' | 'Sold Out' | 'Needs Treatment';
  lowStockThreshold: number;
  grade?: 'A' | 'B' | 'C';
  certificateUrl?: string;
  createdAt: string;
}

// Nursery Operator
export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerContact?: string;
  status: 'Pending' | 'Fulfilled' | 'Cancelled' | 'Shipped';
  dispatchDate?: string;
  totalAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  batchId?: string;
  quantity: number;
  unitPrice: number;
}

// Nursery Operator
export interface Supplier {
  id: string;
  userId: string;
  name: string;
  contactInfo?: string;
  notes?: string;
  createdAt: string;
}

// Agribusiness Professional (reference data, not user-owned)
export interface MarketPrice {
  id: string;
  cropType: string;
  avgPrice: number;
  unit: string;
  region?: string;
  recordedOn: string;
}

// ─── New role feature types (Commercial Farmer / Nursery Operator / Agribusiness Professional) ───

export interface ScanResultItem {
  imageUrl: string;
  cropType?: string;
  diagnosis: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  symptoms: string;
  visibleOrgans?: string[];
  likelyCause?: string;
  affectedAreaPercent?: number;
  scoutingNotes?: string;
  recommendedAction?: string;
  treatmentPriority?: 'Monitor' | 'Treat Soon' | 'Urgent';
}

// Commercial Farmer
export interface FieldScan {
  id: string;
  userId: string;
  farmId: string;
  totalSamples: number;
  healthyCount: number;
  infectionPercentage: number;
  results: ScanResultItem[];
  createdAt: string;
}

// Commercial Farmer
export interface IrrigationLog {
  id: string;
  userId: string;
  farmId?: string;
  logType: 'Irrigation' | 'Fertilizer' | 'Pesticide' | 'Other';
  amount?: number;
  unit?: string;
  notes?: string;
  loggedOn: string;
  createdAt: string;
}

// Nursery Operator
export interface BatchScan {
  id: string;
  userId: string;
  batchId: string;
  totalSamples: number;
  healthyCount: number;
  infectionPercentage: number;
  results: ScanResultItem[];
  createdAt: string;
}

// Agribusiness Professional
export interface Organization {
  id: string;
  ownerUserId: string;
  name: string;
  createdAt: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Analyst' | 'Viewer';
  createdAt: string;
}

export interface OrganizationFarm {
  id: string;
  orgId: string;
  farmId: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  label: string;
  keyPrefix: string;
  status: 'Active' | 'Revoked';
  createdAt: string;
  revokedAt?: string;
}

export interface ApiUsageLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  statusCode: number;
  requestedAt: string;
}

export interface AuditReport {
  id: string;
  userId: string;
  farmId?: string;
  title: string;
  summary?: string;
  status: 'Draft' | 'Final';
  createdAt: string;
}
