'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import DashboardShell from '@/components/dashboard/dashboard-shell';
import { ROLE_CONFIG } from '@/components/dashboard/role-config';
import CarePlansSection from '@/components/dashboard/care-plans-section';
import CommunitySection from '@/components/dashboard/community-section';
import SettingsSection from '@/components/dashboard/settings-section';
import FarmerOverviewSection from '@/components/dashboard/farmer-overview-section';
import FarmerBatchScanSection from '@/components/dashboard/farmer-batch-scan-section';
import FarmerAnalyticsSection from '@/components/dashboard/farmer-analytics-section';
import FarmerIrrigationSection from '@/components/dashboard/farmer-irrigation-section';
import FarmerLaborSection from '@/components/dashboard/farmer-labor-section';
import NurseryOverviewSection from '@/components/dashboard/nursery-overview-section';
import NurseryBatchesSection from '@/components/dashboard/nursery-batches-section';
import NurseryHealthScreeningSection from '@/components/dashboard/nursery-health-screening-section';
import NurseryGradingSection from '@/components/dashboard/nursery-grading-section';
import NurseryOrdersSection from '@/components/dashboard/nursery-orders-section';
import NurseryReportsSection from '@/components/dashboard/nursery-reports-section';

// Leaflet touches `window` at module-load time, which crashes SSR — this route
// is 'use client' but still gets server-rendered for the initial request.
const FarmerFieldMapSection = dynamic(
  () => import('@/components/dashboard/farmer-field-map-section'),
  { ssr: false, loading: () => <div className="p-6 text-sm text-stone-500">Loading map…</div> }
);
import { motion, AnimatePresence } from 'motion/react';
import {
  Sprout,
  Camera,
  Upload,
  Heart,
  AlertTriangle,
  CheckCircle,
  Settings,
  Users,
  FileText,
  CloudSun,
  User,
  Search,
  Plus,
  Loader2,
  X,
  Send,
  ChevronRight,
  Check,
  BookOpen,
  FileDown,
  MessageSquare,
  Award,
  Clock,
  Wind,
  TrendingUp,
  Sliders,
  Sparkles,
  Trash,
} from 'lucide-react';

const TAB_ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  plants: '/My-Plants',
  scan: '/Plant-Doctor',
  treatments: '/Care-Plans',
  community: '/Community',
  settings: '/Settings',
  // Commercial Farmer
  fieldmap: '/Field-Map',
  analytics: '/Yield-Analytics',
  irrigation: '/Irrigation',
  labor: '/Labor',
  // Nursery Operator
  batches: '/Batches',
  grading: '/Quality-Grading',
  orders: '/Orders',
  reports: '/Loss-Reports',
  // Agribusiness
  multifarm: '/Multi-Farm',
  team: '/Team',
  apikeys: '/Api-Integrations',
  compliance: '/Compliance',
};

const ROUTE_TABS: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_ROUTES).map(([tab, path]) => [path.toLowerCase(), tab])
);

