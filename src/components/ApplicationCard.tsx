import { useState, useEffect } from "react";
import { Trash2, ClipboardCheck, Bell, Calendar, FileText, DollarSign, ClipboardList, ExternalLink, Clock, CheckCircle2, AlertCircle, GraduationCap, CreditCard, IdCard, User, FileCheck, Save, Edit, X, Volume2, Phone, Mail, Smartphone, TrendingUp, Award, Building, MapPin, Sparkles, GitCompare, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EligibilityQuiz from "./EligibilityQuiz";
import StartupEligibilityQuiz from "./StartupEligibilityQuiz";
import ProgramComparison from "./ProgramComparison";
import ProgramChatDialog from "./ProgramChatDialog";
import { ProgramFeedback } from "./ProgramFeedback";
import DeadlineCountdown from "./DeadlineCountdown";
import ReminderDialog from "./ReminderDialog";
import HowToApplySection from "./HowToApplySection";
import LanguageToolbar from "./LanguageToolbar";
import { useTranslation } from "@/hooks/useTranslation";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { ApplicationConfirmationDialog } from "./ApplicationConfirmationDialog";
import ApplicationStatsDisplay from "./ApplicationStatsDisplay";
import { shouldDisplayStats } from "@/utils/statsFormatting";

interface ApplicationData {
  id?: string;
  title: string;
  description: string;
  url?: string;
  category?: string;
  important_dates?: any;
  eligibility?: string;
  application_steps?: string;
  documents_required?: any;
  fee_structure?: string;
  deadline_reminders?: any;
  application_guidance?: any;
  applied_confirmed?: boolean;
  application_status?: string;
  notification_preferences?: any;
  // Startup-specific fields
  program_type?: string;
  funding_amount?: string;
  sector?: string;
  stage?: string;
  state_specific?: string;
  success_rate?: string;
  dpiit_required?: boolean;
  // Local availability cache
  local_availability_cache?: {
    results: any[];
    state: string;
    district?: string;
    cachedAt: string;
  };
}

interface ApplicationCardProps {
  application: ApplicationData;
}

const ApplicationCard = ({ application }: ApplicationCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<ApplicationData>(application);
  const [showStartupQuiz, setShowStartupQuiz] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showDocumentChecklist, setShowDocumentChecklist] = useState(false);
  const [documentChecklist, setDocumentChecklist] = useState<string>("");
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Translation and Audio hooks
  const { currentLanguage, changeLanguage, translateText, isTranslating, getLanguageLabel } = useTranslation();
  
  // Audio playback state
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Translated content state
  const [translatedTitle, setTranslatedTitle] = useState(application.title);
  const [translatedDescription, setTranslatedDescription] = useState(application.description);
  const [translatedEligibility, setTranslatedEligibility] = useState(application.eligibility || '');
  const [translatedFeeStructure, setTranslatedFeeStructure] = useState(application.fee_structure || '');
  const [translatedApplicationSteps, setTranslatedApplicationSteps] = useState(application.application_steps || '');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // AI Enrichment state
  const [enrichmentData, setEnrichmentData] = useState<any>(null);
  const [isLoadingEnrichment, setIsLoadingEnrichment] = useState(false);
  
  // Application stats state
  const [applicationStats, setApplicationStats] = useState<any>(null);

  // Check if this is a startup program - category is the ONLY source of truth
  const isStartupProgram = application.category?.toLowerCase() === 'startups';
  const isLegalProgram = application.category?.toLowerCase() === 'legal';
  
  // Check if AI insights should be shown for this category
  const shouldShowAIInsights = isStartupProgram || isLegalProgram;

  // Load AI enrichment for startup and legal programs
  useEffect(() => {
    const loadEnrichment = async () => {
      if (!shouldShowAIInsights) return;
      
      // Check if enrichment already exists in application data
      if ((application as any).ai_enrichment) {
        setEnrichmentData((application as any).ai_enrichment);
        return;
      }

      // Otherwise fetch/generate enrichment
      setIsLoadingEnrichment(true);
      try {
        // For saved programs, use ID. For unsaved programs, pass full data
        const requestBody = application.id 
          ? { program_id: application.id }
          : { 
              program_data: {
                title: application.title,
                description: application.description,
                category: application.category,
                state_specific: application.state_specific,
                stage: application.stage,
                sector: application.sector,
                funding_amount: application.funding_amount,
                dpiit_required: application.dpiit_required,
                program_type: application.program_type
              }
            };

        // Call the appropriate enrichment function based on category
        const functionName = isStartupProgram ? 'enrich-startup-program' : 'enrich-legal-program';
        
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: requestBody
        });
        
        if (error) throw error;
        
        setEnrichmentData(data.enrichment);
      } catch (error) {
        console.error('Enrichment failed:', error);
      } finally {
        setIsLoadingEnrichment(false);
      }
    };

    loadEnrichment();
  }, [application.id, application.title, shouldShowAIInsights]);

  // Load application stats
  useEffect(() => {
    const loadStats = async () => {
      if (!application.id) return;
      
      try {
        const { data, error } = await supabase
          .from('scheme_stats')
          .select('*')
          .eq('application_id', application.id)
          .order('year', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setApplicationStats(data);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadStats();
  }, [application.id]);

  // Translate content when language changes
  useEffect(() => {
    const translateContent = async () => {
      if (currentLanguage === 'en') {
        // Reset to original content
        setTranslatedTitle(application.title);
        setTranslatedDescription(application.description);
        setTranslatedEligibility(application.eligibility || '');
        setTranslatedFeeStructure(application.fee_structure || '');
        setTranslatedApplicationSteps(application.application_steps || '');
        return;
      }

      // Translate all content
      const [title, description, eligibility, feeStructure, appSteps] = await Promise.all([
        translateText(application.title, currentLanguage),
        translateText(application.description, currentLanguage),
        application.eligibility ? translateText(application.eligibility, currentLanguage) : Promise.resolve(''),
        application.fee_structure ? translateText(application.fee_structure, currentLanguage) : Promise.resolve(''),
        application.application_steps ? translateText(application.application_steps, currentLanguage) : Promise.resolve(''),
      ]);

      setTranslatedTitle(title);
      setTranslatedDescription(description);
      setTranslatedEligibility(eligibility);
      setTranslatedFeeStructure(feeStructure);
      setTranslatedApplicationSteps(appSteps);
    };

    translateContent();
  }, [currentLanguage, application, translateText]);

  const handlePlayFullSummary = async () => {
    setIsGeneratingSummary(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-audio-summary', {
        body: {
          application: {
            title: translatedTitle,
            description: translatedDescription,
            category: application.category,
            eligibility: translatedEligibility,
            documents_required: documentsRequired,
            fee_structure: translatedFeeStructure,
            important_dates: importantDates,
            application_steps: translatedApplicationSteps,
          },
          language: currentLanguage,
          localAvailability: application.local_availability_cache,
        },
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Stop any existing audio
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }

        // Convert base64 to audio blob
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create HTML5 Audio element
        const audio = new Audio(audioUrl);
        audio.playbackRate = playbackSpeed;
        
        audio.onended = () => {
          setIsPlaying(false);
          setIsPaused(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          toast({
            variant: 'destructive',
            title: 'Playback Error',
            description: 'Failed to play audio. Please try again.',
          });
          setIsPlaying(false);
          setIsPaused(false);
        };
        
        setAudioElement(audio);
        await audio.play();
        setIsPlaying(true);
        setIsPaused(false);
        
        toast({
          title: 'Playing Summary',
          description: `Now playing in ${currentLanguage === 'hi' ? 'Hindi' : currentLanguage === 'kn' ? 'Kannada' : 'English'}`,
        });
      } else {
        throw new Error('No audio content received');
      }
    } catch (error: any) {
      console.error('Error generating audio summary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate audio summary. Please try again.',
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handlePause = () => {
    if (audioElement && isPlaying) {
      audioElement.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleResume = () => {
    if (audioElement && isPaused) {
      audioElement.play();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioElement) {
      audioElement.playbackRate = speed;
    }
  };

  const handleSave = async () => {
    if (!application.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          title: editedData.title,
          description: editedData.description,
          url: editedData.url,
          category: editedData.category,
          important_dates: editedData.important_dates,
          eligibility: editedData.eligibility,
          application_steps: editedData.application_steps,
          documents_required: editedData.documents_required,
          fee_structure: editedData.fee_structure,
          deadline_reminders: editedData.deadline_reminders,
        })
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Changes Saved",
        description: "Your application has been updated successfully.",
      });

      setIsEditing(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error: any) {
      console.error("Error saving application:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save changes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!application.id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', application.id);

      if (error) throw error;

      toast({
        title: "Application Deleted",
        description: "The application has been removed from your saved list.",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete application.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefresh = async () => {
    if (!application.id) return;
    
    setIsRefreshing(true);
    try {
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('process-query', {
        body: { query: application.url || application.title }
      });

      if (refreshError) throw refreshError;

      // Validate application_guidance structure
      if (refreshData?.application_guidance) {
        const guidance = refreshData.application_guidance;
        if (!Array.isArray(guidance.online_steps) || !guidance.online_steps.every((step: any) => typeof step === 'string')) {
          console.error('Invalid online_steps structure:', guidance.online_steps);
          throw new Error('Invalid application guidance structure');
        }
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          ...refreshData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      toast({
        title: "Application refreshed",
        description: "Details updated with the latest information.",
      });

      window.location.reload();
    } catch (error: any) {
      console.error('Error refreshing application:', error);
      toast({
        title: "Error",
        description: "Failed to refresh application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGenerateChecklist = async () => {
    setIsGeneratingChecklist(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-checklist', {
        body: { program: application }
      });

      if (error) throw error;

      if (data?.checklist) {
        setDocumentChecklist(data.checklist);
        setShowDocumentChecklist(true);
        toast({
          title: "Checklist Generated",
          description: "Your personalized document checklist is ready!",
        });
      }
    } catch (error: any) {
      console.error('Error generating checklist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate document checklist.',
      });
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  // Normalize important_dates to handle both object and array formats (backwards compatibility)
  const importantDates = (() => {
    if (!application.important_dates) return null;
    
    const dates = typeof application.important_dates === 'string' 
      ? JSON.parse(application.important_dates) 
      : application.important_dates;
    
    // If it's already an object (correct format), return as-is
    if (!Array.isArray(dates)) return dates;
    
    // If it's an array (buggy format), convert to object
    const converted: any = {};
    dates.forEach((item: any) => {
      if (item.label && item.date) {
        const key = item.label.toLowerCase().replace(/\s+/g, '_');
        converted[key] = item.date;
      }
    });
    
    return Object.keys(converted).length > 0 ? converted : null;
  })();

  const documentsRequired = application.documents_required
    ? (typeof application.documents_required === 'string'
        ? JSON.parse(application.documents_required)
        : application.documents_required)
    : null;

  const deadlineReminders = application.deadline_reminders
    ? (typeof application.deadline_reminders === 'string'
        ? JSON.parse(application.deadline_reminders)
        : application.deadline_reminders)
    : null;

  // Helper to get document icon
  const getDocIcon = (doc: string) => {
    const docLower = doc.toLowerCase();
    if (docLower.includes('degree') || docLower.includes('certificate')) return GraduationCap;
    if (docLower.includes('aadhaar') || docLower.includes('id')) return IdCard;
    if (docLower.includes('photo')) return User;
    if (docLower.includes('pan')) return CreditCard;
    if (docLower.includes('mark') || docLower.includes('sheet')) return FileCheck;
    return FileText;
  };

  // Helper to determine status badge
  const getStatusBadge = () => {
    const status = application.application_status || 'discovered';
    const statusConfig: Record<string, { label: string; variant: any; className: string }> = {
      discovered: { label: 'Discovered', variant: 'secondary', className: 'bg-gray-100 text-gray-700' },
      applied: { label: 'Applied', variant: 'default', className: 'bg-blue-100 text-blue-700' },
      correction_window: { label: 'Correction Period', variant: 'secondary', className: 'bg-yellow-100 text-yellow-700' },
      admit_card_released: { label: 'Admit Card Out', variant: 'default', className: 'bg-green-100 text-green-700' },
      exam_completed: { label: 'Exam Done', variant: 'secondary', className: 'bg-purple-100 text-purple-700' },
      result_pending: { label: 'Result Pending', variant: 'secondary', className: 'bg-orange-100 text-orange-700' },
      result_released: { label: 'Result Out', variant: 'default', className: 'bg-green-100 text-green-700' },
      archived: { label: 'Archived', variant: 'outline', className: 'bg-gray-100 text-gray-500' },
    };
    
    const config = statusConfig[status] || statusConfig.discovered;
    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
        <CheckCircle2 className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Helper to get success rate color
  const getSuccessRateColor = (rate?: string) => {
    switch (rate?.toLowerCase()) {
      case 'high':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return '';
    }
  };

  // Helper to format program type
  const formatProgramType = (type?: string) => {
    if (!type) return '';
    return type.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="w-full animate-fade-in">
      {/* Confirmation Banner */}
      {application.id && !application.applied_confirmed && (
        <div className="bg-primary/10 border-b border-primary/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Track this application?</p>
                <p className="text-sm text-muted-foreground">
                  Confirm you've applied to get automated reminders and status updates
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowConfirmationDialog(true)}
              size="sm"
              className="shrink-0"
            >
              Confirm & Set Reminders
            </Button>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-4">
        {/* Language and Audio Toolbar */}
        <LanguageToolbar
          currentLanguage={currentLanguage}
          onLanguageChange={changeLanguage}
          isPlaying={isPlaying}
          isPaused={isPaused}
          isGeneratingSummary={isGeneratingSummary}
          onPlayFullSummary={handlePlayFullSummary}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          playbackSpeed={playbackSpeed}
          onSpeedChange={handleSpeedChange}
          getLanguageLabel={getLanguageLabel}
        />

        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {isEditing ? (
                <Input
                  value={editedData.title}
                  onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                  className="text-4xl font-bold h-auto py-2"
                />
              ) : isTranslating && currentLanguage !== 'en' ? (
                <Skeleton className="h-12 w-3/4" />
              ) : (
                <CardTitle className="text-4xl">{translatedTitle}</CardTitle>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isEditing ? (
                <Input
                  value={editedData.category || ''}
                  onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                  placeholder="Category"
                  className="w-32"
                />
              ) : (
                <>
                  {application.category && (
                    <Badge variant="secondary" className="text-base px-3 py-1">{application.category}</Badge>
                  )}
                  {getStatusBadge()}
                  
                  {/* Startup-Specific Header Badges */}
                  {isStartupProgram && (
                    <>
                      {application.program_type && (
                        <Badge variant="default" className="text-base px-3 py-1 gap-1.5">
                          <Building className="w-4 h-4" />
                          {formatProgramType(application.program_type)}
                        </Badge>
                      )}
                      {application.funding_amount && (
                        <Badge variant="secondary" className="text-base px-3 py-1 gap-1.5 bg-green-50 text-green-700 border-green-200">
                          <DollarSign className="w-4 h-4" />
                          {application.funding_amount}
                        </Badge>
                      )}
                      {application.dpiit_required && (
                        <Badge variant="outline" className="text-base px-3 py-1 gap-1.5">
                          <Award className="w-4 h-4" />
                          DPIIT Required
                        </Badge>
                      )}
                      {application.success_rate && (
                        <Badge variant="outline" className={`text-base px-3 py-1 gap-1.5 ${getSuccessRateColor(application.success_rate)}`}>
                          <TrendingUp className="w-4 h-4" />
                          {application.success_rate} Success Rate
                        </Badge>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedData(application);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {application.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                {application.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={application.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Official Page
                    </a>
                  </Button>
                )}
                {application.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Application?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this application from your saved list. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </div>

        {(application.description || isEditing) && (
          isEditing ? (
            <Textarea
              value={editedData.description || ''}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              placeholder="Description"
              className="text-lg leading-relaxed min-h-24"
            />
          ) : isTranslating && currentLanguage !== 'en' ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <CardDescription className="text-lg leading-relaxed">
              {translatedDescription}
            </CardDescription>
          )
        )}

        {/* Application Statistics */}
        {applicationStats && shouldDisplayStats(applicationStats) && (
          <div className="mt-4">
            <ApplicationStatsDisplay stats={applicationStats} />
          </div>
        )}

        {/* Enhanced Startup Eligibility Section */}
        {isStartupProgram && (application.stage || application.sector || application.state_specific) && (
          <Card className="mt-4 bg-slate-800/40">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Program Eligibility Criteria
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {application.stage && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <div className="text-xs text-muted-foreground mb-1">Eligible Stages</div>
                    <div className="flex flex-wrap gap-1">
                      {application.stage.split(',').map((s, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {s.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {application.sector && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <div className="text-xs text-muted-foreground mb-1">Sectors</div>
                    <div className="text-sm font-medium">{application.sector}</div>
                  </div>
                )}
                {application.state_specific && (
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <div className="text-xs text-muted-foreground mb-1">Location</div>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {application.state_specific}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Funding Details Section - For startup funding programs */}
        {isStartupProgram && application.funding_amount && application.program_type?.includes('funding') && (
          <Card className="mt-4 bg-slate-800/40">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Funding Details
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <span className="text-sm text-muted-foreground">Funding Amount</span>
                  <span className="text-base font-bold text-green-500">{application.funding_amount}</span>
                </div>
                {application.program_type && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <span className="text-sm text-muted-foreground">Program Type</span>
                    <span className="text-sm font-medium">{formatProgramType(application.program_type)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI-Powered Enrichment Sections */}
        {shouldShowAIInsights && isLoadingEnrichment && (
          <Card className="mt-4">
            <CardContent className="pt-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading AI-powered insights...</span>
            </CardContent>
          </Card>
        )}

        {/* Founder/Professional Insights Section */}
        {shouldShowAIInsights && enrichmentData?.founder_insights && (
          <Card className="mt-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                💡 {isLegalProgram ? 'Professional Insights' : 'Founder Insights'}
              </h4>
              <div className="space-y-2">
                {enrichmentData.founder_insights.map((insight: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage-Specific Preparation Checklist */}
        {shouldShowAIInsights && enrichmentData?.preparation_checklist && (
          <Card className="mt-4 bg-slate-800/40">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                📋 Before You Apply
              </h4>
              
              <Tabs defaultValue="idea_stage" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-3">
                  <TabsTrigger value="idea_stage">Idea Stage</TabsTrigger>
                  <TabsTrigger value="prototype_stage">Prototype</TabsTrigger>
                  <TabsTrigger value="revenue_stage">Revenue</TabsTrigger>
                </TabsList>
                
                {Object.entries(enrichmentData.preparation_checklist).map(([stage, items]) => (
                  <TabsContent key={stage} value={stage} className="space-y-2 mt-3">
                    {(items as string[]).map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Success Probability Meter */}
        {shouldShowAIInsights && enrichmentData?.success_metrics && (
          <Card className="mt-4 bg-slate-800/40">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                📊 Success Insights
              </h4>
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Estimated Approval Rate</span>
                    <span className="text-2xl font-bold text-green-400">
                      {enrichmentData.success_metrics.approval_rate}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <div className="text-xs text-muted-foreground mb-1">Avg Timeline</div>
                    <div className="text-sm font-medium">{enrichmentData.success_metrics.avg_approval_time}</div>
                  </div>
                  {enrichmentData.success_metrics.total_funded && (
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                      <div className="text-xs text-muted-foreground mb-1">Startups Funded</div>
                      <div className="text-sm font-bold text-primary">{enrichmentData.success_metrics.total_funded}</div>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {enrichmentData.success_metrics.confidence_level === 'high' ? '✓' : '~'} Based on {enrichmentData.success_metrics.data_source}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Real-Life Example */}
        {shouldShowAIInsights && enrichmentData?.real_example && (
          <Card className="mt-4 bg-gradient-to-br from-indigo-900/20 to-cyan-900/20 border-indigo-500/30">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                🚀 Success Story
              </h4>
              <div className="p-4 rounded-lg bg-slate-900/40 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-base">{enrichmentData.real_example.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {enrichmentData.real_example.location} • {enrichmentData.real_example.sector}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {enrichmentData.real_example.year}
                  </Badge>
                </div>
                <div className="pt-2 border-t border-slate-700/50">
                  <p className="text-sm">
                    <span className="text-green-400 font-semibold">{enrichmentData.real_example.funding_received}</span> received
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {enrichmentData.real_example.outcome}
                  </p>
                </div>
                {enrichmentData.real_example.is_simulated && (
                  <p className="text-xs text-muted-foreground italic">
                    * Representative example for illustration
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Contacts Section (Enhanced) */}
        {shouldShowAIInsights && enrichmentData?.help_contacts && (
          <Card className="mt-4 bg-slate-800/40">
            <CardContent className="pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                🤝 Get Support
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Connect with incubators and mentors who can help with your application
              </p>
              
              {enrichmentData.help_contacts.incubators && enrichmentData.help_contacts.incubators.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium">Recommended Incubators:</p>
                  <div className="flex flex-wrap gap-2">
                    {enrichmentData.help_contacts.incubators.map((inc: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-sm">
                        {inc}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {enrichmentData.help_contacts.state_nodal_officer && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Contact: <strong>{enrichmentData.help_contacts.state_nodal_officer}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {application.url && (
            <Button asChild size="lg" className="flex-1 min-w-[200px]">
              <a href={application.url} target="_blank" rel="noopener noreferrer">
                Apply Now
              </a>
            </Button>
          )}
          {application.eligibility && !isStartupProgram && (
            <Button
              onClick={() => setShowQuiz(true)}
              variant="outline"
              size="lg"
              className="flex-1 min-w-[200px]"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              See if You Qualify
            </Button>
          )}
          {isStartupProgram && (
            <>
              <Button
                onClick={() => setShowStartupQuiz(true)}
                variant="outline"
                size="lg"
                className="flex-1 min-w-[200px]"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Check Eligibility
              </Button>
              <Button
                onClick={() => setShowComparison(true)}
                variant="outline"
                size="lg"
                className="flex-1 min-w-[200px]"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare Programs
              </Button>
              <ProgramChatDialog program={application} />
            </>
          )}
          {importantDates && (
            <Button variant="outline" size="lg" onClick={() => setShowReminderDialog(true)}>
              <Bell className="w-4 h-4 mr-2" />
              Set Reminder
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Accordion type="multiple" defaultValue={["dates", "eligibility"]} className="w-full">
          {/* Important Dates - Open by default (hidden for startup programs as AI insights provide timeline) */}
          {importantDates && Object.keys(importantDates).length > 0 && !isStartupProgram && (
            <AccordionItem value="dates">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Key Dates
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {Object.entries(importantDates).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <span className="text-base font-medium capitalize">
                        {key.replace(/_/g, ' ').replace(/date/i, '').trim()}
                      </span>
                      <span className="text-base font-semibold">{value as string}</span>
                    </div>
                  ))}
                  {deadlineReminders && deadlineReminders.length > 0 && (
                    <div className="mt-4">
                      <DeadlineCountdown 
                        importantDates={importantDates} 
                        reminders={deadlineReminders}
                      />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Eligibility - Open by default */}
          {application.eligibility && (
            <AccordionItem value="eligibility">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  Quick Eligibility Snapshot
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {application.eligibility.toLowerCase().includes('not yet released') || 
                   application.eligibility.toLowerCase().includes('not released') ? (
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-base font-medium">Eligibility details will be officially announced soon</p>
                          <p className="text-base text-muted-foreground mt-1">
                            Here's what we expect based on previous years 👇
                          </p>
                        </div>
                      </div>
                    </div>
                   ) : null}
                  {isTranslating && currentLanguage !== 'en' ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : (
                    <div className="space-y-2 text-base leading-relaxed whitespace-pre-line">
                      {translatedEligibility.split('\n').map((line, idx) => {
                      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                        return (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50">
                            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{line.replace(/^[•-]\s*/, '')}</span>
                          </div>
                        );
                      }
                        return line.trim() ? <p key={idx}>{line}</p> : null;
                      })}
                    </div>
                  )}
                  <Button
                    onClick={() => setShowQuiz(true)}
                    variant="secondary"
                    className="w-full mt-4"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Take Quick Eligibility Check →
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Documents - Collapsed by default */}
          {documentsRequired && documentsRequired.length > 0 && (
            <AccordionItem value="documents">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  Keep These Ready 📂
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {documentsRequired.map((doc: string, index: number) => {
                      const DocIcon = getDocIcon(doc);
                      return (
                        <Badge
                          key={index}
                          variant="outline"
                          className="py-2 px-4 text-base gap-2 hover:bg-muted"
                        >
                          <DocIcon className="w-5 h-5" />
                          {doc}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Fee Structure - Collapsed by default */}
          {application.fee_structure && (
            <AccordionItem value="fees">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-primary" />
                  Fees Summary 💰
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 space-y-2">
                  {isTranslating && currentLanguage !== 'en' ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : (
                    <>
                      {translatedFeeStructure.toLowerCase().includes('not yet released') ||
                       translatedFeeStructure.toLowerCase().includes('not released') ? (
                        <div className="p-3 bg-muted/50 rounded-lg mb-3">
                          <p className="text-base">
                            Exact fees coming soon — but here's last year's pattern so you can plan ahead 💰
                          </p>
                        </div>
                      ) : null}
                      <div className="text-base leading-relaxed whitespace-pre-line">
                        {translatedFeeStructure}
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Application Steps - Collapsed by default */}
          {application.application_steps && (
            <AccordionItem value="steps">
              <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-primary" />
                  How to Apply
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {isTranslating && currentLanguage !== 'en' ? (
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : (
                  <HowToApplySection 
                    applicationSteps={translatedApplicationSteps}
                    applicationUrl={application.url}
                    applicationGuidance={application.application_guidance}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Quick Checklist Section - Outside Accordion */}
        {documentsRequired && documentsRequired.length > 0 && (
          <div className="mt-8 mx-6 mb-6">
            <div className="border rounded-xl p-5 bg-slate-800/40 backdrop-blur-sm shadow-lg">
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-primary" />
                Quick Checklist — Keep These Ready
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {documentsRequired.map((doc: string, index: number) => {
                  const DocIcon = getDocIcon(doc);
                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 hover:border-primary/30 transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm flex items-center gap-2">
                        <DocIcon className="w-4 h-4" />
                        {doc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Need Help Section - Outside Accordion (hidden for startup programs as AI insights provide help contacts) */}
        {(application.application_guidance?.helpline || application.application_guidance?.email || application.url) && !isStartupProgram && (
          <div className="mx-6 mb-8">
            <div className="border rounded-xl p-5 bg-slate-800/40 backdrop-blur-sm shadow-lg">
              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                💬 Need Help?
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                If you face any issues while applying, reach out for assistance:
              </p>
              <div className="space-y-3">
                {application.application_guidance?.helpline && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm">Helpline: <strong>{application.application_guidance.helpline}</strong></span>
                  </div>
                )}
                {application.application_guidance?.email && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm break-all">Email: <strong>{application.application_guidance.email}</strong></span>
                  </div>
                )}
                {!application.application_guidance?.helpline && !application.application_guidance?.email && application.url && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <ExternalLink className="w-5 h-5 text-primary flex-shrink-0" />
                    <a 
                      href={application.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm hover:text-primary transition-colors"
                    >
                      Visit <strong>official website</strong> for contact details
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Feedback - Bottom of card */}
        {isStartupProgram && (
          <div className="mt-6 pt-6 border-t border-border/50 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Help us improve your experience
            </p>
            <ProgramFeedback 
              programTitle={application.title}
              programUrl={application.url}
            />
          </div>
        )}
      </CardContent>

      {/* Eligibility Quiz Dialog */}
      <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Eligibility Check</DialogTitle>
          </DialogHeader>
          {application.eligibility && (
            <EligibilityQuiz
              eligibility={application.eligibility}
              onClose={() => setShowQuiz(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Startup Eligibility Quiz Dialog */}
      <Dialog open={showStartupQuiz} onOpenChange={setShowStartupQuiz}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Startup Eligibility Check</DialogTitle>
          </DialogHeader>
          {isStartupProgram && application.eligibility && (
            <StartupEligibilityQuiz
              programTitle={application.title}
              eligibility={application.eligibility}
              sector={application.sector}
              stage={application.stage}
              fundingAmount={application.funding_amount}
              dpiitRequired={application.dpiit_required}
              onClose={() => setShowStartupQuiz(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Program Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-7xl max-h-[85vh] overflow-y-auto">
          <ProgramComparison
            currentProgram={application}
            onClose={() => setShowComparison(false)}
            onTrack={(programs) => {
              toast({
                title: "Programs Tracked",
                description: `Now tracking ${programs.length} program(s)`,
              });
              setShowComparison(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Document Checklist Dialog */}
      <Dialog open={showDocumentChecklist} onOpenChange={setShowDocumentChecklist}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Checklist for {application.title}</DialogTitle>
          </DialogHeader>
          {documentChecklist && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{documentChecklist}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      {importantDates && (
        <ReminderDialog
          open={showReminderDialog}
          onOpenChange={setShowReminderDialog}
          importantDates={importantDates}
          applicationTitle={application.title}
        />
      )}

      {/* Application Confirmation Dialog */}
      {application.id && (
        <ApplicationConfirmationDialog
          open={showConfirmationDialog}
          onOpenChange={setShowConfirmationDialog}
          application={{
            id: application.id,
            title: application.title,
            important_dates: importantDates,
            notification_preferences: application.notification_preferences
          }}
          onConfirm={() => {
            // Reload to show updated state
            window.location.reload();
          }}
        />
      )}
    </Card>
  );
};

export default ApplicationCard;
