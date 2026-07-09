'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth-context';
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
  LogOut, 
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
  Thermometer, 
  Droplets, 
  Wind, 
  MapPin, 
  TrendingUp, 
  Bell,
  Sliders,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Mail
} from 'lucide-react';

export default function AgriScanApp() {
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
    login,
    signup,
    logout,
    onboard,
    refreshAll,
    markAllNotificationsRead,
    verifyEmail,
    resendVerificationCode,
    requestPasswordReset,
    verifyResetCode,
    confirmPasswordReset
  } = useAuth();

  // Auth screen state
  // 'reset-otp'    = enter the OTP code received by email
  // 'reset-newpass'= enter the new password (after OTP confirmed)
  type AuthScreen = 'login' | 'signup' | 'verify' | 'forgot' | 'reset-otp' | 'reset-newpass';
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'Gardener' | 'Farmer' | 'Nursery' | 'Agribusiness'>('Gardener');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP / Verification state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState('');

  // Forgot / Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']);
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [resetVerifiedToken, setResetVerifiedToken] = useState(''); // token from verify step

  // Password strength checks
  const pwChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const pwStrength = Object.values(pwChecks).filter(Boolean).length;

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

  // My Plants state
  const [plantSearch, setPlantSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddPlantModal, setShowAddPlantModal] = useState(false);
  
  // Add Plant Form
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantType, setNewPlantType] = useState('');
  const [newPlantDate, setNewPlantDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPlantFarmId, setNewPlantFarmId] = useState('');

  // Plant Detail state
  const [plantNotes, setPlantNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // AI Scan Lab state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [scanStep, setScanStep] = useState<'select' | 'camera' | 'analyzing' | 'result'>('select');
  const [scanTargetPlantId, setScanTargetPlantId] = useState('');
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
        fetch(`/api/weather?location=${encodeURIComponent(user.location || 'Central Valley, CA')}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setWeatherData(data);
            }
          })
          .catch((err) => console.error('Failed to fetch weather:', err))
          .finally(() => setWeatherLoading(false));

        // Prefill settings
        setSettingsName(user.name || '');
        setSettingsLocation(user.location || '');
        setSettingsUnits(user.units || 'metric');
        setSettingsPlan(user.plan || 'Free');
      }, 0);
    }
  }, [user]);

  // Fetch plant notes when detail plant is selected
  useEffect(() => {
    if (selectedPlantId) {
      setTimeout(() => {
        fetch(`/api/notes?plantId=${selectedPlantId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) setPlantNotes(data.notes);
          });
      }, 0);
    }
  }, [selectedPlantId]);

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

  // OTP input handler (shared for verify + reset screens)
  const handleOtpChange = (
    digits: string[],
    setDigits: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    value: string
  ) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (
    digits: string[],
    setDigits: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (
    setDigits: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    e: React.ClipboardEvent
  ) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs.current[5]?.focus();
    }
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    if (authScreen === 'login') {
      const res = await login(email, password);
      if (!res.success) {
        setAuthError(res.error || 'Invalid credentials');
      }
    } else if (authScreen === 'signup') {
      if (!pwChecks.length) {
        setAuthError('Password must be at least 8 characters.');
        setIsSubmitting(false);
        return;
      }
      const res = await signup(email, password, name, accountType) as any;
      if (res.success) {
        setOtpDigits(['', '', '', '', '', '']);
        setResendCooldown(60);
        setOnboardStep(1);
        setAuthScreen('verify');
      } else {
        setAuthError(res.error || 'Signup failed');
      }
    }
    setIsSubmitting(false);
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) { setAuthError('Please enter all 6 digits.'); return; }
    setAuthError('');
    setIsSubmitting(true);
    const res = await verifyEmail(code, email);
    if (res.success) {
      setOnboardStep(1);
      await refreshAll();
      setActiveTab('dashboard');
    } else {
      setAuthError(res.error || 'Invalid code. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
    setIsSubmitting(false);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setAuthError('');
    const res = await resendVerificationCode(email) as any;
    if (res.success) {
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else {
      setAuthError(res.error || 'Failed to resend code.');
    }
  };

  // Request password reset — sends OTP email, moves to OTP screen
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    const res = await requestPasswordReset(resetEmail) as any;
    if (res.success) {
      setResetOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setAuthScreen('reset-otp'); // ← Step 2: Enter OTP
    } else {
      setAuthError(res.error || 'Failed to request reset.');
    }
    setIsSubmitting(false);
  };

  // Step 2: Verify reset OTP — moves to new password screen
  const handleVerifyResetOtp = async () => {
    const code = resetOtpDigits.join('');
    if (code.length < 6) { setAuthError('Please enter all 6 digits.'); return; }
    setAuthError('');
    setIsSubmitting(true);
    const res = await verifyResetCode(resetEmail, code) as any;
    if (res.success) {
      setResetVerifiedToken(res.verifiedToken);
      setNewPassword('');
      setAuthScreen('reset-newpass'); // ← Step 3: Enter new password
    } else {
      setAuthError(res.error || 'Invalid code. Please try again.');
      setResetOtpDigits(['', '', '', '', '', '']);
      resetOtpRefs.current[0]?.focus();
    }
    setIsSubmitting(false);
  };

  // Step 3: Set new password — auto-logs user in after success
  const handleConfirmReset = async () => {
    if (newPassword.length < 8) { setAuthError('Password must be at least 8 characters.'); return; }
    setAuthError('');
    setIsSubmitting(true);
    const res = await confirmPasswordReset(resetEmail, resetVerifiedToken, newPassword);
    if (res.success) {
      // confirmPasswordReset already calls refreshAll() → user is logged in → dashboard
      setAuthSuccess('Password reset successfully! Welcome back.');
      setNewPassword('');
      setResetVerifiedToken('');
    } else {
      setAuthError(res.error || 'Failed to reset password.');
    }
    setIsSubmitting(false);
  };

  // Onboard Handler
  const handleOnboardSubmit = async () => {
    setIsSubmitting(true);
    const res = await onboard({
      accountType,
      location: onboardLocation,
      units: onboardUnits,
      plan: onboardPlan,
      firstFarmName: onboardFarmName || `${name}'s Farm`
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
          farmId: newPlantFarmId || farms[0]?.id || ''
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddPlantModal(false);
        setNewPlantName('');
        setNewPlantType('');
        await refreshAll();
      }
    } catch (error) {
      console.error('Failed to add plant:', error);
    }
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

  // Save custom plant note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !selectedPlantId) return;

    setIsSavingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plantId: selectedPlantId, content: newNoteContent }),
      });
      const data = await res.json();
      if (data.success) {
        setNewNoteContent('');
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
        setScanStep('result');
      };
      reader.readAsDataURL(file);
    }
  };

  // Analyze Image with Gemini AI on Server Side
  const runAIAnalysis = async () => {
    if (!capturedImage) return;
    
    // Check scan limits for Free plan
    const userScansCount = 3; // Mocked active usage counter
    if (user?.plan === 'Free' && userScansCount >= 5) {
      alert('You have hit your monthly limit of 5 scans on the Free Plan. Please upgrade under Settings to Enterprise or Pro.');
      return;
    }

    let targetPlantId = scanTargetPlantId || (plants[0]?.id || '');
    if (!targetPlantId) {
      const confirmCreate = confirm("You do not have any plants registered yet. Would you like to automatically create a default 'Test Tomato' plant to link this scan to?");
      if (!confirmCreate) return;
      
      setIsAnalyzing(true);
      setScanStep('analyzing');
      try {
        const res = await fetch('/api/plants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Tomato',
            type: 'Vegetable',
            plantingDate: new Date().toISOString().split('T')[0],
            farmId: farms[0]?.id || ''
          }),
        });
        const data = await res.json();
        if (data.success && data.plant) {
          await refreshAll();
          targetPlantId = data.plant.id;
        } else {
          alert(data.error || 'Failed to create a default plant.');
          setIsAnalyzing(false);
          setScanStep('select');
          return;
        }
      } catch (err) {
        console.error(err);
        alert('An error occurred while creating a default plant.');
        setIsAnalyzing(false);
        setScanStep('select');
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
        // Refetch posts
        const postsRes = await fetch(`/api/community?category=${communityCategory}`);
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
          plan: settingsPlan
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

  // CSV farm download report triggers
  const handleDownloadReport = () => {
    window.open('/api/export', '_blank');
  };

  // Loading spinner during auth fetch on first load
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-stone-50 text-stone-800">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="mt-4 text-sm font-medium tracking-tight font-sans">Bootstrapping AgriScan AI core modules...</p>
      </div>
    );
  }

  // --- PREMIUM AUTH SCREENS (Login / Signup / Verify / Forgot / Reset) ---
  // Only show auth screens if user is not logged in OR not verified yet.
  // If user is verified and has location set (onboarded), skip directly to dashboard.
  if (!user || (!user.isVerified && !user.location)) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row font-sans">
        {/* ── LEFT BRAND PANEL — 3D animated dark ── */}
        <div className="hidden md:flex flex-col justify-between w-[480px] shrink-0 p-12 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0a1f0f 0%, #0d2b1a 60%, #0f1f2e 100%)' }}>
          {/* Animated floating 3D leaf/globe orbs */}
          <style>{`
            @keyframes float3d {
              0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
              33% { transform: translateY(-18px) rotateX(8deg) rotateY(10deg); }
              66% { transform: translateY(-8px) rotateX(-5deg) rotateY(-8deg); }
            }
            @keyframes float3d2 {
              0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
              33% { transform: translateY(-12px) rotateX(-6deg) rotateY(12deg); }
              66% { transform: translateY(-22px) rotateX(10deg) rotateY(-5deg); }
            }
            @keyframes float3d3 {
              0%,100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
              50% { transform: translateY(-14px) rotateX(6deg) rotateY(-10deg); }
            }
            @keyframes orbit {
              0% { transform: rotate(0deg) translateX(90px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
            }
            @keyframes orbit2 {
              0% { transform: rotate(120deg) translateX(70px) rotate(-120deg); }
              100% { transform: rotate(480deg) translateX(70px) rotate(-480deg); }
            }
            @keyframes orbit3 {
              0% { transform: rotate(240deg) translateX(110px) rotate(-240deg); }
              100% { transform: rotate(600deg) translateX(110px) rotate(-600deg); }
            }
            @keyframes pulseGlow {
              0%,100% { opacity: 0.15; transform: scale(1); }
              50% { opacity: 0.30; transform: scale(1.08); }
            }
            @keyframes scanLine {
              0% { transform: translateY(-100%); opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { transform: translateY(100%); opacity: 0; }
            }
            @keyframes particleDrift {
              0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.7; }
              100% { transform: translateY(-120px) translateX(20px) scale(0.3); opacity: 0; }
            }
          `}</style>

          {/* Background glow blobs */}
          <div className="absolute inset-0" style={{ perspective: '800px' }}>
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)', animation: 'pulseGlow 4s ease-in-out infinite' }} />
            <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 70%)', animation: 'pulseGlow 6s ease-in-out infinite 2s' }} />
            <div className="absolute top-0 left-0 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,95,70,0.25) 0%, transparent 70%)' }} />
          </div>

          {/* 3D Central Orb + orbiting elements */}
          <div className="absolute top-[47%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48" style={{ perspective: '600px' }}>
            {/* Core planet orb */}
            <div className="w-48 h-48 rounded-full relative" style={{ background: 'radial-gradient(ellipse at 35% 35%, #10b981 0%, #059669 40%, #064e3b 80%, #022c22 100%)', boxShadow: '0 0 60px rgba(16,185,129,0.4), 0 0 120px rgba(16,185,129,0.15), inset -20px -20px 40px rgba(0,0,0,0.5)', animation: 'float3d 7s ease-in-out infinite' }}>
              {/* Scan line */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <div style={{ position:'absolute', left:0, right:0, height:'2px', background:'linear-gradient(90deg, transparent, rgba(52,211,153,0.8), transparent)', animation:'scanLine 3s ease-in-out infinite' }} />
              </div>
              {/* Grid overlay */}
              <div className="absolute inset-0 rounded-full" style={{ backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(52,211,153,0.08) 18px, rgba(52,211,153,0.08) 19px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(52,211,153,0.08) 18px, rgba(52,211,153,0.08) 19px)', borderRadius:'50%' }} />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Sprout className="h-14 w-14" style={{ color:'rgba(255,255,255,0.9)', filter:'drop-shadow(0 0 12px rgba(52,211,153,0.8))' }} />
              </div>
            </div>

            {/* Orbiting particles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ position:'absolute', width:'8px', height:'8px', borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#34d399)', boxShadow:'0 0 10px rgba(16,185,129,0.8)', animation:'orbit 5s linear infinite' }} />
              <div style={{ position:'absolute', width:'6px', height:'6px', borderRadius:'50%', background:'linear-gradient(135deg,#6ee7b7,#10b981)', boxShadow:'0 0 8px rgba(110,231,183,0.8)', animation:'orbit2 7s linear infinite' }} />
              <div style={{ position:'absolute', width:'10px', height:'10px', borderRadius:'50%', background:'linear-gradient(135deg,#059669,#047857)', boxShadow:'0 0 12px rgba(5,150,105,0.8)', animation:'orbit3 9s linear infinite' }} />
            </div>

            {/* Orbit ring */}
            <div className="absolute inset-[-30px] rounded-full" style={{ border:'1px solid rgba(16,185,129,0.15)', transform:'rotateX(70deg)' }} />
          </div>

          {/* Top logo */}
          <div className="relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow:'0 4px 20px rgba(5,150,105,0.4)' }}>
                <Sprout className="h-7 w-7 text-white" />
              </div>
              <div>
                <span className="block text-xl font-bold text-white tracking-tight">AgriScan AI</span>
                <span className="block text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Pathology Intelligence</span>
              </div>
            </div>
          </div>

          {/* Hero title */}
          <div className="absolute z-10 left-12 right-12 top-[29%] space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Gemini Multimodal Engine &middot; Live</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
              Smart Plant<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Health Intelligence</span>
            </h1>
          </div>

          {/* Bottom text */}
          <div className="absolute z-10 left-12 right-12 top-[58%] space-y-4">
            <div className="hidden items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Gemini Multimodal Engine &middot; Live</span>
            </div>
            <h1 className="hidden text-3xl font-extrabold text-white leading-tight tracking-tight">
              Smart Plant<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">Health Intelligence</span>
            </h1>

            {/* Glowing border card wrapper for the description text — with extra bottom margin so features list breathes */}
            <p className="text-sm text-stone-200/95 leading-relaxed font-normal">
              Instant disease diagnosis powered by Google Gemini Vision. Protect your crops before it&apos;s too late.
            </p>

            <div className="hidden">
              {[
                { icon: ShieldCheck, text: 'Bank-grade encrypted auth & OTP verification' },
                { icon: Sparkles, text: 'AI-powered treatment plans generated instantly' },
                { icon: CloudSun, text: 'Localized weather & blight spore risk alerts' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center space-x-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Icon className="h-3.5 w-3.5 text-emerald-300" />
                  </div>
                  <span className="text-sm text-stone-100 font-medium leading-relaxed">{text}</span>
                </div>
              ))}
            </div>

          </div>

          <div className="relative z-10 text-[10px] text-emerald-500/30 font-mono text-center">
            AgriScan AI Professional © 2026. All rights reserved.
          </div>
        </div>

        {/* ── RIGHT AUTH PANEL — white ── */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white">
          <div className="w-full max-w-md">

            <AnimatePresence mode="wait">

              {/* ── LOGIN SCREEN ── */}
              {!(user && !user.isVerified) && authScreen === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                        <Sprout className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">AgriScan AI</span>
                    </div>
                    <h2 className="text-3xl font-bold text-stone-900 tracking-tight mt-4">Welcome back</h2>
                    <p className="text-sm text-stone-500 mt-1">Sign in to your farm dashboard</p>
                  </div>

                  {authError && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{authError}</span>
                    </motion.div>
                  )}
                  {authSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs text-emerald-700">{authSuccess}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input
                        type="email" required value={email}
                        onChange={(e) => { setEmail(e.target.value); setAuthError(''); setAuthSuccess(''); }}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'} required value={password}
                          onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="mt-1.5 text-right">
                        <button type="button" onClick={() => { setAuthError(''); setAuthSuccess(''); setResetEmail(email); setAuthScreen('forgot'); }} className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer font-medium">
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                      style={{ background: isSubmitting ? '#065f46' : 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Sign In</span><ChevronRight className="h-4 w-4" /></>}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-stone-100 text-center text-xs text-stone-400">
                    New to AgriScan?{' '}
                    <button onClick={() => { setAuthScreen('signup'); setAuthError(''); setAuthSuccess(''); }} className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors">
                      Create farm account →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── SIGNUP SCREEN ── */}
              {!(user && !user.isVerified) && authScreen === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                        <Sprout className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-widest">AgriScan AI</span>
                    </div>
                    <h2 className="text-3xl font-bold text-stone-900 tracking-tight mt-4">Create account</h2>
                    <p className="text-sm text-stone-500 mt-1">Set up your farm dashboard today</p>
                  </div>

                  {authError && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{authError}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input type="text" required value={name}
                        onChange={(e) => { setName(e.target.value); setAuthError(''); }}
                        placeholder="e.g. John Green"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input type="email" required value={email}
                        onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Password</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} required value={password}
                          onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                          placeholder="Min. 8 characters"
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {/* Password strength bar only */}
                      {password && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                          <div className="flex space-x-1">
                            {[1,2,3,4,5].map((i) => (
                              <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300" style={{ background: pwStrength >= i ? (pwStrength <= 2 ? '#ef4444' : pwStrength <= 3 ? '#f59e0b' : '#10b981') : '#e5e7eb' }} />
                            ))}
                          </div>
                          <p className="text-[11px] mt-1 font-medium" style={{ color: pwStrength <= 2 ? '#ef4444' : pwStrength <= 3 ? '#f59e0b' : '#059669' }}>
                            {pwStrength <= 2 ? 'Weak password' : pwStrength <= 3 ? 'Fair password' : pwStrength === 4 ? 'Strong password' : 'Very strong password'}
                          </p>
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Operation Type</label>
                      <select value={accountType} onChange={(e: any) => setAccountType(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="Gardener">🌱 Home / Hobbyist Gardener</option>
                        <option value="Farmer">🚜 Commercial Farmer</option>
                        <option value="Nursery">🌿 Farm Dashboard / Nursery Operator</option>
                        <option value="Agribusiness">🏢 Agribusiness Professional</option>
                      </select>
                    </div>

                    <button type="submit" disabled={isSubmitting || pwStrength < 3}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      style={{ background: (isSubmitting || pwStrength < 3) ? '#6b7280' : 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>Create Account & Verify Email</span><ChevronRight className="h-4 w-4" /></>}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-stone-100 text-center text-xs text-stone-400">
                    Already have an account?{' '}
                    <button onClick={() => { setAuthScreen('login'); setAuthError(''); }} className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors">
                      Sign in →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── VERIFY EMAIL OTP SCREEN ── */}
              {((user && !user.isVerified) || authScreen === 'verify') && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <Mail className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">Check your inbox</h2>
                      <p className="text-xs text-stone-500 mt-0.5">Enter the 6-digit code sent to <strong>{email || (user && user.email)}</strong></p>
                    </div>
                  </div>

                  {authError && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{authError}</span>
                    </motion.div>
                  )}

                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 text-center">6-digit verification code</label>
                    <div className="flex items-center justify-center space-x-2">
                      {otpDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpChange(otpDigits, setOtpDigits, otpRefs, i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(otpDigits, setOtpDigits, otpRefs, i, e)}
                          onPaste={(e) => handleOtpPaste(setOtpDigits, otpRefs, e)}
                          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none"
                          style={d ? { background: '#f0fdf4', borderColor: '#059669', color: '#064e3b' } : { background: '#f9fafb', borderColor: '#d1d5db', color: '#111827' }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isSubmitting || otpDigits.join('').length < 6}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /><span>Verify & Enter Dashboard</span></>}
                  </button>

                  <div className="mt-5 flex items-center justify-between text-xs">
                    <button onClick={async () => { if (user) await logout(); setAuthScreen('signup'); setAuthError(''); setOtpDigits(['','','','','','']); }} className="flex items-center space-x-1 text-stone-400 hover:text-stone-600 cursor-pointer transition-colors">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0}
                      className="flex items-center space-x-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      style={{ color: resendCooldown > 0 ? '#9ca3af' : '#059669' }}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${resendCooldown > 0 ? '' : 'hover:rotate-180 transition-transform duration-500'}`} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── FORGOT PASSWORD SCREEN ── */}
              {!(user && !user.isVerified) && authScreen === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button onClick={() => { setAuthScreen('login'); setAuthError(''); }} className="flex items-center space-x-1.5 text-stone-400 hover:text-stone-600 text-xs mb-6 cursor-pointer transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to sign in</span>
                  </button>

                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}>
                      <KeyRound className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">Forgot password?</h2>
                      <p className="text-xs text-stone-500 mt-0.5">We&apos;ll send a reset code to your email</p>
                    </div>
                  </div>

                  {authError && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{authError}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Registered Email Address</label>
                      <input type="email" required value={resetEmail}
                        onChange={(e) => { setResetEmail(e.target.value); setAuthError(''); }}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                      />
                    </div>

                    <button type="submit" disabled={isSubmitting}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Mail className="h-4 w-4" /><span>Send Reset Code</span></>}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── RESET PASSWORD SCREEN ── */}
              {/* ── RESET STEP 2: Enter OTP ── */}
              {!(user && !user.isVerified) && authScreen === 'reset-otp' && (
                <motion.div
                  key="reset-otp"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <button onClick={() => { setAuthScreen('forgot'); setAuthError(''); }} className="flex items-center space-x-1.5 text-stone-400 hover:text-stone-600 text-xs mb-6 cursor-pointer transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <Mail className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">Check your email</h2>
                      <p className="text-xs text-stone-500 mt-0.5">Enter the 6-digit code sent to <span className="text-emerald-600 font-medium">{resetEmail}</span></p>
                    </div>
                  </div>

                  {authError && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{authError}</span>
                    </motion.div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 text-center">6-digit reset code</label>
                      <div className="flex items-center justify-center space-x-2">
                        {resetOtpDigits.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => { resetOtpRefs.current[i] = el; }}
                            type="text" inputMode="numeric" maxLength={1} value={d}
                            onChange={(e) => handleOtpChange(resetOtpDigits, setResetOtpDigits, resetOtpRefs, i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(resetOtpDigits, setResetOtpDigits, resetOtpRefs, i, e)}
                            onPaste={(e) => handleOtpPaste(setResetOtpDigits, resetOtpRefs, e)}
                            className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all focus:outline-none"
                            style={d ? { background: '#f0fdf4', borderColor: '#059669', color: '#064e3b' } : { background: '#f9fafb', borderColor: '#d1d5db', color: '#111827' }}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleVerifyResetOtp}
                      disabled={isSubmitting || resetOtpDigits.join('').length < 6}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" /><span>Verify Code</span></>}
                    </button>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={async () => { if (resendCooldown > 0) return; setAuthError(''); const r = await requestPasswordReset(resetEmail) as any; if (r.success) { setResendCooldown(60); setResetOtpDigits(['', '', '', '', '', '']); resetOtpRefs.current[0]?.focus(); } else { setAuthError(r.error || 'Failed.'); } }}
                        disabled={resendCooldown > 0}
                        className="flex items-center space-x-1.5 text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                        style={{ color: resendCooldown > 0 ? '#9ca3af' : '#059669' }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── RESET STEP 3: Set New Password ── */}
              {!(user && !user.isVerified) && authScreen === 'reset-newpass' && (
                <motion.div
                  key="reset-newpass"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 rounded-2xl" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)' }}>
                      <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">Set new password</h2>
                      <p className="text-xs text-stone-500 mt-0.5">Code verified ✅ — Choose a strong new password</p>
                    </div>
                  </div>

                  {authError && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-600">{authError}</span>
                    </motion.div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">New Password</label>
                      <div className="relative">
                        <input type={showNewPassword ? 'text' : 'password'} value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setAuthError(''); }}
                          placeholder="Min. 8 characters"
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {newPassword.length > 0 && newPassword.length < 8 && (
                        <p className="text-xs text-red-500 mt-1.5">Password must be at least 8 characters.</p>
                      )}
                    </div>

                    <button
                      onClick={handleConfirmReset}
                      disabled={isSubmitting || newPassword.length < 8}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><KeyRound className="h-4 w-4" /><span>Save & Sign In</span></>}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // --- OPERATIONAL ONBOARDING WIZARD ---
  if (user && !user.location) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 md:p-8 font-sans">
        <div className="w-full max-w-lg bg-white border border-stone-200 rounded-3xl shadow-sm p-8">
          <div className="flex items-center space-x-2 font-mono text-xs text-emerald-600 uppercase tracking-widest">
            <Sparkles className="h-4 w-4" />
            <span>Farm Dashboard Onboarding — Step {onboardStep} of 2</span>
          </div>

          {onboardStep === 1 ? (
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950 mt-2">
                Configure your agricultural metrics
              </h2>
              <p className="text-sm text-stone-500 mt-2">
                Let us know where you are located so we can fetch localized meteorologic alerts and track oomycete disease-risk profiles.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Farm/Garden Location</label>
                  <input
                    type="text"
                    required
                    value={onboardLocation}
                    onChange={(e) => setOnboardLocation(e.target.value)}
                    placeholder="e.g. Portland, OR or Napa Valley, CA"
                    className="mt-1 block w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Measurement System</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <button
                      onClick={() => setOnboardUnits('metric')}
                      className={`py-3 rounded-xl border text-sm font-semibold font-mono cursor-pointer transition-all ${onboardUnits === 'metric' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
                    >
                      Metric (°C, km/h)
                    </button>
                    <button
                      onClick={() => setOnboardUnits('imperial')}
                      className={`py-3 rounded-xl border text-sm font-semibold font-mono cursor-pointer transition-all ${onboardUnits === 'imperial' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'}`}
                    >
                      Imperial (°F, mph)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-wider font-mono">Farm Dashboard / Initial Zone Name</label>
                  <input
                    type="text"
                    required
                    value={onboardFarmName}
                    onChange={(e) => setOnboardFarmName(e.target.value)}
                    placeholder="e.g. Greenhouse Beta or Vineyard Block 3"
                    className="mt-1 block w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              <h2 className="text-2xl font-semibold tracking-tight text-stone-950 mt-2">
                Choose your scanning quota
              </h2>
              <p className="text-sm text-stone-500 mt-2">
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
                    className={`w-full text-left p-4 rounded-xl border font-sans cursor-pointer transition-all flex items-start justify-between ${onboardPlan === plan.tier ? 'border-emerald-600 bg-emerald-50/30' : 'border-stone-200 bg-white hover:bg-stone-50'}`}
                  >
                    <div>
                      <span className="font-semibold text-stone-900 block font-mono">{plan.tier} Plan</span>
                      <span className="text-xs text-stone-500 mt-1 block">{plan.desc}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-800 font-mono">{plan.price}</span>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setOnboardStep(1)}
                  className="px-5 py-3 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl text-sm font-semibold cursor-pointer"
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
            {user.plan} Active Plan
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
            onClick={() => {
              setShowNotifDrawer(!showNotifDrawer);
              if (!showNotifDrawer) markAllNotificationsRead();
            }}
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
              className="h-8 w-8 rounded-full border border-stone-200"
            />
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-stone-900">{user.name}</p>
              <p className="text-stone-400 capitalize">{user.accountType}</p>
            </div>
          </div>

          <button
            onClick={logout}
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
          {[
            { id: 'dashboard', label: 'Dashboard', icon: CloudSun },
            { id: 'plants', label: 'My Plants / Crops', icon: Sprout },
            { id: 'scan', label: 'AI Scan Lab', icon: Camera, accent: true },
            { id: 'treatments', label: 'Treatments', icon: Heart },
            { id: 'community', label: 'Community Board', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedPlantId(null);
                }}
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
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Farm Inspection Command Center</h1>
                    <p className="text-sm text-stone-500 mt-1">Real-time localized diagnostics and crop health assessments.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-stone-400 font-mono hidden sm:inline mr-1">Export:</span>
                    <button
                      onClick={() => window.open('/api/export?format=csv', '_blank')}
                      className="px-3 py-2 border border-stone-200 hover:bg-stone-50 bg-white rounded-xl text-xs font-semibold tracking-wide flex items-center space-x-1.5 text-stone-700 shadow-sm cursor-pointer"
                      title="Download raw tabular CSV data"
                    >
                      <FileDown className="h-3.5 w-3.5 text-stone-400" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => window.open('/api/export?format=pdf', '_blank')}
                      className="px-3 py-2 border border-stone-200 hover:bg-stone-50 bg-white rounded-xl text-xs font-semibold tracking-wide flex items-center space-x-1.5 text-stone-700 shadow-sm cursor-pointer"
                      title="Download styled PDF analysis report"
                    >
                      <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                      <span>PDF Report</span>
                    </button>
                    <button
                      onClick={() => window.open('/api/export?format=excel', '_blank')}
                      className="px-3 py-2 border border-stone-200 hover:bg-stone-50 bg-white rounded-xl text-xs font-semibold tracking-wide flex items-center space-x-1.5 text-stone-700 shadow-sm cursor-pointer"
                      title="Download formatted Excel worksheet"
                    >
                      <FileDown className="h-3.5 w-3.5 text-blue-600" />
                      <span>Excel Worksheet</span>
                    </button>
                  </div>
                </div>

                {/* Dashboard Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Managed Plants', value: plants.length, icon: Sprout, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Critical Health Status', value: plants.filter(p => p.healthStatus === 'Critical').length, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
                    { label: 'Active Treatments', value: plants.filter(p => p.healthStatus === 'Warning').length, icon: Heart, color: 'text-amber-500 bg-amber-50' },
                    { label: 'Diagnostics Success Rate', value: '98%', icon: Award, color: 'text-blue-600 bg-blue-50' },
                  ].map((metric, i) => (
                    <div key={i} className="bg-white border border-stone-200 p-5 rounded-2xl flex items-center space-x-4 shadow-sm">
                      <div className={`p-3 rounded-xl ${metric.color}`}>
                        <metric.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="block text-xs text-stone-400 font-sans tracking-wide uppercase font-mono">{metric.label}</span>
                        <span className="block text-xl font-bold text-stone-900 mt-1 font-mono">{metric.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Secondary layout splits: (Weather and predictive alerts) + (Recent scans list) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Weather widget */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Localization Weather Block */}
                    <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 font-mono">Microclimate Meter</span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono rounded border border-emerald-200 uppercase">Localized</span>
                      </div>

                      {weatherLoading ? (
                        <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
                      ) : (
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-3xl font-bold tracking-tight font-mono text-stone-900">{weatherData?.current.temp}{weatherData?.current.unit}</p>
                              <p className="text-xs text-stone-500 mt-1">{weatherData?.current.condition}</p>
                            </div>
                            <CloudSun className="h-10 w-10 text-emerald-600" />
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t border-stone-100 text-center font-mono text-xs text-stone-500">
                            <div>
                              <span className="block text-stone-400 text-[10px]">HUMIDITY</span>
                              <span className="font-semibold text-stone-800 block mt-1">{weatherData?.current.humidity}%</span>
                            </div>
                            <div>
                              <span className="block text-stone-400 text-[10px]">WIND</span>
                              <span className="font-semibold text-stone-800 block mt-1">{weatherData?.current.wind}</span>
                            </div>
                            <div>
                              <span className="block text-stone-400 text-[10px]">SOIL MOIST</span>
                              <span className="font-semibold text-stone-800 block mt-1">{weatherData?.current.soilMoisture}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Predictive alert */}
                    <div className="bg-stone-900 text-stone-50 p-6 rounded-2xl shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-600/10 rounded-full blur-2xl" />
                      
                      <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
                        <TrendingUp className="h-4 w-4" />
                        <span>Predictive Pathogen Forecasting</span>
                      </div>

                      <h3 className="text-base font-semibold text-white mt-3">Late Blight Spore Outlook</h3>
                      <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                        Based on current relative atmospheric humidity ({weatherData?.current.humidity}%) and temperature ({weatherData?.current.temp}°), conditions are:
                      </p>

                      <div className="mt-4 p-3 bg-stone-800 border border-stone-700 rounded-xl flex items-center justify-between font-mono">
                        <span className="text-xs text-stone-300">Spore Incubation Risk</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${weatherData?.current.blightRisk === 'High' ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-emerald-950 text-emerald-400 border border-emerald-900'}`}>
                          {weatherData?.current.blightRisk} RISK
                        </span>
                      </div>

                      <p className="text-[10px] text-stone-500 mt-3 italic leading-normal">
                        *Prediction calculated via thermal-humidity index model. Consider pruning lower leaves of tomato/potato cultivar to minimize canopy humidity.
                      </p>
                    </div>
                  </div>

                  {/* Recent Plants & Crops */}
                  <div className="lg:col-span-2 bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                      <h2 className="text-base font-semibold text-stone-950">Crop Health Index</h2>
                      <button onClick={() => setActiveTab('plants')} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">
                        Manage inventory
                      </button>
                    </div>

                    <div className="divide-y divide-stone-100">
                      {plants.length === 0 ? (
                        <div className="py-12 text-center text-stone-400">No crops cataloged yet. Get started under My Plants.</div>
                      ) : (
                        plants.slice(0, 4).map((plant) => (
                          <div key={plant.id} className="py-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <img
                                src={plant.photoUrl}
                                alt={plant.name}
                                className="h-11 w-11 rounded-xl object-cover border border-stone-200"
                              />
                              <div>
                                <h4 className="text-sm font-semibold text-stone-950">{plant.name}</h4>
                                <span className="text-xs text-stone-400 font-mono">{plant.type}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full font-mono ${plant.healthStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : plant.healthStatus === 'Warning' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                {plant.healthStatus}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedPlantId(plant.id);
                                  setActiveTab('plants');
                                }}
                                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg cursor-pointer"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
                              />
                              <div className="absolute top-4 right-4">
                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full font-mono border ${plant.healthStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : plant.healthStatus === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {plant.healthStatus}
                                </span>
                              </div>
                            </div>

                            <div className="p-5">
                              <h3 className="text-base font-semibold text-stone-950">{plant.name}</h3>
                              <p className="text-xs text-stone-400 mt-1 font-mono">{plant.type} • Planted {new Date(plant.plantingDate).toLocaleDateString()}</p>
                              
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
                            ← Back to list
                          </button>

                          <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-6 justify-between">
                            <div className="flex flex-col md:flex-row gap-6">
                              <img
                                src={plant.photoUrl}
                                alt={plant.name}
                                className="h-32 w-32 rounded-2xl object-cover border border-stone-200 self-start"
                              />
                              <div>
                                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full font-mono border ${plant.healthStatus === 'Healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : plant.healthStatus === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                  {plant.healthStatus}
                                </span>
                                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 mt-2">{plant.name}</h1>
                                <p className="text-sm text-stone-500 font-mono mt-1">Cultivar Type: {plant.type} • Registered {new Date(plant.plantingDate).toLocaleDateString()}</p>
                                
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
                            {/* Notes logging & metadata */}
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
                          onChange={(e) => setScanTargetPlantId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-900 mb-4"
                        >
                          <option value="">-- Choose registered plant --</option>
                          {plants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                        </select>

                        <button
                          onClick={startCamera}
                          disabled={!scanTargetPlantId && plants.length > 0}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-55 shadow-sm"
                        >
                          {plants.length === 0 ? 'Add a plant first to scan' : 'Activate Live Camera'}
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
                          onChange={(e) => setScanTargetPlantId(e.target.value)}
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
                          disabled={!scanTargetPlantId && plants.length > 0}
                          className="w-full py-3 border border-stone-200 hover:bg-stone-50 bg-white text-stone-700 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-55 shadow-sm"
                        >
                          {plants.length === 0 ? 'Add a plant first to scan' : 'Choose Local Photograph'}
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
                      <p className="font-semibold font-mono">🌱 Pathologist Tip:</p>
                      <p>Always photograph the leaf from a top-down angle in direct natural sunlight to maximize spore detection rates.</p>
                    </div>
                  </div>
                )}

                {scanStep === 'result' && capturedImage && (
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
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold tracking-wide cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                        >
                          <Sprout className="h-4 w-4" />
                          <span>Run Neural Diagnosis</span>
                        </button>
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
                          🎉 All crops cataloged are perfectly healthy! Spore suppressions complete.
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
                              <p className="text-xs text-stone-500 font-mono mt-1">Thread started by {post.authorName} • {new Date(post.createdAt).toLocaleDateString()}</p>
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
                        Metric (°C, km/h)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsUnits('imperial')}
                        className={`py-2 rounded-xl border text-xs font-semibold font-mono cursor-pointer transition-all ${settingsUnits === 'imperial' ? 'border-emerald-600 bg-emerald-50/30 text-emerald-950' : 'border-stone-200 bg-white text-stone-600'}`}
                      >
                        Imperial (°F, mph)
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
        </main>
      </div>

      {/* --- ADD PLANT / CROP MODAL OVERLAY --- */}
      {showAddPlantModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 shadow-xl relative"
          >
            <button
              onClick={() => setShowAddPlantModal(false)}
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
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs flex justify-end">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="w-full max-w-sm bg-white h-full border-l border-stone-200 shadow-xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <h3 className="text-base font-semibold text-stone-950 font-mono">Notifications History</h3>
                <button
                  onClick={() => setShowNotifDrawer(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto max-h-[80vh] divide-y divide-stone-100 pr-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-12">No active notifications received yet.</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="pt-3 first:pt-0">
                      <div className="flex items-center space-x-1.5">
                        <span className={`h-2 w-2 rounded-full ${notif.read ? 'bg-transparent' : 'bg-emerald-600'}`} />
                        <span className="text-[10px] font-bold font-mono text-stone-400 uppercase tracking-wider">{notif.category}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-stone-900 mt-1">{notif.title}</h4>
                      <p className="text-xs text-stone-600 mt-1 leading-normal">{notif.message}</p>
                      <span className="text-[9px] font-mono text-stone-400 block mt-1.5">{new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={() => setShowNotifDrawer(false)}
              className="w-full py-3 border border-stone-200 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-700 cursor-pointer text-center font-mono"
            >
              Close Drawer
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