function DashboardContent() {
  const {
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
    logout,
    onboard,
    refreshAll,
    markAllNotificationsRead,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const plantIdParam = searchParams.get('plantId');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize plantId from URL search params to AuthContext selectedPlantId
  useEffect(() => {
    if (plantIdParam) {
      if (selectedPlantId !== plantIdParam) {
        setSelectedPlantId(plantIdParam);
      }
      if (activeTab !== 'plants' && activeTab !== 'scan') {
        setActiveTab('plants');
      }
    } else {
      if (selectedPlantId && activeTab === 'plants') {
        setSelectedPlantId(null);
      }
    }
  }, [plantIdParam, selectedPlantId, activeTab, setSelectedPlantId, setActiveTab]);

  // Onboarding wizard state
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardLocation, setOnboardLocation] = useState('');
  const [onboardUnits, setOnboardUnits] = useState<'metric' | 'imperial'>('metric');
  const [onboardPlan, setOnboardPlan] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');
  const [onboardFarmName, setOnboardFarmName] = useState('');

  // Notifications Drawer
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Dashboard state
  const [selectedFarmFilter, setSelectedFarmFilter] = useState('all');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');
  const [weatherLocationInput, setWeatherLocationInput] = useState('');
  const [isSavingWeatherLocation, setIsSavingWeatherLocation] = useState(false);

  // My Plants state
  const [plantSearch, setPlantSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  
  // Add Plant Form
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantType, setNewPlantType] = useState('');
  const [newPlantDate, setNewPlantDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPlantFarmId, setNewPlantFarmId] = useState('');
  const [newPlantPhoto, setNewPlantPhoto] = useState<string | null>(null);

  // Plant Detail state
  const [plantNotes, setPlantNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNotePhoto, setNewNotePhoto] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Care Reminders state (Hobbyist Gardener feature, available on any plant)
  const [plantReminders, setPlantReminders] = useState<any[]>([]);
  const [gardenReminders, setGardenReminders] = useState<any[]>([]);
  const [newReminderType, setNewReminderType] = useState<'Watering' | 'Fertilizing' | 'Pruning' | 'Repotting' | 'Pest Check' | 'Custom'>('Watering');
  const [newReminderDueDate, setNewReminderDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newReminderRecurringDays, setNewReminderRecurringDays] = useState('');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  // AI Scan Lab state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [scanStep, setScanStep] = useState<'select' | 'camera' | 'analyzing' | 'result'>('select');
  const [scanTargetPlantId, setScanTargetPlantId] = useState('');
  const [scanCatalogMode, setScanCatalogMode] = useState(false);
  const [scanNewPlantName, setScanNewPlantName] = useState('');
  const [scanNewPlantType, setScanNewPlantType] = useState('');
  const [expertSubmitted, setExpertSubmitted] = useState(false);
  const [expertReviewResponse, setExpertReviewResponse] = useState<any>(null);

  // Care plan details + feedback
  const [carePlanDetail, setCarePlanDetail] = useState<{ plant: any; treatment: any | null } | null>(null);
  const [carePlanLoadingId, setCarePlanLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Community State
  const [communityCategory, setCommunityCategory] = useState<'all' | 'Diseases' | 'Tips' | 'General' | 'Farming Tech'>('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<'General' | 'Diseases' | 'Tips' | 'Farming Tech'>('General');
  const [activePostComments, setActivePostComments] = useState<any[]>([]);
  const [activePostIdForComments, setActivePostIdForComments] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Settings State
  const [settingsName, setSettingsName] = useState('');
  const [settingsLocation, setSettingsLocation] = useState('');
  const [settingsUnits, setSettingsUnits] = useState<'metric' | 'imperial'>('metric');
  const [settingsPlan, setSettingsPlan] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');
  const [settingsAccountType, setSettingsAccountType] = useState<'Gardener' | 'Farmer' | 'Nursery' | 'Agribusiness'>('Gardener');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Video Ref for Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pushWorkspaceUrl = useCallback((url: string) => {
    if (typeof window === 'undefined') {
      router.push(url);
      return;
    }
    window.history.pushState(null, '', url);
  }, [router]);

  const openTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setSelectedPlantId(null);
    if (tabId === 'plants') {
      setStatusFilter('all');
    }
    pushWorkspaceUrl(TAB_ROUTES[tabId] || '/dashboard');
  }, [pushWorkspaceUrl, setActiveTab, setSelectedPlantId]);

  const openPlantProfile = useCallback((plantId: string) => {
    setStatusFilter('all');
    setSelectedPlantId(plantId);
    setActiveTab('plants');
    pushWorkspaceUrl(`/My-Plants?plantId=${encodeURIComponent(plantId)}`);
  }, [pushWorkspaceUrl, setActiveTab, setSelectedPlantId]);

  const openPlantsList = useCallback(() => {
    setStatusFilter('all');
    setSelectedPlantId(null);
    setActiveTab('plants');
    pushWorkspaceUrl('/My-Plants');
  }, [pushWorkspaceUrl, setActiveTab, setSelectedPlantId]);

  useEffect(() => {
    const routeTab = ROUTE_TABS[pathname.toLowerCase()];
    if (routeTab && routeTab !== activeTab) {
      setActiveTab(routeTab);
      if (routeTab !== 'plants') {
        setSelectedPlantId(null);
      }
      if (routeTab === 'plants') {
        setStatusFilter('all');
      }
    }
  }, [pathname, activeTab, setActiveTab, setSelectedPlantId]);

  const normalizeScanImage = (source: File | HTMLVideoElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      const maxDimension = 1600;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Browser canvas is unavailable.'));
        return;
      }

      const drawImage = (image: HTMLImageElement | HTMLVideoElement, width: number, height: number) => {
        const scale = Math.min(1, maxDimension / Math.max(width, height));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };

      if (source instanceof HTMLVideoElement) {
        if (!source.videoWidth || !source.videoHeight) {
          reject(new Error('Camera stream is not ready yet.'));
          return;
        }
        drawImage(source, source.videoWidth, source.videoHeight);
        return;
      }

      if (!source.type.startsWith('image/')) {
        reject(new Error('Please choose an image file.'));
        return;
      }

      const imageUrl = URL.createObjectURL(source);
      const image = new Image();
      image.onload = () => {
        drawImage(image, image.naturalWidth, image.naturalHeight);
        URL.revokeObjectURL(imageUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Could not read this image file.'));
      };
      image.src = imageUrl;
    });
  };

  // Fetch Weather on load or location change
  useEffect(() => {
    if (user) {
      setTimeout(() => {
        setWeatherLoading(true);
        setWeatherError('');
        const storedLocation = sessionStorage.getItem('agriscan.weatherLocation') || '';
        const preferredLocation = user.location || storedLocation;
        setWeatherLocationInput(preferredLocation);
        const fetchWeather = (url: string) => fetch(url)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setWeatherData(data);
            } else {
              setWeatherData(null);
              setWeatherError(data.error || 'Weather data unavailable');
            }
          })
          .catch((err) => {
            console.error('Failed to fetch weather:', err);
            setWeatherData(null);
            setWeatherError('Weather data unavailable');
          })
          .finally(() => setWeatherLoading(false));

        if (preferredLocation) {
          fetchWeather(`/api/weather?location=${encodeURIComponent(preferredLocation)}`);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              fetchWeather(`/api/weather?lat=${latitude}&lon=${longitude}`);
            },
            () => fetchWeather('/api/weather?location=Central Valley, CA'),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 15 * 60 * 1000 }
          );
        } else {
          fetchWeather('/api/weather?location=Central Valley, CA');
        }

        // Prefill settings
        setSettingsName(user.name || '');
        setSettingsLocation(user.location || '');
        setSettingsUnits(user.units || 'metric');
        setSettingsPlan(user.plan || 'Free');
        setSettingsAccountType(user.accountType || 'Gardener');
      }, 0);
    }
  }, [user]);

  // Fetch plant notes + care reminders when detail plant is selected
  useEffect(() => {
    if (selectedPlantId) {
      setTimeout(() => {
        fetch(`/api/notes?plantId=${selectedPlantId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setPlantNotes(data.notes);
          });
        fetch(`/api/care-reminders?plantId=${selectedPlantId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setPlantReminders(data.reminders);
          });
      }, 0);
    }
  }, [selectedPlantId]);

  // Fetch upcoming garden-wide reminders for the Gardener "My Garden" overview widget
  useEffect(() => {
    if (user?.accountType === 'Gardener') {
      setTimeout(() => {
        fetch('/api/care-reminders?upcomingOnly=true')
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setGardenReminders(data.reminders);
          });
      }, 0);
    }
  }, [user?.accountType, plantReminders]);

  // Fetch forum posts
  useEffect(() => {
    if (user && activeTab === 'community') {
      setTimeout(() => {
        setPostsLoading(true);
        fetch(`/api/community?category=${communityCategory}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setPosts(data.posts);
          })
          .finally(() => setPostsLoading(false));
      }, 0);
    }
  }, [activeTab, communityCategory, user]);

  // Fetch Comments
  const fetchComments = async (postId: string) => {
    try {
      const res = await fetch(`/api/community?postId=${postId}`);
      const data = await res.json();
      if (data.success) {
        setActivePostComments(data.comments);
        setActivePostIdForComments(postId);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const saveWeatherLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextLocation = weatherLocationInput.trim();
    if (!nextLocation) return;

    setIsSavingWeatherLocation(true);
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const weatherRes = await fetch(`/api/weather?location=${encodeURIComponent(nextLocation)}`);
      const weatherPayload = await weatherRes.json();
      if (!weatherPayload.success) {
        setWeatherData(null);
        setWeatherError(weatherPayload.error || 'Weather data unavailable');
        return;
      }

      setWeatherData(weatherPayload);
      sessionStorage.setItem('agriscan.weatherLocation', nextLocation);

      const profileRes = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: user?.accountType,
          location: nextLocation,
          units: user?.units,
          plan: user?.plan,
        }),
      });
      const profilePayload = await profileRes.json();
      if (!profileRes.ok || !profilePayload.success) {
        setWeatherError(profilePayload.error || 'Weather loaded, but profile location could not be saved.');
      } else {
        await refreshAll();
      }
    } catch (error) {
      console.error('Failed to save weather location:', error);
      setWeatherData(null);
      setWeatherError('Weather data unavailable');
    } finally {
      setWeatherLoading(false);
      setIsSavingWeatherLocation(false);
    }
  };

  // Onboard Handler
  const handleOnboardSubmit = async () => {
    setIsSubmitting(true);
    const res = await onboard({
      accountType: user?.accountType,
      location: onboardLocation,
      units: onboardUnits,
      plan: onboardPlan,
      firstFarmName: onboardFarmName || `${user?.name}'s Farm`
    });
    
    if (res.success) {
      await refreshAll();
      setActiveTab('dashboard');
      pushWorkspaceUrl('/dashboard');
    } else {
      setAuthError(res.error || 'Onboarding saving failed');
    }
    setIsSubmitting(false);
  };

  // Add Plant Handler
  const handleAddPlant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantName || !newPlantType) return;

    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlantName,
          type: newPlantType,
          plantingDate: newPlantDate,
          farmId: newPlantFarmId || farms[0]?.id || '',
          photoUrl: newPlantPhoto || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddPlantModal(false);
        setNewPlantName('');
        setNewPlantType('');
        setNewPlantPhoto(null);
        await refreshAll();
      }
    } catch (error) {
      console.error('Failed to add plant:', error);
    }
  };

  const handleNewPlantPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPlantPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Delete Plant Handler
  const handleDeletePlant = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this plant and all associated history?')) return;
    try {
      const res = await fetch(`/api/plants?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        openPlantsList();
        await refreshAll();
      }
    } catch (error) {
      console.error('Failed to delete plant:', error);
    }
  };

  // Save custom plant note (with optional photo journal attachment)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedPlantId) return;

    setIsSavingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: selectedPlantId, content: newNoteContent, photo: newNotePhoto }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteContent('');
        setNewNotePhoto(null);
        // Refetch notes
        const notesRes = await fetch(`/api/notes?plantId=${selectedPlantId}`);
        const notesData = await notesRes.json();
        if (notesData.success) setPlantNotes(notesData.notes);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Photo journal file picker -> base64
  const handleNotePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewNotePhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Add a care reminder for the currently selected plant
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlantId) return;

    setIsAddingReminder(true);
    try {
      const res = await fetch('/api/care-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: selectedPlantId,
          reminderType: newReminderType,
          dueDate: newReminderDueDate,
          recurringDays: newReminderRecurringDays ? Number(newReminderRecurringDays) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewReminderRecurringDays('');
        const remindersRes = await fetch(`/api/care-reminders?plantId=${selectedPlantId}`);
        const remindersData = await remindersRes.json();
        if (remindersData.success) setPlantReminders(remindersData.reminders);
      }
    } catch (error) {
      console.error('Failed to add care reminder:', error);
    } finally {
      setIsAddingReminder(false);
    }
  };

  // Mark a care reminder done (server auto-schedules the next occurrence if recurring)
  const handleCompleteReminder = async (id: string) => {
    try {
      const res = await fetch('/api/care-reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedPlantId) {
          const remindersRes = await fetch(`/api/care-reminders?plantId=${selectedPlantId}`);
          const remindersData = await remindersRes.json();
          if (remindersData.success) setPlantReminders(remindersData.reminders);
        }
        const gardenRes = await fetch('/api/care-reminders?upcomingOnly=true');
        const gardenData = await gardenRes.json();
        if (gardenData.success) setGardenReminders(gardenData.reminders);
      }
    } catch (error) {
      console.error('Failed to complete care reminder:', error);
    }
  };

  // Camera Management
  const startCamera = async () => {
    setScanError('');
    setScanStep('camera');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to access camera, falling back to upload:', error);
      setIsCameraActive(false);
      setScanStep('select');
      setScanError('Camera access denied or unavailable. Please use photo upload instead.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = async () => {
    if (videoRef.current) {
      try {
        const dataUrl = await normalizeScanImage(videoRef.current);
        setCapturedImage(dataUrl);
        setAnalysisResult(null);
        setScanError('');
        stopCamera();
        setScanStep('result');
      } catch (error: any) {
        setScanError(error.message || 'Could not capture the camera image.');
      }
    }
  };

  // File Upload fallback handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await normalizeScanImage(file);
        setCapturedImage(dataUrl);
        setAnalysisResult(null);
        setScanError('');
        setScanStep('result');
      } catch (error: any) {
        setScanError(error.message || 'Could not read this image file.');
      } finally {
        e.target.value = '';
      }
    }
  };

  const catalogPlantFromScanPhoto = async () => {
    if (!capturedImage || !scanNewPlantName.trim() || !scanNewPlantType.trim()) return null;

    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scanNewPlantName.trim(),
          type: scanNewPlantType.trim(),
          plantingDate: new Date().toISOString().split('T')[0],
          farmId: farms[0]?.id || '',
          photoUrl: capturedImage,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setScanError(data.error || 'Failed to catalog crop from scan photo.');
        return null;
      }

      await refreshAll();
      setScanTargetPlantId(data.plant.id);
      setScanCatalogMode(false);
      setScanNewPlantName('');
      setScanNewPlantType('');
      return data.plant.id as string;
    } catch (error) {
      console.error('Failed to catalog crop from scan photo:', error);
      setScanError('An error occurred while cataloging the crop.');
      return null;
    }
  };

  // Analyze Image with Gemini AI on Server Side
  const runAIAnalysis = async () => {
    if (!capturedImage) return;
    setScanError('');

    let targetPlantId = scanCatalogMode ? '' : scanTargetPlantId;
    if (!targetPlantId && !scanCatalogMode && plants.length > 0) {
      setScanError('Choose a target plant or catalog a new crop from this image.');
      return;
    }
    if (!targetPlantId) {
      setIsAnalyzing(true);
      setScanStep('analyzing');
      targetPlantId = await catalogPlantFromScanPhoto() || '';
      if (!targetPlantId) {
        setIsAnalyzing(false);
        setScanStep('result');
        return;
      }
    }

    setIsAnalyzing(true);
    setScanStep('analyzing');
    setExpertSubmitted(false);
    setExpertReviewResponse(null);

    try {
      const res = await fetch('/api/scans/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, plantId: targetPlantId }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data);
        setScanStep('result');
        await refreshAll();
      } else {
        setScanError(data.error || 'AI scan analysis failed.');
        setScanStep('result');
      }
    } catch (error: any) {
      console.error('Scan analysis crash:', error);
      setScanError(error.message || 'An error occurred during plant image analysis.');
      setScanStep('result');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Mark treatment plan resolved
  const resolveTreatment = async (treatmentId: string) => {
    try {
      const res = await fetch('/api/treatments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: treatmentId, status: 'Completed' }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshAll();
        return true;
      }
    } catch (error) {
      console.error('Failed to resolve treatment:', error);
    }
    return false;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 3200);
  };

  const openCarePlanDetail = async (plant: any) => {
    setCarePlanLoadingId(plant.id);
    try {
      const treatmentsRes = await fetch(`/api/treatments?plantId=${plant.id}`);
      const treatmentsData = await treatmentsRes.json();
      const treatment = treatmentsData.treatments?.find((t: any) => t.status !== 'Completed') || treatmentsData.treatments?.[0] || null;
      setCarePlanDetail({ plant, treatment });
    } catch (error) {
      console.error('Failed to load care plan:', error);
      showToast('Could not load the care plan. Please try again.');
    } finally {
      setCarePlanLoadingId(null);
    }
  };

  const markPlantFullyTreated = async (plant: any, treatment?: any | null) => {
    try {
      const treatmentsRes = await fetch(`/api/treatments?plantId=${plant.id}`);
      const treatmentsData = await treatmentsRes.json();
      const openTreatments = (treatmentsData.treatments || []).filter((t: any) => t.status !== 'Completed');
      const treatmentsToComplete = openTreatments.length > 0 ? openTreatments : (treatment?.id ? [treatment] : []);

      if (treatmentsToComplete.length > 0) {
        const results = await Promise.all(treatmentsToComplete.map((t: any) => resolveTreatment(t.id)));
        const allCompleted = results.every(Boolean);
        if (allCompleted) {
          await fetch('/api/plants', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: plant.id, healthStatus: 'Healthy' }),
          });
          await refreshAll();
        }
        showToast(allCompleted ? `${plant.name} marked as fully treated.` : 'Some treatment steps could not be closed. Please try again.');
      } else {
        await fetch('/api/plants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: plant.id, healthStatus: 'Healthy' }),
        });
        await refreshAll();
        showToast(`${plant.name} restored to Healthy.`);
      }

      setCarePlanDetail(null);
    } catch (error) {
      console.error('Failed to mark plant fully treated:', error);
      showToast('Could not complete treatment. Please try again.');
    }
  };

  // Ask pathologist expert review
  const submitExpertReview = async () => {
    if (!analysisResult?.scan) return;
    try {
      const res = await fetch('/api/expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: analysisResult.scan.id,
          plantId: analysisResult.scan.plantId,
          symptoms: analysisResult.scan.symptoms
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExpertSubmitted(true);
        setExpertReviewResponse(data.review);
        await refreshAll();
      }
    } catch (error) {
      console.error('Failed to submit expert review:', error);
    }
  };

  // Create new forum post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle || !newPostContent || !newPostCategory) return;

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          category: newPostCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddPostModal(false);
        setNewPostTitle('');
        setNewPostContent('');
        setCommunityCategory(data.post.category || newPostCategory);
        const postsRes = await fetch(`/api/community?category=${encodeURIComponent(data.post.category || newPostCategory)}`);
        const postsData = await postsRes.json();
        if (postsData.success) setPosts(postsData.posts);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  // Like a forum post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', postId })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(posts.map((p) => p.id === postId ? data.post : p));
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  // Submit comment reply
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activePostIdForComments) return;

    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          postId: activePostIdForComments,
          content: newCommentText
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewCommentText('');
        setPosts((prev) =>
          prev.map((post) =>
            post.id === activePostIdForComments
              ? { ...post, replyCount: (post.replyCount || 0) + 1 }
              : post
          )
        );
        fetchComments(activePostIdForComments);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  // Save updated settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    setSettingsSaving(true);

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName.trim(),
          location: settingsLocation.trim(),
          units: settingsUnits,
          plan: settingsPlan,
          accountType: settingsAccountType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsSuccess('Profile settings successfully updated and persisted.');
        await refreshAll();
      } else {
        setSettingsError(data.error || 'Failed to update profile settings.');
      }
    } catch (error) {
      setSettingsError('An error occurred during update.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Loading spinner while the session is being resolved on first load
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-stone-50 text-stone-800">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm font-medium tracking-tight font-sans">Bootstrapping AgriScan AI core modules...</p>
      </div>
    );
  }

  // Middleware guards this route, so this only covers the brief window where
  // the session cookie is valid but refreshAll() hasn't resolved user data yet.
  if (!user) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-stone-50 text-stone-800">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      </div>
    );
  }


  // --- OPERATIONAL ONBOARDING WIZARD ---
  if (user && !user.location) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-slate-950 flex items-center justify-center p-4 md:p-8 font-sans transition-colors duration-200">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl shadow-sm p-8">
          <div className="flex items-center space-x-2 font-mono text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            <Sparkles className="h-4 w-4" />
            <span>Farm Dashboard Onboarding — Step {onboardStep} of 2</span>
          </div>

          {onboardStep === 1 ? (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-slate-50 mt-2">
                Configure your agricultural metrics
              </h2>
              <p className="text-sm text-stone-500 dark:text-slate-400 mt-2">
                Let us know where you are located so we can fetch localized meteorologic alerts and track oomycete disease-risk profiles.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-slate-400 uppercase tracking-wider font-mono">Farm/Garden Location</label>
                  <input
                    type="text"
                    required
                    value={onboardLocation}
                    onChange={(e) => setOnboardLocation(e.target.value)}
                    placeholder="e.g. Portland, OR or Napa Valley, CA"
                    className="mt-1 block w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-slate-400 uppercase tracking-wider font-mono">Measurement System</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <button
                      onClick={() => setOnboardUnits('metric')}
                      className={`py-3 rounded-xl border text-sm font-semibold font-mono cursor-pointer transition-all ${onboardUnits === 'metric' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-200 shadow-sm' : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-stone-600 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-900'}`}
                    >
                      Metric (°C, km/h)
                    </button>
                    <button
                      onClick={() => setOnboardUnits('imperial')}
                      className={`py-3 rounded-xl border text-sm font-semibold font-mono cursor-pointer transition-all ${onboardUnits === 'imperial' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-200 shadow-sm' : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-stone-600 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-900'}`}
                    >
                      Imperial (°F, mph)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-slate-400 uppercase tracking-wider font-mono">Farm Dashboard / Initial Zone Name</label>
                  <input
                    type="text"
                    required
                    value={onboardFarmName}
                    onChange={(e) => setOnboardFarmName(e.target.value)}
                    placeholder="e.g. Greenhouse Beta or Vineyard Block 3"
                    className="mt-1 block w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setOnboardStep(2)}
                  disabled={!onboardLocation || !onboardFarmName}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-emerald-700 cursor-pointer disabled:opacity-55 flex items-center space-x-2"
                >
                  <span>Select Subscription Tier</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-slate-50 mt-2">
                Choose your scanning quota
              </h2>
              <p className="text-sm text-stone-500 dark:text-slate-400 mt-2">
                All accounts start with standard access. Choose Pro or Enterprise to increase scanning capacity and activate deep team RBAC permissions.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  {
                    tier: 'Free',
                    price: '$0',
                    desc: 'Up to 5 neural scans/mo. 1 farm field, single user access.',
                  },
                  {
                    tier: 'Pro',
                    price: '$29/mo',
                    desc: 'Unlimited neural scans, up to 10 zones, full weather predictive oomycete indexes.',
                  },
                  {
                    tier: 'Enterprise',
                    price: '$149/mo',
                    desc: 'Unlimited capacity, unlimited zones, team permissions (Owner/Manager/Worker) with complete CSV exports.',
                  }
                ].map((plan) => (
                  <button
                    key={plan.tier}
                    onClick={() => setOnboardPlan(plan.tier as any)}
                    className={`w-full text-left p-4 rounded-xl border font-sans cursor-pointer transition-all flex items-start justify-between ${onboardPlan === plan.tier ? 'border-emerald-600 bg-emerald-50/30 dark:border-emerald-500 dark:bg-emerald-500/5' : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-stone-50 dark:hover:bg-slate-900'}`}
                  >
                    <div>
                      <span className="font-semibold text-stone-900 dark:text-slate-100 block font-mono">{plan.tier} Plan</span>
                      <span className="text-xs text-stone-500 dark:text-slate-400 mt-1 block">{plan.desc}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-450 font-mono">{plan.price}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setOnboardStep(1)}
                  className="px-5 py-3 border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-400 hover:bg-stone-50 dark:hover:bg-slate-900 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleOnboardSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 cursor-pointer flex items-center space-x-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <span>Complete Onboarding</span>
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- MAIN AUTHENTICATED WORKSPACE PANEL ---
  const roleConfig = ROLE_CONFIG[user.accountType as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.Gardener;
  const healthPriority: Record<string, number> = { Critical: 0, Warning: 1, Healthy: 2 };
  const featuredGardenPlants = [...plants]
    .sort((a, b) => {
      const healthDelta = (healthPriority[a.healthStatus] ?? 3) - (healthPriority[b.healthStatus] ?? 3);
      if (healthDelta !== 0) return healthDelta;
      return new Date(b.createdAt || b.plantingDate || 0).getTime() - new Date(a.createdAt || a.plantingDate || 0).getTime();
    })
    .slice(0, 4);
  const selectedScanPlant = plants.find((p) => p.id === scanTargetPlantId);
  const scanNeedsCatalog = scanCatalogMode || (!scanTargetPlantId && plants.length === 0);
  const canRunScan = !!capturedImage && (scanNeedsCatalog ? (!!scanNewPlantName.trim() && !!scanNewPlantType.trim()) : !!scanTargetPlantId);
  const analysisText = `${analysisResult?.scan?.diagnosis || ''} ${analysisResult?.scan?.symptoms || ''}`;
  const hasSpecimenMismatch = /mismatch|wrong plant|different plant|not match|does not match|specimen/i.test(analysisText);

  return (
    <>
      <DashboardShell
        user={user}
        activeTab={activeTab}
        onTabChange={openTab}
        weatherData={weatherData}
        onToggleNotifDrawer={() => {
          setShowNotifDrawer(!showNotifDrawer);
          if (!showNotifDrawer) markAllNotificationsRead();
        }}
        unreadCount={unreadCount}
        onLogout={async () => { await logout(); router.push('/login'); }}
      >
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD TAB (Gardener) */}
            {activeTab === 'dashboard' && user.accountType === 'Gardener' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                      <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Garden Overview</span>
                      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl dark:text-slate-50">{roleConfig.overviewTitle}</h1>
                      <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-slate-400">{roleConfig.overviewSubtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1.5 dark:border-slate-700 dark:bg-slate-950/70">
                      {[
                        { label: 'CSV', format: 'csv', color: 'text-stone-500', title: 'Download raw tabular CSV data' },
                        { label: 'PDF', format: 'pdf', color: 'text-emerald-600', title: 'Download PDF analysis report' },
                        { label: 'Excel', format: 'excel', color: 'text-blue-600', title: 'Download formatted Excel worksheet' },
                      ].map((item) => (
                        <button
                          key={item.format}
                          onClick={() => window.open(`/api/export?format=${item.format}`, '_blank')}
                          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-xs ring-1 ring-stone-200 hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-sm dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
                          title={item.title}
                        >
                          <FileDown className={`h-3.5 w-3.5 ${item.color}`} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>

                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    { label: 'Managed Plants', value: plants.length, icon: Sprout, color: 'text-emerald-700 bg-emerald-50 ring-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/10 dark:ring-emerald-500/20' },
                    { label: 'Critical Plants', value: plants.filter(p => p.healthStatus === 'Critical').length, icon: AlertTriangle, color: 'text-red-700 bg-red-50 ring-red-100 dark:text-red-300 dark:bg-red-500/10 dark:ring-red-500/20' },
                    { label: 'Watch List', value: plants.filter(p => p.healthStatus === 'Warning').length, icon: Heart, color: 'text-amber-700 bg-amber-50 ring-amber-100 dark:text-amber-300 dark:bg-amber-500/10 dark:ring-amber-500/20' },
                    { label: 'Scan Confidence', value: '98%', icon: Award, color: 'text-blue-700 bg-blue-50 ring-blue-100 dark:text-sky-300 dark:bg-sky-500/10 dark:ring-sky-500/20' },
                  ].map((metric, i) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25 }}
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow-md md:p-5 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none dark:hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="block text-xs font-medium text-stone-500 dark:text-slate-400">{metric.label}</span>
                          <span className="mt-2 block text-2xl font-semibold tracking-tight text-stone-950 dark:text-slate-50">{metric.value}</span>
                        </div>
                        <div className={`rounded-xl p-2.5 ring-1 ${metric.color}`}>
                          <metric.icon className="h-5 w-5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  {/* Weather widget */}
                  <div className="space-y-6 xl:col-span-1">
                    {/* Localization Weather Block */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.25 }}
                      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-base font-semibold text-stone-950 dark:text-slate-50">Microclimate</h2>
                          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">Live local conditions for your garden.</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                          <CloudSun className="h-5 w-5" />
                        </div>
                      </div>

                      <form onSubmit={saveWeatherLocation} className="mt-5 flex gap-2">
                        <input
                          type="search"
                          value={weatherLocationInput}
                          onChange={(e) => setWeatherLocationInput(e.target.value)}
                          placeholder="Search city or region"
                          className="min-w-0 flex-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-stone-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <button
                          type="submit"
                          disabled={isSavingWeatherLocation || !weatherLocationInput.trim()}
                          className="rounded-xl bg-stone-900 dark:bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 hover:bg-stone-800 dark:hover:bg-slate-200 disabled:opacity-55"
                        >
                          {isSavingWeatherLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                        </button>
                      </form>

                      {weatherLoading ? (
                        <div className="mt-5 flex items-center justify-center rounded-xl bg-stone-50 dark:bg-slate-950/40 py-12">
                          <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                        </div>
                      ) : weatherError ? (
                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm leading-6 text-amber-900 dark:text-amber-200 dark:border-amber-900/30">
                          {weatherError}. Update your location with a city or region that can be geocoded.
                        </div>
                      ) : weatherData ? (
                        <div className="mt-5 space-y-5">
                          <div>
                            <p className="text-4xl font-semibold tracking-tight text-stone-950 dark:text-slate-50">{weatherData.current.temp}{weatherData.current.unit}</p>
                            <p className="mt-1 text-sm text-stone-600 dark:text-slate-350">{weatherData.current.condition}</p>
                            <p className="mt-1 text-xs text-stone-400 dark:text-slate-500">Based on {weatherData.resolvedLocation}</p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 border-t border-stone-100 dark:border-slate-800 pt-4 text-center">
                            {[
                              { label: 'Humidity', value: `${weatherData.current.humidity}%` },
                              { label: 'Wind', value: weatherData.current.wind },
                              { label: 'Moisture', value: weatherData.current.soilMoisture },
                            ].map((item) => (
                              <div key={item.label} className="rounded-xl bg-stone-50 dark:bg-slate-950/40 px-2 py-3">
                                <span className="block text-[11px] font-medium text-stone-400 dark:text-slate-500">{item.label}</span>
                                <span className="mt-1 block text-sm font-semibold text-stone-900 dark:text-slate-100">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/40 p-4 text-sm text-stone-500 dark:text-slate-400">
                          Weather data is unavailable for this account location.
                        </div>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.14, duration: 0.25 }}
                      className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-xl p-2.5 ring-1 ${weatherData?.current?.blightRisk === 'High' ? 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20' : weatherData?.current?.blightRisk === 'Medium' ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'}`}>
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Predictive Alert</span>
                          <h3 className="mt-1 text-base font-semibold text-stone-950 dark:text-slate-50">Late Blight Spore Outlook</h3>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="flex items-center justify-between gap-3">
                           <span className="text-sm font-medium text-stone-600 dark:text-slate-300">Spore incubation risk</span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${weatherData?.current?.blightRisk === 'High' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : weatherData?.current?.blightRisk === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'}`}>
                            {weatherData?.current?.blightRisk || 'Unknown'}
                          </span>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-stone-500 dark:text-slate-400">
                          Calculated from humidity ({weatherData?.current?.humidity ?? '-'}%), temperature ({weatherData?.current?.temp ?? '-'}{weatherData?.current?.unit ?? ''}), and recent rainfall ({weatherData?.current?.rainfall24h ?? '-'} mm).
                        </p>
                      </div>
                    </motion.div>

                  </div>

                  <div className="space-y-6 xl:col-span-2">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900/80">
                      <div className="flex flex-col gap-3 border-b border-stone-100 dark:border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-stone-950 dark:text-slate-50">Crop Health Index</h2>
                          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">Showing the four plants needing the most attention first.</p>
                        </div>
                        <button onClick={() => openTab('plants')} className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                          <span>Manage inventory</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 divide-y divide-stone-100 dark:divide-slate-800">
                        {plants.length === 0 ? (
                          <div className="py-12 text-center text-sm text-stone-400 dark:text-slate-500">No crops cataloged yet. Get started under My Plants.</div>
                        ) : (
                          featuredGardenPlants.map((plant, index) => (
                            <motion.div
                              key={plant.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.14 + index * 0.04, duration: 0.22 }}
                              className="flex items-center justify-between gap-4 py-4"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <img
                                  src={plant.photoUrl}
                                  alt={plant.name}
                                  className="h-12 w-12 shrink-0 rounded-xl border border-stone-200 dark:border-slate-700 object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0fdf4'/%3E%3Ctext x='50' y='62' font-size='44' text-anchor='middle'%3E🌱%3C/text%3E%3C/svg%3E"; }}
                                />
                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-semibold text-stone-950 dark:text-slate-50">{plant.name}</h4>
                                  <span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{plant.type}</span>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${plant.healthStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : plant.healthStatus === 'Warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'}`}>
                                  {plant.healthStatus}
                                </span>
                                <button
                                  onClick={() => {
                                    openPlantProfile(plant.id);
                                  }}
                                  className="rounded-lg p-2 text-stone-400 hover:bg-stone-50 hover:text-stone-800 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                  title={`Open ${plant.name}`}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    {user.accountType === 'Gardener' && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16, duration: 0.25 }}
                        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-800 dark:bg-slate-900/80"
                      >
                        <div className="flex items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-slate-800">
                          <div>
                            <h2 className="text-lg font-semibold text-stone-950 dark:text-slate-50">Upcoming Care</h2>
                            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">The next maintenance tasks across your garden.</p>
                          </div>
                          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                            <Heart className="h-5 w-5" />
                          </div>
                        </div>

                        {gardenReminders.length === 0 ? (
                          <p className="py-8 text-center text-sm text-stone-400 dark:text-slate-500">Nothing due right now. Your garden is caught up.</p>
                        ) : (
                          <div className="space-y-2 mt-4">
                            {gardenReminders.slice(0, 3).map((reminder, index) => {
                              const plant = plants.find((p) => p.id === reminder.plantId);
                              return (
                                <motion.div
                                  key={reminder.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2 + index * 0.04, duration: 0.2 }}
                                  className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-slate-950/40 p-3 text-sm hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-700/80 dark:hover:bg-slate-900/45 transition-all"
                                >
                                  <div className="min-w-0">
                                    <span className="block truncate font-semibold text-stone-900 dark:text-slate-100">{reminder.reminderType}</span>
                                    <span className="mt-0.5 block truncate text-xs text-stone-500 dark:text-slate-400">{plant?.name || 'Unknown plant'} - Due {new Date(reminder.dueDate).toLocaleDateString()}</span>
                                  </div>
                                  <button
                                    onClick={() => handleCompleteReminder(reminder.id)}
                                    className="shrink-0 rounded-lg p-2 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                                    title="Mark done"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1b. FARM OVERVIEW TAB (Commercial Farmer) */}
            {activeTab === 'dashboard' && user.accountType === 'Farmer' && (
              <FarmerOverviewSection
                user={user}
                farms={farms}
                plants={plants}
                onViewField={() => openTab('fieldmap')}
              />
            )}

            {/* 1c. FIELD MAP TAB (Commercial Farmer) */}
            {activeTab === 'fieldmap' && user.accountType === 'Farmer' && (
              <FarmerFieldMapSection farms={farms} plants={plants} />
            )}

            {/* 1d. INVENTORY OVERVIEW TAB (Nursery Operator) */}
            {activeTab === 'dashboard' && user.accountType === 'Nursery' && (
              <NurseryOverviewSection />
            )}

            {/* 2. MY PLANTS TAB */}
            {activeTab === 'plants' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-6"
              >
                {!selectedPlantId ? (
                  <div className="space-y-6">
                    {/* Plants List View */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50 transition-colors duration-200">
                          My Plants & Crops
                        </h1>
                        <p className="text-sm text-stone-500 dark:text-slate-400 mt-1 transition-colors duration-200">
                          Catalog, monitor health, and inspect crops, vines, and farm dashboard zones.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setNewPlantFarmId(farms[0]?.id || '');
                          setShowAddPlantModal(true);
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-400 dark:hover:to-teal-400 dark:active:from-emerald-700 dark:active:to-teal-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold tracking-wide shadow-md shadow-emerald-500/10 dark:shadow-emerald-500/10 flex items-center space-x-2 self-start cursor-pointer transition-all duration-200"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Add New Crop</span>
                      </button>
                    </div>

                    {/* Filters bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/60 dark:border-slate-800/80 pb-4">
                      <div className="flex flex-1 items-center space-x-2 bg-stone-100/80 dark:bg-slate-900/60 border border-transparent dark:border-slate-800/60 rounded-xl px-4 py-2 text-stone-500 dark:text-slate-400 max-w-md focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:focus-within:ring-emerald-500/10 focus-within:border-emerald-500/40 dark:focus-within:border-emerald-500/30 transition-all duration-200">
                        <Search className="h-4.5 w-4.5" />
                        <input
                          type="text"
                          value={plantSearch}
                          onChange={(e) => setPlantSearch(e.target.value)}
                          placeholder="Search cultivar types or names..."
                          className="w-full bg-transparent text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <span className="text-stone-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Status:</span>
                        <div className="flex bg-stone-100 dark:bg-slate-900/80 border border-stone-200/40 dark:border-slate-800/60 p-1 rounded-xl">
                          {['all', 'Healthy', 'Warning', 'Critical'].map((status) => (
                            <button
                              key={status}
                              onClick={() => setStatusFilter(status)}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer transition-all duration-200 ${
                                statusFilter === status
                                  ? 'bg-white dark:bg-slate-950 text-stone-900 dark:text-slate-50 shadow-xs border border-stone-200/20 dark:border-slate-800/40'
                                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100 hover:bg-stone-200/50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              {status === 'all' ? 'All' : status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Plant Grid */}
                    <div
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
                    >
                      <AnimatePresence>
                        {plants
                          .filter((p) => {
                            const matchesSearch = p.name.toLowerCase().includes(plantSearch.toLowerCase()) || p.type.toLowerCase().includes(plantSearch.toLowerCase());
                            const matchesStatus = statusFilter === 'all' || p.healthStatus === statusFilter;
                            return matchesSearch && matchesStatus;
                          })
                          .map((plant) => {
                            const isHealthy = plant.healthStatus === 'Healthy';

                            return (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                key={plant.id}
                                onClick={() => openPlantProfile(plant.id)}
                                className={`group bg-gradient-to-b from-white to-stone-50/50 dark:from-slate-900 dark:to-slate-950/90 border border-stone-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm cursor-pointer flex flex-col justify-between transition-colors duration-200 ${
                                  isHealthy
                                    ? 'hover:shadow-lg hover:-translate-y-1 hover:border-emerald-500/30 dark:hover:border-emerald-500/25 transition-all duration-300'
                                    : 'hover:border-stone-300 dark:hover:border-slate-700'
                                }`}
                              >
                              <div className="h-48 relative overflow-hidden">
                                <img
                                  src={plant.photoUrl}
                                  alt={plant.name}
                                  className={`w-full h-full object-cover ${isHealthy ? 'group-hover:scale-105 transition-transform duration-500' : ''}`}
                                  onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 192'%3E%3Crect width='400' height='192' fill='%23f0fdf4'/%3E%3Ctext x='200' y='115' font-size='80' text-anchor='middle'%3E≡اî▒%3C/text%3E%3C/svg%3E"; }}
                                />
                                <div className="absolute top-4 right-4">
                                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full font-mono border shadow-sm ${
                                    plant.healthStatus === 'Healthy'
                                      ? 'bg-emerald-50/90 dark:bg-emerald-950/85 text-emerald-700 dark:text-emerald-300 border-emerald-250/50 dark:border-emerald-800/40 shadow-emerald-500/5'
                                      : plant.healthStatus === 'Warning'
                                      ? 'bg-amber-50/90 dark:bg-amber-950/85 text-amber-700 dark:text-amber-300 border-amber-250/50 dark:border-amber-800/40 shadow-amber-500/5'
                                      : 'bg-red-50/90 dark:bg-red-950/85 text-red-700 dark:text-red-300 border-red-250/50 dark:border-red-800/40 shadow-red-500/5'
                                  }`}>
                                    {plant.healthStatus}
                                  </span>
                                </div>
                              </div>

                              <div className="p-5">
                                <h3 className="text-base font-bold text-stone-900 dark:text-slate-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-450 transition-colors duration-200">
                                  {plant.name}
                                </h3>
                                <p className="text-xs text-stone-400 dark:text-slate-500 mt-1.5 font-mono">
                                  {plant.type} • Planted {new Date(plant.plantingDate).toLocaleDateString()}
                                </p>
                                
                                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
                                  <span>Timeline logs</span>
                                  <span className="font-semibold text-stone-900 dark:text-slate-200 font-mono flex items-center space-x-1">
                                    <span>View Profile</span>
                                    <ChevronRight className={`h-4 w-4 ${isHealthy ? 'group-hover:translate-x-0.5 transition-transform duration-200' : ''}`} />
                                  </span>
                                </div>
                              </div>
                              </motion.div>
                            );
                          })}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Plant Digital Profile Timeline Deep Dive */}
                    {(() => {
                      const plant = plants.find((p) => p.id === selectedPlantId);
                      if (!plant) return null;
                      return (
                        <div className="space-y-6">
                          <button
                            onClick={() => {
                              openPlantsList();
                            }}
                            className="px-4 py-2 border border-stone-250/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-emerald-500/10 hover:border-stone-300 dark:hover:border-emerald-500/40 text-stone-600 dark:text-slate-350 hover:text-stone-900 dark:hover:text-emerald-200 rounded-xl text-xs font-semibold cursor-pointer shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center space-x-1.5"
                          >
                            <span>← Back to list</span>
                          </button>

                          <div className="bg-gradient-to-r from-white to-stone-50/20 dark:from-slate-900 dark:to-slate-950/40 border border-stone-200/60 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                            <div className="flex flex-col md:flex-row gap-6 w-full lg:w-auto">
                              <img
                                src={plant.photoUrl}
                                alt={plant.name}
                                className="h-32 w-32 rounded-2xl object-cover border border-stone-200 dark:border-slate-800 shadow-md self-start"
                                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23f0fdf4' rx='12'/%3E%3Ctext x='64' y='82' font-size='56' text-anchor='middle'%3E≡اî▒%3C/text%3E%3C/svg%3E"; }}
                              />
                              <div className="flex-1">
                                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full font-mono border shadow-sm ${
                                  plant.healthStatus === 'Healthy'
                                    ? 'bg-emerald-50/90 dark:bg-emerald-950/85 text-emerald-700 dark:text-emerald-300 border-emerald-250/50 dark:border-emerald-800/40'
                                    : plant.healthStatus === 'Warning'
                                    ? 'bg-amber-50/90 dark:bg-amber-950/85 text-amber-700 dark:text-amber-300 border-amber-250/50 dark:border-amber-800/40'
                                    : 'bg-red-50/90 dark:bg-red-950/85 text-red-700 dark:text-red-300 border-red-250/50 dark:border-red-800/40'
                                }`}>
                                  {plant.healthStatus}
                                </span>
                                <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50 mt-2">
                                  {plant.name}
                                </h1>
                                <p className="text-xs text-stone-500 dark:text-slate-400 font-mono mt-1">
                                  Cultivar Type: <span className="font-semibold text-stone-800 dark:text-slate-200">{plant.type}</span> • Registered {new Date(plant.plantingDate).toLocaleDateString()}
                                </p>
                                <p className="text-[10px] text-stone-400 dark:text-slate-500 font-mono mt-1">
                                  ID: {plant.id}
                                </p>
                              </div>
                            </div>

                            <div className="flex space-x-3 w-full sm:w-auto mt-4 lg:mt-0">
                              <button
                                onClick={() => {
                                  setScanTargetPlantId(plant.id);
                                  setScanCatalogMode(false);
                                  setCapturedImage(null);
                                  setAnalysisResult(null);
                                  setScanError('');
                                  setScanStep('select');
                                  setSelectedPlantId(null);
                                  setActiveTab('scan');
                                  pushWorkspaceUrl('/Plant-Doctor');
                                }}
                                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all"
                              >
                                <Camera className="h-4 w-4" />
                                <span>Scan Plant</span>
                              </button>
                              <button
                                onClick={() => handleDeletePlant(plant.id)}
                                className="flex-1 sm:flex-none px-4 py-2.5 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                              >
                                <Trash className="h-4 w-4" />
                                <span>Delete Plant</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Notes logging & care reminders */}
                            <div className="lg:col-span-1 space-y-6">
                              {/* Timeline logger */}
                              <div className="bg-gradient-to-b from-white to-stone-50/50 dark:from-slate-900 dark:to-slate-950/90 border border-stone-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono pb-3 border-b border-stone-100 dark:border-slate-800/80">
                                  Add timeline entry
                                </h3>
                                <form onSubmit={handleAddNote} className="space-y-3">
                                  <textarea
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    placeholder="e.g. Applied morning watering with nitrogen feed..."
                                    rows={3}
                                    className="block w-full px-3 py-2.5 text-xs border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/60 rounded-xl focus:outline-none text-stone-950 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500/60 placeholder-stone-400 dark:placeholder-slate-500 transition-all duration-200"
                                  />
                                  {newNotePhoto ? (
                                    <div className="relative">
                                      <img
                                        src={newNotePhoto}
                                        alt="Journal photo preview"
                                        className="w-full h-28 object-cover rounded-xl border border-stone-250 dark:border-slate-800 shadow-sm"
                                        onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 112'%3E%3Crect width='400' height='112' fill='%23fafaf9'/%3E%3Ctext x='200' y='70' font-size='48' text-anchor='middle'%3E≡اô╖%3C/text%3E%3C/svg%3E"; }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setNewNotePhoto(null)}
                                        className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg text-stone-550 dark:text-slate-400 hover:text-red-650 dark:hover:text-red-400 shadow-xs cursor-pointer"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center space-x-2 py-3 border border-dashed border-stone-300 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 rounded-xl text-xs text-stone-450 dark:text-slate-455 cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-950/40 hover:text-stone-700 dark:hover:text-slate-200 transition-all duration-200">
                                      <Camera className="h-3.5 w-3.5 text-stone-400 dark:text-slate-500" />
                                      <span>Attach a photo (optional)</span>
                                      <input type="file" accept="image/*" onChange={handleNotePhotoChange} className="hidden" />
                                    </label>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={isSavingNote || !newNoteContent.trim()}
                                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all duration-200"
                                  >
                                    {isSavingNote ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : (
                                      <>
                                        <Send className="h-3.5 w-3.5" />
                                        <span>Post Log Entry</span>
                                      </>
                                    )}
                                  </button>
                                </form>
                              </div>

                              {/* Care Reminders */}
                              <div className="bg-gradient-to-b from-white to-stone-50/50 dark:from-slate-900 dark:to-slate-950/90 border border-stone-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono pb-3 border-b border-stone-100 dark:border-slate-800/80">
                                  Care reminders
                                </h3>
                                <form onSubmit={handleAddReminder} className="space-y-2">
                                  <select
                                    value={newReminderType}
                                    onChange={(e: any) => setNewReminderType(e.target.value)}
                                    className="block w-full px-3 py-2 text-xs border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/60 rounded-xl focus:outline-none text-stone-950 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10 focus:border-emerald-500"
                                  >
                                    <option value="Watering">💧 Watering</option>
                                    <option value="Fertilizing">🌱 Fertilizing</option>
                                    <option value="Pruning">✂️ Pruning</option>
                                    <option value="Repotting">🪴 Repotting</option>
                                    <option value="Pest Check">🔍 Pest Check</option>
                                    <option value="Custom">✨ Custom</option>
                                  </select>
                                  <div className="flex space-x-2">
                                    <input
                                      type="date"
                                      value={newReminderDueDate}
                                      onChange={(e) => setNewReminderDueDate(e.target.value)}
                                      className="flex-1 px-3 py-2 text-xs border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/60 rounded-xl focus:outline-none text-stone-950 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10 focus:border-emerald-500"
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      value={newReminderRecurringDays}
                                      onChange={(e) => setNewReminderRecurringDays(e.target.value)}
                                      placeholder="Repeat (days)"
                                      className="w-28 px-3 py-2 text-xs border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/60 rounded-xl focus:outline-none text-stone-950 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-500/10"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={isAddingReminder}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer hover:shadow active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 transition-all duration-200"
                                  >
                                    {isAddingReminder ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Add Reminder</span>}
                                  </button>
                                </form>

                                <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-1">
                                  {plantReminders.length === 0 ? (
                                    <p className="text-[11px] text-stone-400 dark:text-slate-500 text-center py-4 font-medium">No reminders yet for this plant.</p>
                                  ) : (
                                    plantReminders.map((reminder) => (
                                      <div
                                        key={reminder.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all duration-200 ${
                                          reminder.completed
                                            ? 'border-stone-100/80 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/20 text-stone-400 dark:text-slate-500'
                                            : 'border-emerald-100/80 dark:border-emerald-950/40 bg-emerald-50/30 dark:bg-emerald-950/10 text-stone-750 dark:text-slate-200 hover:border-emerald-200 dark:hover:border-emerald-900/60'
                                        }`}
                                      >
                                        <div>
                                          <span className={`font-semibold ${reminder.completed ? 'line-through opacity-70' : ''}`}>
                                            {reminder.reminderType}
                                          </span>
                                          <span className="block text-[10px] text-stone-400 dark:text-slate-500 font-mono mt-0.5">
                                            Due {new Date(reminder.dueDate).toLocaleDateString()}
                                          </span>
                                        </div>
                                        {!reminder.completed && (
                                          <button
                                            onClick={() => handleCompleteReminder(reminder.id)}
                                            className="p-1.5 text-stone-450 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 rounded-lg cursor-pointer transition-colors"
                                            title="Mark done"
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Digital timeline timeline chronological display */}
                            <div className="lg:col-span-2 bg-gradient-to-b from-white to-stone-50/50 dark:from-slate-900 dark:to-slate-950/90 border border-stone-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
                              <h2 className="text-base font-bold text-stone-900 dark:text-slate-50 pb-4 border-b border-stone-100 dark:border-slate-800/80">
                                Chronological Crop Health History
                              </h2>
                              <div className="mt-6 relative border-l-2 border-stone-200/70 dark:border-slate-800 pl-6 ml-3 space-y-6">
                                {plantNotes.length === 0 ? (
                                  <div className="text-stone-400 dark:text-slate-500 text-xs text-center py-10 font-medium">No historical entries found. Create one above!</div>
                                ) : (
                                  plantNotes.map((note) => (
                                    <div key={note.id} className="relative">
                                      {/* Marker Dot */}
                                      <div className="absolute -left-[32px] mt-1 bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-800 p-1 rounded-full text-emerald-600 dark:text-emerald-400 shadow-sm transition-colors duration-200">
                                        <div className="h-2.5 w-2.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                                      </div>

                                      <div className="text-xs text-stone-400 dark:text-slate-500 font-mono flex items-center space-x-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                      {note.photoUrl && (
                                        <img
                                          src={note.photoUrl}
                                          alt="Journal entry photo"
                                          className="mt-2.5 w-full max-w-sm h-40 object-cover rounded-xl border border-stone-200 dark:border-slate-800 shadow-xs"
                                          onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.onerror = null;
                                            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 128'%3E%3Crect width='300' height='128' fill='%23fafaf9' rx='10'/%3E%3Ctext x='150' y='80' font-size='56' text-anchor='middle'%3E≡اô╖%3C/text%3E%3C/svg%3E";
                                          }}
                                        />
                                      )}
                                      <p className="text-xs text-stone-750 dark:text-slate-350 mt-2 leading-relaxed whitespace-pre-wrap bg-stone-50/50 dark:bg-slate-950/40 border border-stone-200/50 dark:border-slate-800/60 p-4 rounded-xl shadow-xs transition-colors duration-200">
                                        {note.content}
                                      </p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. AI SCAN LAB TAB (Gardener) */}
            {activeTab === 'scan' && user.accountType === 'Gardener' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">Neural Diagnosis & Inspection Lab</h1>
                    <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">Gemini-powered diagnosis for full plants, leaves, stems, fruit, flowers, roots, or field context.</p>
                  </div>
                  <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <Sparkles className="h-4 w-4" />
                    <span>Gemini vision analysis</span>
                  </div>
                </div>

                {scanError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                    {scanError}
                  </div>
                )}

                {scanStep === 'select' && (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-2xl border border-stone-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <label className="block text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-slate-500 font-mono">Target plant</label>
                      <select
                        value={scanTargetPlantId}
                        onChange={(e) => {
                          setScanTargetPlantId(e.target.value);
                          setScanCatalogMode(false);
                          setScanError('');
                        }}
                        className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <option value="">Choose registered plant</option>
                        {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                      </select>

                      <label className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-semibold text-stone-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={scanCatalogMode}
                          onChange={(e) => {
                            setScanCatalogMode(e.target.checked);
                            if (e.target.checked) setScanTargetPlantId('');
                          }}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        <span>Catalog a new crop from the image</span>
                      </label>

                      {selectedScanPlant && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <img src={selectedScanPlant.photoUrl} alt={selectedScanPlant.name} className="h-12 w-12 rounded-lg object-cover" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-stone-900 dark:text-slate-50">{selectedScanPlant.name}</p>
                            <p className="truncate text-xs text-stone-500 dark:text-slate-400">{selectedScanPlant.type}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                            <Camera className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-stone-900 dark:text-slate-50">Camera Capture</h3>
                            <p className="text-xs text-stone-500 dark:text-slate-400">Whole plant or any visible part.</p>
                          </div>
                        </div>
                        <button
                          onClick={startCamera}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:active:bg-emerald-600"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Open Camera</span>
                        </button>
                      </div>

                      <div className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
                            <Upload className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-stone-900 dark:text-slate-50">Photo Upload</h3>
                            <p className="text-xs text-stone-500 dark:text-slate-400">PNG, JPEG, or phone photos.</p>
                          </div>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Choose Image</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {scanStep === 'camera' && (
                  <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-stone-800 bg-black shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex flex-col gap-3 border-t border-white/10 bg-stone-950/95 p-4 sm:flex-row sm:items-center sm:justify-center">
                      <button
                        onClick={() => {
                          stopCamera();
                          setScanStep('select');
                        }}
                        className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={captureSnapshot}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
                        title="Capture Photo"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Capture Image</span>
                      </button>
                    </div>
                  </div>
                )}

                {scanStep === 'analyzing' && (
                  <div className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <h3 className="mt-5 text-base font-bold text-stone-900 dark:text-slate-50 font-mono">Gemini Analysis In Progress</h3>
                      <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-slate-400">
                        Inspecting visible plant organs, image quality, symptoms, pests, stress, and treatment options.
                      </p>
                    </div>

                    <div className="mt-5 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left text-xs leading-relaxed text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <p className="font-semibold font-mono">Image quality note:</p>
                      <p>Use clear lighting and include the affected plant area whenever possible.</p>
                    </div>
                  </div>
                )}

                {scanStep === 'result' && capturedImage && !analysisResult && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono">Captured plant image</span>
                      <img
                        src={capturedImage}
                        alt="Captured plant"
                        className="mt-4 aspect-[4/3] w-full rounded-xl border border-stone-200 object-cover dark:border-slate-800"
                      />
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => {
                            setCapturedImage(null);
                            setScanError('');
                            setScanStep('select');
                          }}
                          className="flex-1 rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Retake
                        </button>
                        <button
                          onClick={runAIAnalysis}
                          disabled={!canRunScan || isAnalyzing}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-xs font-semibold tracking-wide text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                        >
                          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          <span>Run Neural Diagnosis</span>
                        </button>
                      </div>
                      <div className="mt-4 space-y-3 border-t border-stone-100 pt-4 text-left dark:border-slate-800">
                        <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={scanNeedsCatalog}
                            onChange={(e) => setScanCatalogMode(e.target.checked)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          Catalog New Crop from this photo
                        </label>
                        {scanNeedsCatalog && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={scanNewPlantName}
                              onChange={(e) => setScanNewPlantName(e.target.value)}
                              placeholder="Plant name"
                              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <input
                              type="text"
                              value={scanNewPlantType}
                              onChange={(e) => setScanNewPlantType(e.target.value)}
                              placeholder="Crop type"
                              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                      <div className="flex h-full min-h-56 flex-col justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
                        <Sparkles className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-slate-50">Ready for Gemini diagnosis</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500 dark:text-slate-400">
                          The image will be analyzed against the selected crop profile and saved with generated treatment steps.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Result Displays */}
                {scanStep === 'result' && analysisResult && (
                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono">Analyzed plant image</span>
                      <img
                        src={analysisResult.scan.imageUrl}
                        alt="Analyzed plant"
                        className="mt-4 aspect-[4/3] w-full rounded-xl border border-stone-200 object-cover dark:border-slate-800"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.onerror = null;
                          // If the Supabase Storage URL failed (e.g. bucket not yet public),
                          // fall back to the in-memory captured image from this scan session
                          if (capturedImage && img.src !== capturedImage) {
                            img.src = capturedImage;
                          } else {
                            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f0fdf4'/%3E%3Ctext x='200' y='170' font-size='80' text-anchor='middle'%3E≡ا¤ش%3C/text%3E%3C/svg%3E";
                          }
                        }}
                      />
                      {selectedScanPlant && (
                        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 text-left dark:border-slate-800 dark:bg-slate-950/60">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono">Saved to plant record</span>
                          <p className="mt-1 text-sm font-bold text-stone-900 dark:text-slate-50">{selectedScanPlant.name}</p>
                          <p className="text-xs text-stone-500 dark:text-slate-400">{selectedScanPlant.type}</p>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setCapturedImage(null);
                          setAnalysisResult(null);
                          setScanError('');
                          setScanStep('select');
                        }}
                        className="mt-4 w-full rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Reset and Scan New
                      </button>
                    </div>

                    <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                      <div className="flex flex-col gap-4 border-b border-stone-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-stone-400 dark:text-slate-500 font-semibold font-mono">GEMINI DIAGNOSIS OUTCOME</span>
                          </div>
                          <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 dark:text-slate-50">{analysisResult.scan.diagnosis}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center font-mono text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-300">CONFIDENCE</span>
                            <span className="font-bold text-lg">{analysisResult.scan.confidence}%</span>
                          </div>
                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center font-mono text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                            <span className="block text-[10px] text-amber-600 dark:text-amber-300">SEVERITY</span>
                            <span className="font-bold text-lg uppercase">{analysisResult.scan.severity}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono">Symptoms Analysis</h4>
                        <p className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-relaxed text-stone-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">{analysisResult.scan.symptoms}</p>
                      </div>

                      {hasSpecimenMismatch && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                            <div>
                              <h4 className="text-sm font-bold">Possible specimen mismatch</h4>
                              <p className="mt-1 text-xs leading-relaxed">
                                Gemini indicates the uploaded image may not match the selected plant. The scan is still saved under the selected plant record so you can review it in that plant timeline.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expert Pathologist consultation request queue block */}
                      <div className="flex flex-col gap-4 rounded-xl border border-stone-800 bg-stone-900 p-4 text-stone-100 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-white tracking-wide font-mono flex items-center space-x-1.5">
                            <Award className="h-4 w-4 text-emerald-400" />
                            <span>Pathologist Expert Review Verification</span>
                          </h4>
                          <p className="text-[11px] text-stone-400 mt-1 leading-normal max-w-sm">
                            If the AI classification looks questionable, request a certified human expert pathogenetic review.
                          </p>
                        </div>

                        <button
                          onClick={submitExpertReview}
                          disabled={expertSubmitted}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          {expertSubmitted ? 'Expert Review Enqueued' : 'Ask an Expert'}
                        </button>
                      </div>

                      {expertReviewResponse && (
                        <div className="space-y-2 rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <span className="block text-xs font-semibold font-mono text-emerald-800 dark:text-emerald-200">Pathologist Review Response Received:</span>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-700 dark:text-slate-300">{expertReviewResponse.expertReply}</p>
                        </div>
                      )}

                      {/* Diagnostic treatment recommendation plans tabs */}
                      <div className="border-t border-stone-100 pt-6 dark:border-slate-800">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 font-mono">Generated Treatment Protocol</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          {/* Organic treatments column */}
                          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/25 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                            <h4 className="flex items-center space-x-1.5 text-xs font-semibold font-mono text-emerald-950 uppercase tracking-wider dark:text-emerald-200">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>Organic Treatments</span>
                            </h4>
                            <ul className="space-y-2">
                              {(analysisResult.treatment?.organicSteps || []).map((step: string, i: number) => (
                                <li key={i} className="flex items-start space-x-2 text-xs leading-normal text-stone-700 dark:text-slate-300">
                                  <span className="shrink-0 font-bold text-emerald-700 dark:text-emerald-300 font-mono">{i+1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                              {(!analysisResult.treatment?.organicSteps || analysisResult.treatment.organicSteps.length === 0) && (
                                <li className="text-xs leading-normal text-stone-500 dark:text-slate-400">No organic steps were returned for this scan.</li>
                              )}
                            </ul>
                          </div>

                          {/* Chemical treatments column */}
                          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
                            <h4 className="flex items-center space-x-1.5 text-xs font-semibold font-mono text-stone-950 uppercase tracking-wider dark:text-slate-100">
                              <span className="h-2 w-2 rounded-full bg-stone-500" />
                              <span>Chemical Controls</span>
                            </h4>
                            <ul className="space-y-2">
                              {(analysisResult.treatment?.chemicalSteps || []).map((step: string, i: number) => (
                                <li key={i} className="flex items-start space-x-2 text-xs leading-normal text-stone-700 dark:text-slate-300">
                                  <span className="shrink-0 font-bold text-stone-700 dark:text-slate-300 font-mono">{i+1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                              {(!analysisResult.treatment?.chemicalSteps || analysisResult.treatment.chemicalSteps.length === 0) && (
                                <li className="text-xs leading-normal text-stone-500 dark:text-slate-400">No chemical controls were returned for this scan.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3b. CROP SCANNER TAB (Commercial Farmer) */}
            {activeTab === 'scan' && user.accountType === 'Farmer' && (
              <FarmerBatchScanSection farms={farms} onScanComplete={refreshAll} />
            )}

            {/* 3c. YIELD & RISK ANALYTICS TAB (Commercial Farmer) */}
            {activeTab === 'analytics' && user.accountType === 'Farmer' && (
              <FarmerAnalyticsSection farms={farms} />
            )}

            {/* 3d. IRRIGATION & INPUTS TAB (Commercial Farmer) */}
            {activeTab === 'irrigation' && user.accountType === 'Farmer' && (
              <FarmerIrrigationSection farms={farms} plants={plants} />
            )}

            {/* 3e. LABOR/TASKS TAB (Commercial Farmer) */}
            {activeTab === 'labor' && user.accountType === 'Farmer' && (
              <FarmerLaborSection farms={farms} />
            )}

            {/* 3f. BATCHES TAB (Nursery Operator) */}
            {activeTab === 'batches' && user.accountType === 'Nursery' && (
              <NurseryBatchesSection />
            )}

            {/* 3g. HEALTH SCREENING TAB (Nursery Operator) */}
            {activeTab === 'scan' && user.accountType === 'Nursery' && (
              <NurseryHealthScreeningSection />
            )}

            {/* 3h. QUALITY GRADING TAB (Nursery Operator) */}
            {activeTab === 'grading' && user.accountType === 'Nursery' && (
              <NurseryGradingSection />
            )}

            {/* 3i. ORDERS & DISPATCH TAB (Nursery Operator) */}
            {activeTab === 'orders' && user.accountType === 'Nursery' && (
              <NurseryOrdersSection />
            )}

            {/* 3j. LOSS & TURNOVER REPORTS TAB (Nursery Operator) */}
            {activeTab === 'reports' && user.accountType === 'Nursery' && (
              <NurseryReportsSection />
            )}

            {/* 4. TREATMENTS TAB */}
            {activeTab === 'treatments' && (
              <CarePlansSection
                plants={plants}
                carePlanDetail={carePlanDetail}
                carePlanLoadingId={carePlanLoadingId}
                toastMessage={toastMessage}
                onOpenCarePlan={openCarePlanDetail}
                onCloseCarePlan={() => setCarePlanDetail(null)}
                onMarkFullyTreated={markPlantFullyTreated}
                onOpenTimeline={(plantId) => {
                  setCarePlanDetail(null);
                  openPlantProfile(plantId);
                }}
              />
            )}
            {/* 5. COMMUNITY FORUM TAB */}
            {activeTab === 'community' && (
              <CommunitySection
                posts={posts}
                postsLoading={postsLoading}
                userId={user.id}
                communityCategory={communityCategory}
                activePostComments={activePostComments}
                activePostIdForComments={activePostIdForComments}
                newCommentText={newCommentText}
                onCategoryChange={setCommunityCategory}
                onShowAddPost={() => setShowAddPostModal(true)}
                onLikePost={handleLikePost}
                onFetchComments={fetchComments}
                onCommentTextChange={setNewCommentText}
                onAddComment={handleAddComment}
              />
            )}
            {/* 6. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <SettingsSection
                user={user}
                settingsName={settingsName}
                settingsLocation={settingsLocation}
                settingsUnits={settingsUnits}
                settingsPlan={settingsPlan}
                settingsAccountType={settingsAccountType}
                settingsError={settingsError}
                settingsSuccess={settingsSuccess}
                settingsSaving={settingsSaving}
                onNameChange={setSettingsName}
                onLocationChange={setSettingsLocation}
                onUnitsChange={setSettingsUnits}
                onPlanChange={setSettingsPlan}
                onAccountTypeChange={setSettingsAccountType}
                onSubmit={handleSaveSettings}
              />
            )}
            {false && activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-xl mx-auto bg-white border border-stone-200 rounded-3xl p-8 shadow-sm space-y-6"
              >
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-stone-900">Profile & Configuration Settings</h1>
                  <p className="text-sm text-stone-500 mt-1">Manage physical settings and subscription quotas.</p>
                </div>

                {settingsError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                    {settingsError}
                  </div>
                )}

                {settingsSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
                    {settingsSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-4 font-sans">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Display Name</label>
                    <input
                      type="text"
                      required
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Operation Location</label>
                    <input
                      type="text"
                      required
                      value={settingsLocation}
                      onChange={(e) => setSettingsLocation(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Measurement System</label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => setSettingsUnits('metric')}
                        className={`py-2 rounded-xl border text-xs font-semibold font-mono cursor-pointer transition-all ${settingsUnits === 'metric' ? 'border-emerald-600 bg-emerald-50/30 text-emerald-950' : 'border-stone-200 bg-white text-stone-600'}`}
                      >
                        Metric (┬░C, km/h)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsUnits('imperial')}
                        className={`py-2 rounded-xl border text-xs font-semibold font-mono cursor-pointer transition-all ${settingsUnits === 'imperial' ? 'border-emerald-600 bg-emerald-50/30 text-emerald-950' : 'border-stone-200 bg-white text-stone-600'}`}
                      >
                        Imperial (┬░F, mph)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Quota Plan Tier</label>
                    <select
                      value={settingsPlan}
                      onChange={(e: any) => setSettingsPlan(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Free">Free Account Plan</option>
                      <option value="Pro">Pro Pathologist Plan ($29/mo)</option>
                      <option value="Enterprise">Enterprise Operations ($149/mo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Operation Type</label>
                    <select
                      value={settingsAccountType}
                      onChange={(e: any) => setSettingsAccountType(e.target.value)}
                      className="mt-1 block w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Gardener">≡اî▒ Home / Hobbyist Gardener</option>
                      <option value="Farmer">≡اأ£ Commercial Farmer</option>
                      <option value="Nursery">≡اî┐ Farm Dashboard / Nursery Operator</option>
                      <option value="Agribusiness">≡ات Agribusiness Professional</option>
                    </select>
                    {settingsAccountType !== user.accountType && (
                      <p className="text-[11px] text-amber-600 mt-1.5">
                        Switching roles changes your dashboard layout and navigation. Any data tied to your current role (e.g. inventory, expenses) stays intact and reappears if you switch back ظ¤ nothing is deleted.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wider transition-all shadow-sm cursor-pointer"
                  >
                    Save & Sync Settings
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
      </DashboardShell>

      {/* --- ADD PLANT / CROP MODAL OVERLAY --- */}
      {showAddPlantModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative"
          >
            <button
              onClick={() => {
                setShowAddPlantModal(false);
                setNewPlantPhoto(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold tracking-tight text-stone-950 dark:text-slate-50 font-mono flex items-center space-x-2">
              <Sprout className="h-5 w-5 text-emerald-600" />
              <span>Catalog New Crop</span>
            </h2>

            <form onSubmit={handleAddPlant} className="mt-4 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Crop/Plant Title</label>
                <input
                  type="text"
                  required
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  placeholder="e.g. heirloom cherry tomato vine #4"
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Cultivar Type / Class</label>
                <input
                  type="text"
                  required
                  value={newPlantType}
                  onChange={(e) => setNewPlantType(e.target.value)}
                  placeholder="e.g. Tomato, Rose, Wheat, Citrus"
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Planting Date</label>
                <input
                  type="date"
                  required
                  value={newPlantDate}
                  onChange={(e) => setNewPlantDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Plant Photo</label>
                {newPlantPhoto ? (
                  <div className="relative mt-1">
                    <img
                      src={newPlantPhoto}
                      alt="New plant preview"
                      className="h-36 w-full rounded-xl border border-stone-200 dark:border-slate-800 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPlantPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg text-stone-500 dark:text-slate-400 hover:text-red-650 dark:hover:text-red-300 cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center justify-center space-x-2 py-3 border border-dashed border-stone-300 dark:border-slate-800 rounded-xl text-xs text-stone-500 dark:text-slate-400 cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-900 hover:text-stone-700 dark:hover:text-slate-200">
                    <Camera className="h-4 w-4" />
                    <span>Upload plant photo</span>
                    <input type="file" accept="image/*" onChange={handleNewPlantPhotoChange} className="hidden" />
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:active:bg-emerald-700 text-white rounded-xl font-semibold tracking-wider cursor-pointer shadow-sm transition-colors duration-200"
              >
                Register Crop
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- ADD COMMUNITY THREAD MODAL OVERLAY --- */}
      {showAddPostModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative"
          >
            <button
              onClick={() => setShowAddPostModal(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3 border-b border-stone-100 pb-4 dark:border-slate-800">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-stone-950 dark:text-slate-50">Create discussion thread</h2>
                <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">Share a field observation, diagnosis question, or treatment note.</p>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Thread Title</label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Signs of citrus thrips on grapefruits?"
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Forum Category</label>
                <select
                  value={newPostCategory}
                  onChange={(e: any) => setNewPostCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="General">General Gardening / Farming</option>
                  <option value="Diseases">Plant Diseases & Pathogens</option>
                  <option value="Tips">Pruning & Watering Tips</option>
                  <option value="Farming Tech">Drip Irrigation & Soil sensors</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 dark:text-slate-400 uppercase font-semibold font-mono tracking-wider">Thread Content</label>
                <textarea
                  required
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Describe your question, observation, or recommendations..."
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-stone-200 dark:border-slate-800 rounded-xl bg-stone-50 dark:bg-slate-950 text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white rounded-xl font-semibold tracking-wider cursor-pointer shadow-sm transition-colors"
              >
                Launch Thread
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* --- NOTIFICATIONS SIDE DRAWER --- */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40 backdrop-blur-xs flex justify-end">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 h-full border-l border-stone-200 dark:border-slate-800 shadow-xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800">
                <h3 className="text-base font-bold text-stone-950 dark:text-slate-50 font-mono">Notifications History</h3>
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="p-1 text-stone-400 dark:text-slate-500 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 overflow-y-auto max-h-[75vh] pr-2">
                {notifications.length === 0 ? (
                  <p className="text-sm text-stone-400 dark:text-slate-500 text-center py-12 font-medium">No active notifications received yet.</p>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className="p-4 rounded-xl border border-stone-200 bg-stone-50 dark:border-slate-800/90 dark:bg-slate-950/90 hover:bg-stone-100 dark:hover:bg-slate-900/60 transition-all flex flex-col gap-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${notif.read ? 'bg-transparent' : 'bg-emerald-600 dark:bg-emerald-450'}`} />
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-200 rounded uppercase tracking-wider">{notif.category}</span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 dark:text-slate-500">{new Date(notif.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-slate-100 leading-snug mt-1">{notif.title}</h4>
                      <p className="text-xs text-stone-600 dark:text-slate-200 leading-relaxed mt-0.5">{notif.message}</p>
                      <span className="text-[10px] font-mono text-stone-400 dark:text-slate-500 block text-right mt-1.5">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowNotifDrawer(false)}
              className="w-full py-3 border border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-stone-700 dark:text-slate-350 cursor-pointer text-center font-mono"
            >
              Close Drawer
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-stone-50 text-stone-800 dark:bg-slate-950 dark:text-slate-100">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm font-medium tracking-tight font-sans">Bootstrapping AgriScan AI core modules...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}



