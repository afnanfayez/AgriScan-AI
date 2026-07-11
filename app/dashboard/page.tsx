'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import DashboardShell from '@/components/dashboard/dashboard-shell';
import { ROLE_CONFIG } from '@/components/dashboard/role-config';
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
} from 'lucide-react';

export default function DashboardPage() {
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
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [scanStep, setScanStep] = useState<'select' | 'camera' | 'analyzing' | 'result'>('select');
  const [scanTargetPlantId, setScanTargetPlantId] = useState('');
  const [scanCatalogMode, setScanCatalogMode] = useState(false);
  const [scanNewPlantName, setScanNewPlantName] = useState('');
  const [scanNewPlantType, setScanNewPlantType] = useState('');
  const [expertSubmitted, setExpertSubmitted] = useState(false);
  const [expertReviewResponse, setExpertReviewResponse] = useState<any>(null);

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

  // Video Ref for Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setSelectedPlantId(null);
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
      alert('Camera access denied or unavailable. Please use the file upload fallback.');
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

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setAnalysisResult(null);
        stopCamera();
        setScanStep('result');
      }
    }
  };

  // File Upload fallback handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setAnalysisResult(null);
        setScanStep('result');
      };
      reader.readAsDataURL(file);
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
        alert(data.error || 'Failed to catalog crop from scan photo.');
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
      alert('An error occurred while cataloging the crop.');
      return null;
    }
  };

  // Analyze Image with Gemini AI on Server Side
  const runAIAnalysis = async () => {
    if (!capturedImage) return;

    let targetPlantId = scanCatalogMode ? '' : (scanTargetPlantId || (plants[0]?.id || ''));
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
        await refreshAll();
      } else {
        alert(data.error || 'AI Scan analysis failed');
        setScanStep('select');
      }
    } catch (error) {
      console.error('Scan analysis crash:', error);
      alert('An error occurred during leaf analysis.');
      setScanStep('select');
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
      }
    } catch (error) {
      console.error('Failed to resolve treatment:', error);
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

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName,
          location: settingsLocation,
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

  return (
    <>
      <DashboardShell
        user={user}
        activeTab={activeTab}
        onTabChange={(tabId) => { setActiveTab(tabId); setSelectedPlantId(null); }}
        weatherData={weatherData}
        onToggleNotifDrawer={() => {
          setShowNotifDrawer(!showNotifDrawer);
          if (!showNotifDrawer) markAllNotificationsRead();
        }}
        unreadCount={unreadCount}
        onLogout={async () => { await logout(); router.push('/login'); }}
      >
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
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
                        <button onClick={() => setActiveTab('plants')} className="inline-flex items-center gap-1.5 self-start rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
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
                                    setSelectedPlantId(plant.id);
                                    setActiveTab('plants');
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

            {/* 2. MY PLANTS TAB */}
            {activeTab === 'plants' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {!selectedPlantId ? (
                  <div>
                    {/* Plants List View */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">My Plants & Crops</h1>
                        <p className="text-sm text-stone-500 mt-1">Catalog and inspect crops, vines, and farm dashboard zones.</p>
                      </div>
                      <button
                        onClick={() => {
                          setNewPlantFarmId(farms[0]?.id || '');
                          setShowAddPlantModal(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide shadow-sm flex items-center space-x-2 self-start cursor-pointer"
                      >
                        <Plus className="h-4.5 w-4.5" />
                        <span>Add New Crop</span>
                      </button>
                    </div>

                    {/* Filters bar */}
                    <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                      <div className="flex flex-1 items-center space-x-2 bg-stone-100 rounded-xl px-3 py-2 text-stone-500 max-w-md">
                        <Search className="h-4.5 w-4.5" />
                        <input
                          type="text"
                          value={plantSearch}
                          onChange={(e) => setPlantSearch(e.target.value)}
                          placeholder="Search cultivar types or names..."
                          className="w-full bg-transparent text-xs text-stone-900 placeholder-stone-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-3 text-xs font-mono">
                        <span className="text-stone-400 uppercase tracking-wider font-semibold">Status:</span>
                        <div className="flex bg-stone-100 rounded-lg p-0.5">
                          {['all', 'Healthy', 'Warning', 'Critical'].map((status) => (
                            <button
                              key={status}
                              onClick={() => setStatusFilter(status)}
                              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer transition-all ${statusFilter === status ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'}`}
                            >
                              {status === 'all' ? 'All' : status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Plant Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                      {plants
                        .filter((p) => {
                          const matchesSearch = p.name.toLowerCase().includes(plantSearch.toLowerCase()) || p.type.toLowerCase().includes(plantSearch.toLowerCase());
                          const matchesStatus = statusFilter === 'all' || p.healthStatus === statusFilter;
                          return matchesSearch && matchesStatus;
                        })
                        .map((plant) => (
                          <div
                            key={plant.id}
                            onClick={() => setSelectedPlantId(plant.id)}
                            className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="h-48 relative">
                              <img
                                src={plant.photoUrl}
                                alt={plant.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 192'%3E%3Crect width='400' height='192' fill='%23f0fdf4'/%3E%3Ctext x='200' y='115' font-size='80' text-anchor='middle'%3E≡اî▒%3C/text%3E%3C/svg%3E"; }}
                              />
                              <div className="absolute top-4 right-4">
                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full font-mono border ${plant.healthStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : plant.healthStatus === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {plant.healthStatus}
                                </span>
                              </div>
                            </div>

                            <div className="p-5">
                              <h3 className="text-base font-semibold text-stone-950">{plant.name}</h3>
                              <p className="text-xs text-stone-400 mt-1 font-mono">{plant.type} ظت Planted {new Date(plant.plantingDate).toLocaleDateString()}</p>
                              
                              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                                <span>Timeline logs</span>
                                <span className="font-semibold text-stone-900 font-mono flex items-center space-x-1">
                                  <span>View Profile</span>
                                  <ChevronRight className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Plant Digital Profile Timeline Deep Dive */}
                    {(() => {
                      const plant = plants.find((p) => p.id === selectedPlantId);
                      if (!plant) return null;
                      return (
                        <div className="space-y-6">
                          <button
                            onClick={() => setSelectedPlantId(null)}
                            className="px-4 py-2 border border-stone-200 hover:bg-stone-50 bg-white rounded-xl text-xs font-semibold cursor-pointer text-stone-600 shadow-sm"
                          >
                            ظ Back to list
                          </button>

                          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-6 justify-between">
                            <div className="flex flex-col md:flex-row gap-6">
                              <img
                                src={plant.photoUrl}
                                alt={plant.name}
                                className="h-32 w-32 rounded-2xl object-cover border border-stone-200 self-start"
                                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23f0fdf4' rx='12'/%3E%3Ctext x='64' y='82' font-size='56' text-anchor='middle'%3E≡اî▒%3C/text%3E%3C/svg%3E"; }}
                              />
                              <div>
                                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full font-mono border ${plant.healthStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : plant.healthStatus === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {plant.healthStatus}
                                </span>
                                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mt-2">{plant.name}</h1>
                                <p className="text-sm text-stone-500 font-mono mt-1">Cultivar Type: {plant.type} ظت Registered {new Date(plant.plantingDate).toLocaleDateString()}</p>
                                
                                <div className="mt-4 flex space-x-3">
                                  <button
                                    onClick={() => {
                                      setScanTargetPlantId(plant.id);
                                      setCapturedImage(null);
                                      setScanStep('select');
                                      setActiveTab('scan');
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide flex items-center space-x-2 cursor-pointer shadow-sm"
                                  >
                                    <Camera className="h-4 w-4" />
                                    <span>Scan Plant Leaf</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlant(plant.id)}
                                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold cursor-pointer"
                                  >
                                    Archive Crop
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Notes logging & care reminders */}
                            <div className="lg:col-span-1 space-y-6">
                              <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 font-mono pb-3 border-b">Add timeline entry</h3>
                                <form onSubmit={handleAddNote} className="mt-4 space-y-3">
                                  <textarea
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    placeholder="e.g. Applied morning watering with nitrogen feed..."
                                    rows={3}
                                    className="block w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-xl focus:outline-none text-stone-950 focus:ring-2 focus:ring-emerald-500/20"
                                  />
                                  {newNotePhoto ? (
                                    <div className="relative">
                                      <img src={newNotePhoto} alt="Journal photo preview" className="w-full h-28 object-cover rounded-xl border border-stone-200" onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 112'%3E%3Crect width='400' height='112' fill='%23fafaf9'/%3E%3Ctext x='200' y='70' font-size='48' text-anchor='middle'%3E≡اô╖%3C/text%3E%3C/svg%3E"; }} />
                                      <button
                                        type="button"
                                        onClick={() => setNewNotePhoto(null)}
                                        className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-lg text-stone-500 hover:text-red-600 cursor-pointer"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center space-x-2 py-2 border border-dashed border-stone-300 rounded-xl text-[11px] text-stone-400 cursor-pointer hover:bg-stone-50 hover:text-stone-600">
                                      <Camera className="h-3.5 w-3.5" />
                                      <span>Attach a photo (optional)</span>
                                      <input type="file" accept="image/*" onChange={handleNotePhotoChange} className="hidden" />
                                    </label>
                                  )}
                                  <button
                                    type="submit"
                                    disabled={isSavingNote || !newNoteContent.trim()}
                                    className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-stone-800 disabled:opacity-55 flex items-center justify-center space-x-2"
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
                              <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 font-mono pb-3 border-b">Care reminders</h3>
                                <form onSubmit={handleAddReminder} className="mt-4 space-y-2">
                                  <select
                                    value={newReminderType}
                                    onChange={(e: any) => setNewReminderType(e.target.value)}
                                    className="block w-full px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-xl focus:outline-none text-stone-950"
                                  >
                                    <option value="Watering">≡اْد Watering</option>
                                    <option value="Fertilizing">≡اî▒ Fertilizing</option>
                                    <option value="Pruning">ظ£éي╕ Pruning</option>
                                    <option value="Repotting">≡از┤ Repotting</option>
                                    <option value="Pest Check">≡ا¤ Pest Check</option>
                                    <option value="Custom">≡اôî Custom</option>
                                  </select>
                                  <div className="flex space-x-2">
                                    <input
                                      type="date"
                                      value={newReminderDueDate}
                                      onChange={(e) => setNewReminderDueDate(e.target.value)}
                                      className="flex-1 px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-xl focus:outline-none text-stone-950"
                                    />
                                    <input
                                      type="number"
                                      min={1}
                                      value={newReminderRecurringDays}
                                      onChange={(e) => setNewReminderRecurringDays(e.target.value)}
                                      placeholder="Repeat (days)"
                                      className="w-28 px-3 py-2 text-xs border border-stone-200 bg-stone-50 rounded-xl focus:outline-none text-stone-950"
                                    />
                                  </div>
                                  <button
                                    type="submit"
                                    disabled={isAddingReminder}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-emerald-700 disabled:opacity-55 flex items-center justify-center space-x-2"
                                  >
                                    {isAddingReminder ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Add Reminder</span>}
                                  </button>
                                </form>

                                <div className="mt-4 space-y-2">
                                  {plantReminders.length === 0 ? (
                                    <p className="text-[11px] text-stone-400 text-center py-3">No reminders yet for this plant.</p>
                                  ) : (
                                    plantReminders.map((reminder) => (
                                      <div key={reminder.id} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${reminder.completed ? 'border-stone-100 bg-stone-50 text-stone-400' : 'border-emerald-100 bg-emerald-50/50 text-stone-700'}`}>
                                        <div>
                                          <span className={`font-semibold ${reminder.completed ? 'line-through' : ''}`}>{reminder.reminderType}</span>
                                          <span className="block text-[10px] text-stone-400 font-mono">Due {new Date(reminder.dueDate).toLocaleDateString()}</span>
                                        </div>
                                        {!reminder.completed && (
                                          <button
                                            onClick={() => handleCompleteReminder(reminder.id)}
                                            className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg cursor-pointer"
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
                            <div className="lg:col-span-2 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                              <h2 className="text-base font-semibold text-stone-950 pb-4 border-b border-stone-100">Chronological Crop Health History</h2>
                              <div className="mt-6 relative border-l border-stone-200 pl-6 ml-3 space-y-6">
                                {plantNotes.length === 0 ? (
                                  <div className="text-stone-400 text-xs text-center py-6">No historical entries found. Create one above!</div>
                                ) : (
                                  plantNotes.map((note) => (
                                    <div key={note.id} className="relative">
                                      {/* Marker Dot */}
                                      <div className="absolute -left-[31px] mt-1 bg-white border border-stone-300 p-1 rounded-full text-emerald-600 shadow-sm">
                                        <div className="h-2 w-2 bg-emerald-600 rounded-full" />
                                      </div>

                                      <div className="text-xs text-stone-400 font-mono flex items-center space-x-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>{new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}</span>
                                      </div>
                                      {note.photoUrl && (
                                        <img
                                          src={note.photoUrl}
                                          alt="Journal entry photo"
                                          className="mt-2 w-full max-w-xs h-32 object-cover rounded-xl border border-stone-200"
                                          onError={(e) => {
                                            const img = e.target as HTMLImageElement;
                                            img.onerror = null; // prevent infinite loop
                                            img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 128'%3E%3Crect width='300' height='128' fill='%23fafaf9' rx='10'/%3E%3Ctext x='150' y='80' font-size='56' text-anchor='middle'%3E≡اô╖%3C/text%3E%3C/svg%3E";
                                          }}
                                        />
                                      )}
                                      <p className="text-xs text-stone-800 mt-2 leading-relaxed bg-stone-50 border p-3 rounded-xl">{note.content}</p>
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

            {/* 3. AI SCAN LAB TAB */}
            {activeTab === 'scan' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Neural Diagnosis & Inspection Lab</h1>
                  <p className="text-sm text-stone-500 mt-1">Multi-modal plant pathology scanner.</p>
                </div>

                {scanStep === 'select' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Live webcam option */}
                    <div className="bg-white border border-stone-200 p-8 rounded-2xl text-center shadow-sm flex flex-col justify-between items-center space-y-6">
                      <div className="p-4 bg-emerald-50 rounded-full text-emerald-600">
                        <Camera className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-stone-950 font-mono">Live Leaf Capture</h3>
                        <p className="text-xs text-stone-500 mt-2 max-w-xs mx-auto">
                          Inspect crop leaves immediately using your browser camera stream. Works perfectly on mobiles.
                        </p>
                      </div>

                      <div className="w-full">
                        <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 font-mono">Select Target Plant</label>
                        <select
                          value={scanTargetPlantId}
                          onChange={(e) => {
                            setScanTargetPlantId(e.target.value);
                            setScanCatalogMode(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 mb-4"
                        >
                          <option value="">-- Choose registered plant --</option>
                          {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                        </select>

                        <button
                          onClick={startCamera}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-55 shadow-sm"
                        >
                          Activate Live Camera
                        </button>
                      </div>
                    </div>

                    {/* File Upload fallback option */}
                    <div className="bg-white border border-stone-200 p-8 rounded-2xl text-center shadow-sm flex flex-col justify-between items-center space-y-6">
                      <div className="p-4 bg-blue-50 rounded-full text-blue-600">
                        <Upload className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-stone-950 font-mono">File Upload</h3>
                        <p className="text-xs text-stone-500 mt-2 max-w-xs mx-auto">
                          Upload high-resolution leaf photos from disk or photo library. Support PNG/JPEG.
                        </p>
                      </div>

                      <div className="w-full">
                        <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2 font-mono">Select Target Plant</label>
                        <select
                          value={scanTargetPlantId}
                          onChange={(e) => {
                            setScanTargetPlantId(e.target.value);
                            setScanCatalogMode(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 mb-4"
                        >
                          <option value="">-- Choose registered plant --</option>
                          {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                        </select>

                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 border border-stone-200 hover:bg-stone-50 bg-white text-stone-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-55 shadow-sm"
                        >
                          Choose Local Photograph
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {scanStep === 'camera' && (
                  <div className="max-w-xl mx-auto bg-black rounded-3xl overflow-hidden relative border border-stone-800 shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full aspect-[4/3] object-cover scale-x-[-1]"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-6 px-6">
                      <button
                        onClick={() => {
                          stopCamera();
                          setScanStep('select');
                        }}
                        className="px-4 py-2 bg-stone-900/80 hover:bg-stone-950 backdrop-blur-md text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={captureSnapshot}
                        className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all border-4 border-white cursor-pointer shadow-lg"
                        title="Capture Photo"
                      >
                        <Camera className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                )}

                {scanStep === 'analyzing' && (
                  <div className="max-w-md mx-auto bg-white border border-stone-200 rounded-3xl p-8 text-center shadow-sm space-y-6">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
                    <div>
                      <h3 className="text-base font-semibold text-stone-950 font-mono">Neural Analysis In Progress</h3>
                      <p className="text-xs text-stone-500 mt-2">
                        Querying server-side model. Verifying chlorosis ratios, lesions margins, and spore densities...
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl text-left border border-emerald-100 font-sans text-xs text-emerald-800 space-y-2 leading-relaxed">
                      <p className="font-semibold font-mono">≡اî▒ Pathologist Tip:</p>
                      <p>Always photograph the leaf from a top-down angle in direct natural sunlight to maximize spore detection rates.</p>
                    </div>
                  </div>
                )}

                {scanStep === 'result' && capturedImage && !analysisResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Captured leaf photograph */}
                    <div className="lg:col-span-1 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-4 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-mono block">Captured foliage photo</span>
                      <img
                        src={capturedImage}
                        alt="Captured Foliage"
                        className="w-full rounded-xl border border-stone-200 aspect-[4/3] object-cover"
                      />
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setCapturedImage(null);
                            setScanStep('select');
                          }}
                          className="flex-1 py-2 border rounded-xl text-xs font-semibold cursor-pointer hover:bg-stone-50"
                        >
                          Retake
                        </button>
                        <button
                          onClick={runAIAnalysis}
                          disabled={(scanCatalogMode || (!scanTargetPlantId && plants.length === 0)) && (!scanNewPlantName.trim() || !scanNewPlantType.trim())}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide cursor-pointer flex items-center justify-center space-x-2 shadow-sm disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          <Sprout className="h-4 w-4" />
                          <span>Run Neural Diagnosis</span>
                        </button>
                      </div>
                      <div className="pt-4 border-t border-stone-100 text-left space-y-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-stone-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={scanCatalogMode || (!scanTargetPlantId && plants.length === 0)}
                            onChange={(e) => setScanCatalogMode(e.target.checked)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          Catalog New Crop from this photo
                        </label>
                        {(scanCatalogMode || (!scanTargetPlantId && plants.length === 0)) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={scanNewPlantName}
                              onChange={(e) => setScanNewPlantName(e.target.value)}
                              placeholder="Plant name"
                              className="px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              value={scanNewPlantType}
                              onChange={(e) => setScanNewPlantType(e.target.value)}
                              placeholder="Crop type"
                              className="px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-2 bg-white border border-stone-200 p-8 rounded-2xl shadow-sm text-center py-16 text-stone-400">
                      Select &quot;Run Neural Diagnosis&quot; to query Gemini AI model and get organic/chemical treatment steps.
                    </div>
                  </div>
                )}

                {/* Analysis Result Displays */}
                {scanStep === 'result' && analysisResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    {/* Left details */}
                    <div className="lg:col-span-1 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm text-center space-y-4">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-mono block">Analyzed Foliage photo</span>
                      <img
                        src={analysisResult.scan.imageUrl}
                        alt="Analyzed Foliage"
                        className="w-full rounded-xl border border-stone-200 aspect-[4/3] object-cover"
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
                      <button
                        onClick={() => {
                          setCapturedImage(null);
                          setAnalysisResult(null);
                          setScanStep('select');
                        }}
                        className="w-full py-2 border rounded-xl text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                      >
                        Reset and Scan New
                      </button>
                    </div>

                    {/* Pathological diagnosis results card */}
                    <div className="lg:col-span-2 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-stone-400 font-semibold font-mono">NEURAL DIAGNOSIS OUTCOME</span>
                          </div>
                          <h2 className="text-2xl font-bold tracking-tight text-stone-900 mt-1">{analysisResult.scan.diagnosis}</h2>
                        </div>

                        <div className="flex space-x-3 items-center">
                          <div className="bg-emerald-50 text-emerald-800 border p-3 rounded-xl font-mono text-center">
                            <span className="block text-[10px] text-emerald-600">CONFIDENCE</span>
                            <span className="font-bold text-lg">{analysisResult.scan.confidence}%</span>
                          </div>
                          <div className="bg-amber-50 text-amber-800 border p-3 rounded-xl font-mono text-center">
                            <span className="block text-[10px] text-amber-600">SEVERITY</span>
                            <span className="font-bold text-lg uppercase">{analysisResult.scan.severity}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-mono">Symptoms Analysis</h4>
                        <p className="text-xs text-stone-700 leading-relaxed mt-2 bg-stone-50 p-3 rounded-xl border">{analysisResult.scan.symptoms}</p>
                      </div>

                      {/* Expert Pathologist consultation request queue block */}
                      <div className="p-4 bg-stone-900 text-stone-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border shadow-sm">
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
                        <div className="p-4 bg-emerald-50/50 border border-emerald-200/50 rounded-xl space-y-2">
                          <span className="text-xs font-semibold font-mono text-emerald-800 block">Pathologist Review Response Received:</span>
                          <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">{expertReviewResponse.expertReply}</p>
                        </div>
                      )}

                      {/* Diagnostic treatment recommendation plans tabs */}
                      <div className="border-t pt-6">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-mono">Generated Treatment Protocol</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          {/* Organic treatments column */}
                          <div className="bg-emerald-50/25 border border-emerald-100 p-5 rounded-xl space-y-3">
                            <h4 className="text-xs font-semibold font-mono text-emerald-950 uppercase tracking-wider flex items-center space-x-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span>Organic Treatments</span>
                            </h4>
                            <ul className="space-y-2">
                              {analysisResult.treatment.organicSteps.map((step: string, i: number) => (
                                <li key={i} className="text-xs text-stone-700 leading-normal flex items-start space-x-2">
                                  <span className="font-bold text-emerald-700 font-mono shrink-0">{i+1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Chemical treatments column */}
                          <div className="bg-stone-50 border border-stone-200 p-5 rounded-xl space-y-3">
                            <h4 className="text-xs font-semibold font-mono text-stone-950 uppercase tracking-wider flex items-center space-x-1.5">
                              <span className="h-2 w-2 rounded-full bg-stone-500" />
                              <span>Chemical Controls</span>
                            </h4>
                            <ul className="space-y-2">
                              {analysisResult.treatment.chemicalSteps.map((step: string, i: number) => (
                                <li key={i} className="text-xs text-stone-700 leading-normal flex items-start space-x-2">
                                  <span className="font-bold text-stone-700 font-mono shrink-0">{i+1}.</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. TREATMENTS TAB */}
            {activeTab === 'treatments' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Treatment Plan Monitoring Logs</h1>
                  <p className="text-sm text-stone-500 mt-1">Eradication schedules for diagnosed crop disease outbreaks.</p>
                </div>

                <div className="space-y-6">
                  {(() => {
                    const activeTreatments = plants.filter((p) => p.healthStatus !== 'Healthy');
                    if (activeTreatments.length === 0) {
                      return (
                        <div className="bg-white border p-12 text-center rounded-2xl text-stone-400">
                          ≡اë All crops cataloged are perfectly healthy! Spore suppressions complete.
                        </div>
                      );
                    }

                    return activeTreatments.map((plant) => (
                      <div key={plant.id} className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
                        <div className="flex items-start space-x-4">
                          <img
                            src={plant.photoUrl}
                            alt={plant.name}
                            className="h-16 w-16 rounded-xl object-cover border border-stone-200"
                            onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f0fdf4' rx='10'/%3E%3Ctext x='32' y='44' font-size='32' text-anchor='middle'%3E≡اî▒%3C/text%3E%3C/svg%3E"; }}
                          />
                          <div>
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold font-mono border border-red-200 rounded uppercase">
                              Active Threat
                            </span>
                            <h3 className="text-base font-semibold text-stone-950 mt-1.5">{plant.name}</h3>
                            <p className="text-xs text-stone-500 font-mono mt-0.5">Cultivar Type: {plant.type}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                          <button
                            onClick={() => {
                              setSelectedPlantId(plant.id);
                              setActiveTab('plants');
                            }}
                            className="px-4 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold cursor-pointer shadow-sm text-center whitespace-nowrap"
                          >
                            View Health Timeline
                          </button>
                          
                          <button
                            onClick={async () => {
                              // Find treatment linked to this plant
                              const treatmentsRes = await fetch(`/api/treatments?plantId=${plant.id}`);
                              const treatmentsData = await treatmentsRes.json();
                              const targetTreatment = treatmentsData.treatments?.find((t: any) => t.status !== 'Completed');
                              if (targetTreatment) {
                                await resolveTreatment(targetTreatment.id);
                              } else {
                                // Default fallback if no specific treatment model exists in database
                                alert('Treatment marked as completed. Restoring plant health index to pristine.');
                                await fetch('/api/plants', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: plant.id, healthStatus: 'Healthy' }),
                                });
                                await refreshAll();
                              }
                            }}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm text-center whitespace-nowrap"
                          >
                            Mark as Fully Treated
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            )}

            {/* 5. COMMUNITY FORUM TAB */}
            {activeTab === 'community' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Crop Pathologist Forum & Community</h1>
                    <p className="text-sm text-stone-500 mt-1">Exchange tips, oomycete notes, and agricultural strategies.</p>
                  </div>
                  <button
                    onClick={() => setShowAddPostModal(true)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide shadow-sm flex items-center space-x-2 self-start cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Create Discussion Thread</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Threads lists */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Category Tabs */}
                    <div className="flex space-x-2 border-b border-stone-200 pb-3 overflow-x-auto">
                      {['all', 'Diseases', 'Tips', 'General', 'Farming Tech'].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCommunityCategory(cat as any)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${communityCategory === cat ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border text-stone-500 hover:bg-stone-50'}`}
                        >
                          {cat === 'all' ? 'All Threads' : cat}
                        </button>
                      ))}
                    </div>

                    {postsLoading ? (
                      <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
                    ) : posts.length === 0 ? (
                      <div className="bg-white border p-12 text-center rounded-2xl text-stone-400">No active discussion threads in this category. Be the first to post!</div>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold font-mono rounded border uppercase">
                                {post.category}
                              </span>
                              <h3 className="text-base font-semibold text-stone-950 mt-2">{post.title}</h3>
                              <p className="text-xs text-stone-500 font-mono mt-1">Thread started by {post.authorName} ظت {new Date(post.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <p className="text-xs text-stone-700 leading-relaxed bg-stone-50/50 p-3 rounded-xl border">{post.content}</p>

                          <div className="flex items-center space-x-6 text-xs text-stone-500 font-sans border-t pt-3">
                            <button
                              onClick={() => handleLikePost(post.id)}
                              className={`flex items-center space-x-2 cursor-pointer ${post.likes.includes(user.id) ? 'text-emerald-700 font-semibold' : 'hover:text-stone-800'}`}
                            >
                              <Heart className="h-4 w-4" />
                              <span>{post.likes.length} Likes</span>
                            </button>
                            <button
                              onClick={() => fetchComments(post.id)}
                              className="flex items-center space-x-2 hover:text-stone-800 cursor-pointer"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span>Comment Replies</span>
                            </button>
                          </div>

                          {/* Nested Comment Drawer for Selected Post */}
                          {activePostIdForComments === post.id && (
                            <div className="mt-4 pt-4 border-t border-stone-100 space-y-4">
                              <div className="space-y-3 pl-4 border-l-2 border-stone-200">
                                {activePostComments.length === 0 ? (
                                  <p className="text-xs text-stone-400">No replies yet. Be the first to share your pathogenetic expertise!</p>
                                ) : (
                                  activePostComments.map((cmt) => (
                                    <div key={cmt.id} className="text-xs bg-stone-50/80 p-2.5 rounded-xl border">
                                      <p className="font-mono font-semibold text-emerald-800">{cmt.authorName}:</p>
                                      <p className="text-stone-700 mt-1 leading-normal">{cmt.content}</p>
                                    </div>
                                  ))
                                )}
                              </div>

                              <form onSubmit={handleAddComment} className="flex space-x-2">
                                <input
                                  type="text"
                                  required
                                  value={newCommentText}
                                  onChange={(e) => setNewCommentText(e.target.value)}
                                  placeholder="Type pathological response..."
                                  className="flex-1 px-3 py-2 border rounded-xl text-xs bg-stone-50 text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                  Reply
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reference sidebar */}
                  <div className="lg:col-span-1 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-6 self-start">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-400 font-mono pb-3 border-b">Diagnosable Diseases (Reference)</h3>
                    <div className="space-y-3 divide-y divide-stone-150">
                      {[
                        { name: 'Tomato Late Blight', oomycete: 'P. infestans' },
                        { name: 'Powdery Mildew', oomycete: 'Erysiphales' },
                        { name: 'Black Spot Roses', oomycete: 'D. rosae' },
                        { name: 'Root Rot Pythium', oomycete: 'P. ultimum' },
                        { name: 'Fire Blight Pear', oomycete: 'E. amylovora' }
                      ].map((dis, i) => (
                        <div key={i} className={`pt-3 ${i === 0 ? 'pt-0' : ''}`}>
                          <h4 className="text-xs font-semibold text-stone-900">{dis.name}</h4>
                          <span className="text-[10px] italic font-mono text-stone-400">{dis.oomycete} pathogen reference</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. SETTINGS TAB */}
            {activeTab === 'settings' && (
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-xl relative"
          >
            <button
              onClick={() => {
                setShowAddPlantModal(false);
                setNewPlantPhoto(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold tracking-tight text-stone-950 font-mono flex items-center space-x-2">
              <Sprout className="h-5 w-5 text-emerald-600" />
              <span>Catalog New Crop</span>
            </h2>

            <form onSubmit={handleAddPlant} className="mt-4 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Crop/Plant Title</label>
                <input
                  type="text"
                  required
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  placeholder="e.g. heirloom cherry tomato vine #4"
                  className="mt-1 block w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Cultivar Type / Class</label>
                <input
                  type="text"
                  required
                  value={newPlantType}
                  onChange={(e) => setNewPlantType(e.target.value)}
                  placeholder="e.g. Tomato, Rose, Wheat, Citrus"
                  className="mt-1 block w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Planting Date</label>
                <input
                  type="date"
                  required
                  value={newPlantDate}
                  onChange={(e) => setNewPlantDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Plant Photo</label>
                {newPlantPhoto ? (
                  <div className="relative mt-1">
                    <img
                      src={newPlantPhoto}
                      alt="New plant preview"
                      className="h-36 w-full rounded-xl border border-stone-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPlantPhoto(null)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-stone-500 hover:text-red-600 cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center justify-center space-x-2 py-3 border border-dashed border-stone-300 rounded-xl text-xs text-stone-500 cursor-pointer hover:bg-stone-50 hover:text-stone-700">
                    <Camera className="h-4 w-4" />
                    <span>Upload plant photo</span>
                    <input type="file" accept="image/*" onChange={handleNewPlantPhotoChange} className="hidden" />
                  </label>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold tracking-wider cursor-pointer shadow-sm"
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
            className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl p-6 shadow-xl relative"
          >
            <button
              onClick={() => setShowAddPostModal(false)}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold tracking-tight text-stone-950 font-mono flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              <span>Create discussion thread</span>
            </h2>

            <form onSubmit={handleCreatePost} className="mt-4 space-y-4 text-xs font-sans">
              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Thread Title</label>
                <input
                  type="text"
                  required
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Signs of citrus thrips on grapefruits?"
                  className="mt-1 block w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Forum Category</label>
                <select
                  value={newPostCategory}
                  onChange={(e: any) => setNewPostCategory(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="General">General Gardening / Farming</option>
                  <option value="Diseases">Plant Diseases & Pathogens</option>
                  <option value="Tips">Pruning & Watering Tips</option>
                  <option value="Farming Tech">Drip Irrigation & Soil sensors</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 uppercase font-semibold font-mono tracking-wider">Thread Content</label>
                <textarea
                  required
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Describe your question, observation, or recommendations..."
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-900 focus:outline-none text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold tracking-wider cursor-pointer shadow-sm"
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
