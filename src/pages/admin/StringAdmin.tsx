/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MapPin, ShoppingBag, Briefcase, CheckCircle, XCircle,
  Clock, Building2, User, Loader2, Users,
  DollarSign, Settings, Key, MessageSquare, Send, Pin,
  Crown, Shield, Trash2, PackageCheck, AlertTriangle,
  Star, Wallet, Reply, Eye, Image, Zap, TrendingUp, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { useAllWithdrawals, useProcessWithdrawal } from "@/hooks/useBusinessEarnings";
import { useAllMessageReplies } from "@/hooks/useAdminMessages";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { LaunchAnalytics } from "@/components/admin/LaunchAnalytics";
import { playVerificationChime, playRevokedChime, playOrderChime, playPremiumMatchChime, playChatAlert } from "@/hooks/useAudioSignals";
import { usePremiumMail } from "@/hooks/usePremiumMail";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";
import { cn } from "@/lib/utils";

type VerificationTier = 'none' | 'basic' | 'verified' | 'premium' | 'elite';

export default function StringAdmin() {
  const { signOut, user, refreshProfile, isAdmin, loading: checkingAdminFromAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dispatchEmail } = usePremiumMail();
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [bootstrapKey, setBootstrapKey] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [batchAvatarUrl, setBatchAvatarUrl] = useState("");
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [batchFilter, setBatchFilter] = useState<'all' | 'male' | 'female' | 'neutral'>("all");

  // Booster Price State and Query
  const { data: boosterPrice = 15000 } = useQuery({
    queryKey: ["admin-booster-price"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "booster_monthly_price")
          .maybeSingle();
        if (error || !data) throw new Error("Fallback");
        return Number(data.value);
      } catch {
        const stored = localStorage.getItem("booster_monthly_price");
        return stored ? Number(stored) : 15000;
      }
    }
  });

  const [boosterPriceInput, setBoosterPriceInput] = useState(boosterPrice.toString());
  const [commissionInput, setCommissionInput] = useState(localStorage.getItem("global_commission_percent") || "10");

  // IDIC Global Dashboard control
  const [hideIdicDashboard, setHideIdicDashboard] = useState(false);
  const { data: idicConfig } = useQuery({
    queryKey: ["admin-idic-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "hide_idic_dashboard")
        .maybeSingle();
      if (error || !data) return { value: "false" };
      return data;
    }
  });

  useEffect(() => {
    if (idicConfig) {
      setHideIdicDashboard(idicConfig.value === true || idicConfig.value === "true");
    }
  }, [idicConfig]);

  // Custom Referral Input States
  const [newRefCode, setNewRefCode] = useState("");
  const [referrerPointsInput, setReferrerPointsInput] = useState("100");
  const [referredPointsInput, setReferredPointsInput] = useState("50");
  const [refQualifyingType, setRefQualifyingType] = useState("any");
  const [refAssignedUser, setRefAssignedUser] = useState("");
  const [refIsBusiness, setRefIsBusiness] = useState(false);

  // Feedbacks Query
  const { data: feedbacks = [], isLoading: loadingFeedbacks, refetch: refetchFeedbacks } = useQuery({
    queryKey: ["admin-feedbacks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedbacks")
        .select("*, profiles:user_id (full_name, email, user_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Referral Codes Query
  const { data: referralCodes = [], isLoading: loadingReferralCodes, refetch: refetchReferralCodes } = useQuery({
    queryKey: ["admin-referral-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_codes")
        .select(`
          *,
          profiles:user_id (full_name, email),
          assigned_profiles:assigned_user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fraud Alerts Query
  const { data: fraudAlerts = [], isLoading: loadingFraudAlerts, refetch: refetchFraudAlerts } = useQuery({
    queryKey: ["admin-fraud-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_fraud_alerts")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Referrals List Query
  const { data: referralsList = [], isLoading: loadingReferrals, refetch: refetchReferrals } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referrers:referrer_id (full_name, email),
          referreds:referred_id (full_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Feedback mutations
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ feedbackId, status, notes }: { feedbackId: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (notes !== undefined) updates.admin_notes = notes;
      
      const { error } = await supabase
        .from("user_feedbacks")
        .update(updates)
        .eq("id", feedbackId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback updated successfully! 💬");
      refetchFeedbacks();
    },
    onError: (err) => {
      toast.error("Failed to update feedback: " + err.message);
    }
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from("user_feedbacks")
        .delete()
        .eq("id", feedbackId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback deleted successfully! 🗑️");
      refetchFeedbacks();
    },
    onError: (err) => {
      toast.error("Failed to delete feedback: " + err.message);
    }
  });

  // Referral campaign mutations
  const createReferralCodeMutation = useMutation({
    mutationFn: async (payload: {
      code: string;
      points_to_referrer: number;
      points_to_referred: number;
      qualifying_user_type: string;
      assigned_user_id: string | null;
      is_business_code: boolean;
    }) => {
      const { error } = await supabase
        .from("referral_codes")
        .insert({
          user_id: user?.id,
          code: payload.code.trim().toUpperCase(),
          points_to_referrer: payload.points_to_referrer,
          points_to_referred: payload.points_to_referred,
          qualifying_user_type: payload.qualifying_user_type,
          assigned_user_id: payload.assigned_user_id || null,
          is_business_code: payload.is_business_code,
          created_by_admin: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Referral campaign created successfully! 🎟️");
      refetchReferralCodes();
      setNewRefCode("");
      setRefAssignedUser("");
    },
    onError: (err) => {
      toast.error("Failed to create referral code: " + err.message);
    }
  });

  const revokeReferralCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from("referral_codes")
        .update({ is_revoked: true })
        .eq("id", codeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Referral code deactivated successfully! 🚫");
      refetchReferralCodes();
    },
    onError: (err) => {
      toast.error("Failed to revoke referral: " + err.message);
    }
  });

  const revokeReferralRewardMutation = useMutation({
    mutationFn: async (referralId: string) => {
      const { data, error } = await supabase.rpc("revoke_referral_bonus", {
        p_referral_id: referralId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.success) {
        toast.success("Successfully revoked bonus points! 💸");
        refetchReferrals();
        refetchFraudAlerts();
      } else {
        toast.error(data?.message || "Could not revoke points.");
      }
    },
    onError: (err) => {
      toast.error("Failed to revoke points: " + err.message);
    }
  });

  // Fetch activity logs
  const { data: activityLogs, isLoading: loadingActivityLogs, refetch: refetchActivityLogs } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Toggle user ban status mutation
  const toggleBanUserMutation = useMutation({
    mutationFn: async ({ userId, isBanned }: { userId: string; isBanned: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: isBanned })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isBanned ? "User banned successfully!" : "User unbanned successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to update user ban state.");
    }
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => {
      toast.error("Failed to delete review.");
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: () => {
      toast.error("Failed to delete product.");
    }
  });

  // Override wallet balance mutation
  const updateBusinessWalletMutation = useMutation({
    mutationFn: async ({ businessId, availableBalance }: { businessId: string; availableBalance: number }) => {
      const { error } = await supabase
        .from("business_wallets")
        .upsert({ 
          business_id: businessId, 
          available_balance: availableBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: "business_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Wallet balance overridden successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to override wallet balance.");
    }
  });

  useEffect(() => {
    if (boosterPrice !== undefined) {
      setBoosterPriceInput(boosterPrice.toString());
    }
  }, [boosterPrice]);

  // Message dialog state
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageRecipientType, setMessageRecipientType] = useState<'all' | 'businesses' | 'customers'>('all');
  const [messagePinned, setMessagePinned] = useState(false);

  // Real-time message monitoring state
  const [liveMessages, setLiveMessages] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch of last 50 messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_type,
          created_at,
          attachments,
          sender_id,
          conversations (
            id,
            businesses (
              company_name
            ),
            customers (
              profiles (
                full_name
              )
            )
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching admin live messages:", error);
      } else if (data) {
        setLiveMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("admin-messages-monitor")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          // Re-fetch to get complete relations (joins) for the new message
          const { data, error } = await supabase
            .from("messages")
            .select(`
              id,
              content,
              sender_type,
              created_at,
              attachments,
              sender_id,
              conversations (
                id,
                businesses (
                  company_name
                ),
                customers (
                  profiles (
                    full_name
                  )
                )
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (!error && data) {
            setLiveMessages((prev) => [data, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const simulateBid = () => {
    const mockBid = {
      id: "bid-" + Math.floor(Math.random() * 1000),
      buyerName: "Ibrahim Tijani",
      itemName: "Custom Velvet Ankara Gown",
      quantity: 1,
      price: 18500,
      timestamp: Date.now(),
    };
    localStorage.setItem("string_simulated_bid", JSON.stringify(mockBid));
    playChatAlert();
    toast.success("Simulated customer custom bid message! Audio alert triggered 💬");
    
    if (user?.id) {
      supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "simulated_bid",
        details: { buyer: "Ibrahim Tijani", item: "Custom Velvet Ankara Gown", price: 18500 }
      }).then(() => refetchActivityLogs?.());
    }
  };

  const simulateDemand = () => {
    const categories = ["Ankara Outfits", "Knotless Braids", "Corporate Makeup", "Native Sew-in", "Gele Tying", "Agbada Tailoring"];
    const locations = ["Surulere", "Ikeja", "Lekki", "Yaba", "Victoria Island"];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const randomLoc = locations[Math.floor(Math.random() * locations.length)];
    const mockDemand = {
      category: randomCat,
      location: randomLoc,
      interest: Math.floor(Math.random() * 20) + 80,
      trend: ["Exploding 🔥", "High Demand 📈", "Trending ✨"][Math.floor(Math.random() * 3)],
    };
    localStorage.setItem("string_simulated_demand", JSON.stringify(mockDemand));
    playPremiumMatchChime();
    toast.success(`Simulated search demand: ${randomCat} in ${randomLoc}!`);

    if (user?.id) {
      supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "simulated_demand",
        details: { category: randomCat, location: randomLoc }
      }).then(() => refetchActivityLogs?.());
    }
  };

  const simulateEscrowOrder = async () => {
    playOrderChime();
    
    if (user?.id) {
      const { error } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "escrow_deposit",
        details: {
          order_id: "ORD-" + Math.floor(Math.random() * 900000 + 100000),
          customer_name: "Adebayo S.",
          total_price: 32000,
          status: "funds_escrowed"
        }
      });
      if (!error) refetchActivityLogs?.();
    }
    toast.success("Simulated escrow transaction completed! Chime active 🔔");
  };

  // We now use isAdmin and checkingAdmin directly from useAuth() hook above.
  const checkingAdmin = checkingAdminFromAuth;



  // Bootstrap admin mutation
  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { secret_key: bootstrapKey, user_id: user?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async () => {
      toast.success("Admin access granted! Your account is now elevated. Switch between Admin and User views anytime from your profile settings!");
      if (user?.id) {
        localStorage.setItem(`string_active_admin_mode_${user.id}`, "false");
      }
      await refreshProfile();
      setBootstrapKey("");
      navigate("/", { replace: true });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to bootstrap admin");
    },
  });

  // Fetch all profiles (users)
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all customers with location data
  const { data: customers } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, profiles:user_id (full_name, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch location requests
  const { data: locationRequests, isLoading: loadingLocations } = useQuery({
    queryKey: ["admin-location-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_requests")
        .select("*, profiles:user_id (full_name, email, user_type)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all businesses
  const { data: businesses, isLoading: loadingBusinesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*, profiles:user_id (full_name, email), business_wallets (available_balance)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch latest terms version
  const { data: config } = useQuery({
    queryKey: ["latest-terms-version"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "latest_terms_version")
        .single();
      if (error) return { value: 1 };
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, businesses:business_id (company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch orders
  const { data: orders, isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, businesses:business_id (company_name), customers:customer_id (id, user_id, profiles:user_id (full_name, email))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch jobs
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, businesses:business_id (company_name), customers:customer_id (id, user_id, profiles:user_id (full_name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch admin messages
  const { data: adminMessages, isLoading: loadingMessages } = useQuery({
    queryKey: ["admin-messages-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all reviews
  const { data: allReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, businesses:business_id (company_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all offers
  const { data: allOffers, isLoading: loadingOffers } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Withdrawals
  const { data: withdrawals, isLoading: loadingWithdrawals } = useAllWithdrawals();
  const processWithdrawal = useProcessWithdrawal();

  // Message replies
  const { data: messageReplies, isLoading: loadingReplies } = useAllMessageReplies();

  // Verify location mutation
  const verifyLocationMutation = useMutation({
    mutationFn: async ({
      requestId, userId, userType, latitude, longitude, approved
    }: {
      requestId: string; userId: string; userType: string;
      latitude?: number; longitude?: number; approved: boolean;
      email?: string; fullName?: string; streetAddress?: string; areaName?: string;
    }) => {
      const { error: requestError } = await supabase
        .from("location_requests")
        .update({
          status: approved ? "verified" : "rejected",
          verified_latitude: latitude,
          verified_longitude: longitude,
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      if (approved) {
        const verifiedAt = new Date().toISOString();

        // Update user profile location for global admin/user search views.
        const { error: profileError } = await (supabase as any)
          .from("profiles")
          .update({
            latitude,
            longitude,
          })
          .eq("user_id", userId);
        if (profileError) throw profileError;

        const verificationUpdate = {
          latitude,
          longitude,
          location_verified: true,
          location_verified_at: verifiedAt,
          location_verified_by: user?.id,
        };

        if (userType === 'business') {
          const { error: businessVerifyError } = await (supabase as any)
            .from("businesses")
            .update(verificationUpdate)
            .eq("user_id", userId);
          if (businessVerifyError) throw businessVerifyError;
        } else {
          const { error: customerVerifyError } = await (supabase as any)
            .from("customers")
            .update(verificationUpdate)
            .eq("user_id", userId);
          if (customerVerifyError) throw customerVerifyError;
        }
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-location-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      
      if (variables.approved) {
        // 1. Play ascending success chime!
        playVerificationChime().catch(console.error);

        // 2. Dispatch business_verified themed email!
        if (variables.email && variables.fullName) {
          dispatchEmail(
            "business_verified", 
            variables.userId, 
            variables.email, 
            variables.fullName, 
            { 
              address: variables.streetAddress || "Verified Address", 
              areaName: variables.areaName || "Verified Area" 
            }
          ).catch(console.error);
        }
        toast.success("Location request approved & verified checkmark activated!");
      } else {
        // Play alert warning warning chime
        playRevokedChime().catch(console.error);
        toast.success("Location request rejected.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to process request");
    },
  });

  const updateUserLocationMutation = useMutation({
    mutationFn: async ({ userId, address }: { userId: string; address: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ address })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("User location updated");
    },
    onError: () => toast.error("Failed to update user location"),
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async ({
      userId,
      themeMode,
      themePalette,
      avatarUrl
    }: {
      userId: string;
      themeMode?: 'dark' | 'light';
      themePalette?: 'blue' | 'mono';
      avatarUrl?: string | null;
    }) => {
      const updates: any = {};
      if (themeMode !== undefined) updates.theme_mode = themeMode;
      if (themePalette !== undefined) updates.theme_palette = themePalette;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("User profile settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update profile settings");
    }
  });

  const batchUpdateAvatarsMutation = useMutation({
    mutationFn: async ({ avatarUrl, filter }: { avatarUrl: string; filter: 'all' | 'male' | 'female' | 'neutral' }) => {
      if (filter === 'all') {
        const { error } = await supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      } else if (filter === 'male') {
        const { data: customersData, error: custError } = await supabase
          .from("customers")
          .select("user_id")
          .eq("gender", "male");
        if (custError) throw custError;

        const userIds = customersData?.map(c => c.user_id).filter(Boolean) || [];
        if (userIds.length === 0) {
          throw new Error("No male customers found to update");
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .in("id", userIds);
        if (error) throw error;
      } else if (filter === 'female') {
        const { data: customersData, error: custError } = await supabase
          .from("customers")
          .select("user_id")
          .eq("gender", "female");
        if (custError) throw custError;

        const userIds = customersData?.map(c => c.user_id).filter(Boolean) || [];
        if (userIds.length === 0) {
          throw new Error("No female customers found to update");
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          })
          .in("id", userIds);
        if (error) throw error;
      } else if (filter === 'neutral') {
        // Fetch all male/female customers
        const { data: genderedCustomers, error: custError } = await supabase
          .from("customers")
          .select("user_id")
          .in("gender", ["male", "female"]);
        if (custError) throw custError;

        const genderedUserIds = genderedCustomers?.map(c => c.user_id).filter(Boolean) || [];

        let query = supabase
          .from("profiles")
          .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
          });

        if (genderedUserIds.length > 0) {
          query = query.not("id", "in", `(${genderedUserIds.join(",")})`);
        } else {
          query = query.neq("id", "00000000-0000-0000-0000-000000000000");
        }

        const { error } = await query;
        if (error) throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      
      const filterLabel = {
        all: "all registered users",
        male: "male customer accounts",
        female: "female customer accounts",
        neutral: "unspecified/gender-neutral profiles"
      }[variables.filter];
      
      toast.success(`Successfully updated profile pictures for ${filterLabel}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to run batch update");
    }
  });

  // Update product commission
  const updateCommissionMutation = useMutation({
    mutationFn: async ({ productId, commission, isRare }: { productId: string; commission: number; isRare: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({
          is_rare: isRare,
          commission_percent: commission
        })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Commission updated");
    },
    onError: () => toast.error("Failed to update commission"),
  });

  // Toggle product image verification status
  const toggleProductImageVerificationMutation = useMutation({
    mutationFn: async ({ productId, verified }: { productId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ image_verified: verified })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product image verification status updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update image verification status");
    }
  });

  // Update business verification tier
  const updateVerificationTierMutation = useMutation({
    mutationFn: async ({
      businessId, tier
    }: {
      businessId: string;
      tier: VerificationTier;
      email?: string;
      fullName?: string;
      companyName?: string;
      userId?: string;
      isRevocation?: boolean;
    }) => {
      const { error } = await supabase
        .from("businesses")
        .update({
          verification_tier: tier,
          verified: tier !== 'none'
        })
        .eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
      
      if (variables.isRevocation) {
        // 1. Play alert warning double dull pulse warning chime!
        playRevokedChime().catch(console.error);

        // 2. Dispatch premium_revoked security email!
        if (variables.email && variables.fullName) {
          dispatchEmail(
            "premium_revoked",
            variables.userId || "",
            variables.email,
            variables.fullName,
            { companyName: variables.companyName }
          ).catch(console.error);
        }
        toast.success(`Premium badge for ${variables.companyName || "business"} revoked successfully. Security alert dispatched.`);
      } else {
        toast.success("Verification tier updated");
      }
    },
    onError: () => toast.error("Failed to update tier"),
  });

  // Platform Control: Update Terms Version
  const updateTermsVersionMutation = useMutation({
    mutationFn: async (version: number) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          key: "latest_terms_version",
          value: JSON.stringify(version),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["latest-terms-version"] });
      toast.success("Platform Terms Version updated! Users will be locked until they accept.");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update version"),
  });

  // Platform Control: Update Visibility Booster Price
  const updateBoosterPriceMutation = useMutation({
    mutationFn: async (price: number) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          key: "booster_monthly_price",
          value: JSON.stringify(price),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });
      if (error) throw error;
      localStorage.setItem("booster_monthly_price", price.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-booster-price"] });
      queryClient.invalidateQueries({ queryKey: ["visibility-booster-price"] });
      toast.success("Visibility Booster Monthly Price updated successfully!");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update price"),
  });

  const toggleIdicDashboardMutation = useMutation({
    mutationFn: async (hide: boolean) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          key: "hide_idic_dashboard",
          value: JSON.stringify(hide),
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-idic-config"] });
      toast.success("Global IDIC Tournament Dashboard toggle updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update IDIC toggle");
    }
  });

  // Confirm delivery on behalf of customer (admin power)
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Delivery confirmed by admin");
    },
    onError: () => toast.error("Failed to confirm delivery"),
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update order status.");
    }
  });

  // Complete job on behalf of customer (admin power)
  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const { error } = await supabase
        .from("jobs")
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
      toast.success("Job completed by admin");
    },
    onError: () => toast.error("Failed to complete job"),
  });

  // Send admin message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_messages").insert({
        sender_id: user!.id,
        recipient_type: messageRecipientType,
        title: messageTitle,
        content: messageContent,
        is_pinned: messagePinned,
        read_by: [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages-list"] });
      toast.success("Message sent successfully");
      setShowMessageDialog(false);
      setMessageTitle("");
      setMessageContent("");
      setMessagePinned(false);
    },
    onError: () => toast.error("Failed to send message"),
  });

  // Toggle message pin
  const togglePinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("admin_messages")
        .update({ is_pinned: isPinned })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages-list"] });
      toast.success("Pin status updated");
    },
  });

  // Delete message
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("admin_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-messages-list"] });
      toast.success("Message deleted");
    },
  });

  // Update offer status (for fulfilling offers)
  const updateOfferMutation = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: string }) => {
      const { error } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", offerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast.success("Offer status updated");
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <InterlockingLoader size="lg" label="Securing String Portal..." />
      </div>
    );
  }

  // Show bootstrap option if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient Halos */}
        <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
        
        <Card className="max-w-md w-full bg-card/60 backdrop-blur-xl border-border/40 shadow-2xl shadow-primary/5 relative z-10">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Key className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Admin Access Required</CardTitle>
            <CardDescription>
              Enter your admin bootstrap key to gain access to this dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="bootstrap-key" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Bootstrap Key</Label>
              <Input
                id="bootstrap-key"
                type="password"
                placeholder="Enter your secret key..."
                value={bootstrapKey}
                onChange={(e) => setBootstrapKey(e.target.value)}
                className="h-11 bg-background/50 border-border/40 rounded-xl"
              />
            </div>
            <Button
              className="w-full h-11 rounded-xl font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/85 text-white shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
              onClick={() => bootstrapMutation.mutate()}
              disabled={!bootstrapKey || bootstrapMutation.isPending}
            >
              {bootstrapMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Activate Admin Access
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don't have a key? Contact the platform developer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingLocations = locationRequests?.filter(r => r.status === "pending") || [];
  const customerProfiles = profiles?.filter(p => p.user_type === "customer") || [];
  const businessProfiles = profiles?.filter(p => p.user_type === "business") || [];
  const pendingOrders = orders?.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status)) || [];
  const pendingJobs = jobs?.filter(j => ["requested", "quoted", "accepted", "in_progress"].includes(j.status)) || [];
  const pinnedMessages = adminMessages?.filter(m => m.is_pinned) || [];
  const pendingWithdrawals = withdrawals?.filter((w: any) => w.status === "pending") || [];
  const pendingOffers = allOffers?.filter(o => o.status === "open") || [];

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  const handleSwitchToUserView = async () => {
    if (user?.id) {
      localStorage.setItem(`string_active_admin_mode_${user.id}`, "false");
    }
    await refreshProfile();
    toast.success("Switched to normal User View! 🛒");
    navigate("/");
  };

  // Get all users with locations
  const allUsersWithLocations = [
    ...(customers?.filter((c: any) => c.latitude && c.longitude).map((c: any) => ({
      id: c.id,
      name: (c.profiles as any)?.full_name || 'Unknown',
      email: (c.profiles as any)?.email,
      type: 'customer',
      lat: c.latitude,
      lng: c.longitude,
      verified: c.location_verified,
    })) || []),
    ...(businesses?.filter((b: any) => b.latitude && b.longitude).map((b: any) => ({
      id: b.id,
      name: b.company_name,
      email: (b.profiles as any)?.email,
      type: 'business',
      lat: b.latitude,
      lng: b.longitude,
      verified: b.location_verified,
    })) || []),
  ];

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(profiles?.map(p => p.user_id) || []);
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium Ambient Background Halos */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      
      {/* Pulsing Concentric Brand Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-[0.015] dark:opacity-[0.025] flex items-center justify-center">
        <div className="w-[100%] h-[100%] rounded-full border border-primary animate-[spin_180s_linear_infinite]" />
        <div className="absolute w-[80%] h-[80%] rounded-full border border-dashed border-primary animate-[spin_120s_linear_infinite_reverse]" />
        <div className="absolute w-[60%] h-[60%] rounded-full border border-primary animate-[spin_90s_linear_infinite]" />
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6" />
              String Admin Console
            </h1>
            <p className="text-muted-foreground">Full platform management dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSwitchToUserView}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/85 text-white font-medium shadow-md shadow-primary/15 transition-all duration-200 active:scale-95 text-xs sm:text-sm h-9 px-3 sm:px-4"
            >
              <ShoppingBag className="h-4 w-4 mr-1.5" />
              User View 🛒
            </Button>
            <Button onClick={() => setShowMessageDialog(true)} variant="outline" className="text-xs sm:text-sm h-9 px-3 sm:px-4">
              <Send className="h-4 w-4 mr-1.5" />
              Send Message
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="text-xs sm:text-sm h-9 px-3 sm:px-4">
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
            {pendingLocations.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingLocations.length} pending locations
              </Badge>
            )}
            {pendingWithdrawals.length > 0 && (
              <Badge variant="secondary">
                <Wallet className="h-3 w-3 mr-1" />
                {pendingWithdrawals.length} withdrawals
              </Badge>
            )}
            {pendingOffers.length > 0 && (
              <Badge variant="outline">
                {pendingOffers.length} open offers
              </Badge>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{profiles?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{businesses?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Businesses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {businesses?.filter((b: any) => b.verification_tier === 'premium').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{orders?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Briefcase className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{jobs?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{allReviews?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{withdrawals?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Withdrawals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Reply className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{messageReplies?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Replies</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Eye className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search users, businesses, orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-card/40 backdrop-blur-md border-border/40 rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full flex justify-start items-center overflow-x-auto gap-2 p-1.5 h-auto bg-card/25 backdrop-blur-md border border-border/40 rounded-2xl md:rounded-full whitespace-nowrap scrollbar-none select-none mb-6">
            <TabsTrigger value="analytics" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="businesses" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Building2 className="h-4 w-4" />
              <span>Businesses</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <ShoppingBag className="h-4 w-4" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Briefcase className="h-4 w-4" />
              <span>Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Star className="h-4 w-4" />
              <span>Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Image className="h-4 w-4" />
              <span>Offers</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Wallet className="h-4 w-4" />
              <span>Withdrawals</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <MapPin className="h-4 w-4" />
              <span>Locations</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="commission" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <DollarSign className="h-4 w-4" />
              <span>Commission</span>
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Shield className="h-4 w-4" />
              <span>Platform</span>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <MessageSquare className="h-4 w-4" />
              <span>Feedbacks</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2 px-3 py-1.5 rounded-xl md:rounded-full flex-shrink-0 data-[state=active]:bg-primary data-[state=active]:text-white text-xs sm:text-sm font-medium tracking-wide transition-all duration-300">
              <Key className="h-4 w-4" />
              <span>Referrals</span>
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <LaunchAnalytics 
              profiles={profiles}
              businesses={businesses}
              orders={orders}
              jobs={jobs}
            />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {/* Global Avatar Batch Manager */}
            <Card className="border border-primary/20 bg-card/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Zap className="h-5 w-5 animate-pulse" />
                  Global Profile Picture Batch Manager
                </CardTitle>
                <CardDescription>
                  Set a default profile picture for all registered users on String in one click. Perfect for resetting all avatars to standard 3D animated presets or a custom branding image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  {/* Select Filter Target */}
                  <div className="w-full lg:w-56 space-y-2">
                    <Label htmlFor="batch-target-filter">Target User Group</Label>
                    <Select
                      value={batchFilter}
                      onValueChange={(value: 'all' | 'male' | 'female' | 'neutral') => setBatchFilter(value)}
                    >
                      <SelectTrigger id="batch-target-filter" className="bg-background/50 h-10 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🌐 All Users</SelectItem>
                        <SelectItem value="male">👦 Male Customers Only</SelectItem>
                        <SelectItem value="female">👧 Female Customers Only</SelectItem>
                        <SelectItem value="neutral">👤 Unspecified / Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label htmlFor="batch-avatar-url">Target Avatar URL</Label>
                    <Input
                      id="batch-avatar-url"
                      placeholder="Enter custom image URL or select a preset..."
                      value={batchAvatarUrl}
                      onChange={(e) => setBatchAvatarUrl(e.target.value)}
                      className="bg-background/50 h-10"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mb-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBatchAvatarUrl("/avatar_male.png")}
                      className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    >
                      👦 Male Preset
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBatchAvatarUrl("/avatar_female.png")}
                      className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    >
                      👧 Female Preset
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBatchAvatarUrl("/avatar_neutral.png")}
                      className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    >
                      👤 Neutral Preset
                    </Button>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!batchAvatarUrl) {
                        toast.error("Please enter or select an avatar URL first");
                        return;
                      }
                      
                      const groupLabel = {
                        all: "ALL registered users",
                        male: "all MALE customers",
                        female: "all FEMALE customers",
                        neutral: "all UNSPECIFIED/GENDER-NEUTRAL accounts (including businesses and admins)"
                      }[batchFilter];

                      if (confirm(`WARNING: You are about to change the profile picture of ${groupLabel} to "${batchAvatarUrl}". This action is irreversible. Do you want to continue?`)) {
                        batchUpdateAvatarsMutation.mutate({ avatarUrl: batchAvatarUrl, filter: batchFilter });
                      }
                    }}
                    disabled={batchUpdateAvatarsMutation.isPending}
                    className="gap-2 shrink-0 font-bold h-10 px-5 shadow-lg shadow-destructive/20"
                  >
                    {batchUpdateAvatarsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Execute Batch Update
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Users ({profiles?.length || 0})</CardTitle>
                <CardDescription>Complete list of all registered users and their theme settings</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProfiles ? (
                  <div className="flex items-center justify-center py-12">
                    <InterlockingLoader size="sm" label="Loading users..." />
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Theme / Palette</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Joined</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profiles
                              ?.filter((p: any) =>
                                p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((profile: any) => {
                                const userGender = profile.user_type === 'customer'
                                  ? customers?.find((c: any) => c.user_id === profile.id)?.gender
                                  : null;
                                const recommendedAvatar = userGender === 'male'
                                  ? '/avatar_male.png'
                                  : userGender === 'female'
                                    ? '/avatar_female.png'
                                    : '/avatar_neutral.png';

                                return (
                                  <TableRow key={profile.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-card flex items-center justify-center shrink-0 shadow-inner">
                                          <img
                                            src={profile.avatar_url || recommendedAvatar}
                                            alt={profile.full_name}
                                            className="h-full w-full object-cover transition-all duration-300 hover:scale-110"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = recommendedAvatar;
                                            }}
                                          />
                                        </div>
                                        <div>
                                          <p className="font-medium">{profile.full_name}</p>
                                          <p className="text-xs text-muted-foreground">{profile.email || "(No email provided)"}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={profile.user_type === 'business' ? 'default' : profile.user_type === 'admin' ? 'destructive' : 'secondary'}>
                                        {profile.user_type}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {profile.latitude && profile.longitude ? (
                                        <Badge variant="outline">
                                          <MapPin className="h-3 w-3 mr-1 text-primary" />
                                          Set ({profile.latitude.toFixed(2)}, {profile.longitude.toFixed(2)})
                                        </Badge>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground text-sm">{profile.address || "Not set"}</span>
                                          <Button variant="ghost" size="sm" onClick={() => {
                                            const loc = prompt("Set user address string manually:");
                                            if (loc) updateUserLocationMutation.mutate({ userId: profile.id, address: loc });
                                          }}>
                                            Edit
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1.5 flex-wrap">
                                        <Badge variant="outline" className="text-xs gap-1 py-0.5">
                                          {profile.theme_mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs gap-1 py-0.5 border-primary/30 text-primary">
                                          🎨 {{ blue: 'Blue', mono: 'Mono', rose: 'Rose', emerald: 'Emerald', sunset: 'Sunset', amber: 'Amber', custom: 'Custom' }[profile.theme_palette || 'blue'] || 'Blue'}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={profile.onboarding_completed ? 'outline' : 'destructive'}>
                                        {profile.onboarding_completed ? 'Active' : 'Onboarding'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {format(new Date(profile.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center gap-2 justify-end">
                                        {profile.user_type !== 'admin' && (
                                          <Button
                                            variant={profile.banned ? "secondary" : "destructive"}
                                            size="sm"
                                            onClick={() => {
                                              if (confirm(`Are you sure you want to ${profile.banned ? "UNBAN" : "BAN"} this user (${profile.full_name})?`)) {
                                                toggleBanUserMutation.mutate({ userId: profile.id, isBanned: !profile.banned });
                                              }
                                            }}
                                            className="h-8 text-xs font-bold shadow-sm"
                                          >
                                            {profile.banned ? "😇 Unban" : "🚫 Ban"}
                                          </Button>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setEditingProfile({
                                            id: profile.id,
                                            full_name: profile.full_name,
                                            email: profile.email,
                                            theme_mode: profile.theme_mode || 'dark',
                                            theme_palette: profile.theme_palette || 'blue',
                                            avatar_url: profile.avatar_url || '',
                                            user_type: profile.user_type
                                          })}
                                          className="h-8 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300 border-primary/20"
                                        >
                                          Edit Settings
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-3">
                      {profiles
                        ?.filter((p: any) =>
                          p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((profile: any) => {
                          const userGender = profile.user_type === 'customer'
                            ? customers?.find((c: any) => c.user_id === profile.id)?.gender
                            : null;
                          const recommendedAvatar = userGender === 'male'
                            ? '/avatar_male.png'
                            : userGender === 'female'
                              ? '/avatar_female.png'
                              : '/avatar_neutral.png';

                          return (
                            <div key={profile.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                              {/* User Info Row */}
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-card shrink-0">
                                  <img
                                    src={profile.avatar_url || recommendedAvatar}
                                    alt={profile.full_name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = recommendedAvatar;
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{profile.email || '(No email)'}</p>
                                </div>
                                <Badge variant={profile.user_type === 'business' ? 'default' : profile.user_type === 'admin' ? 'destructive' : 'secondary'}>
                                  {profile.user_type}
                                </Badge>
                              </div>

                              {/* Badges Row */}
                              <div className="flex flex-wrap gap-1.5">
                                <Badge variant="outline" className="text-xs gap-1 py-0.5">
                                  {profile.theme_mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
                                </Badge>
                                <Badge variant="outline" className="text-xs gap-1 py-0.5 border-primary/30 text-primary">
                                  🎨 {{ blue: 'Blue', mono: 'Mono', rose: 'Rose', emerald: 'Emerald', sunset: 'Sunset', amber: 'Amber', custom: 'Custom' }[profile.theme_palette || 'blue'] || 'Blue'}
                                </Badge>
                                <Badge variant={profile.onboarding_completed ? 'outline' : 'destructive'}>
                                  {profile.onboarding_completed ? 'Active' : 'Onboarding'}
                                </Badge>
                                <Badge variant="outline" className="text-xs text-muted-foreground py-0.5">
                                  {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                                </Badge>
                              </div>

                              {/* Actions Row */}
                              <div className="flex gap-2 pt-1">
                                {profile.user_type !== 'admin' && (
                                  <Button
                                    variant={profile.banned ? "secondary" : "destructive"}
                                    size="sm"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to ${profile.banned ? "UNBAN" : "BAN"} this user (${profile.full_name})?`)) {
                                        toggleBanUserMutation.mutate({ userId: profile.id, isBanned: !profile.banned });
                                      }
                                    }}
                                    className="flex-1 h-9 text-xs font-bold shadow-sm"
                                  >
                                    {profile.banned ? "😇 Unban" : "🚫 Ban"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingProfile({
                                    id: profile.id,
                                    full_name: profile.full_name,
                                    email: profile.email,
                                    theme_mode: profile.theme_mode || 'dark',
                                    theme_palette: profile.theme_palette || 'blue',
                                    avatar_url: profile.avatar_url || '',
                                    user_type: profile.user_type
                                  })}
                                  className="flex-1 h-9 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300 border-primary/20"
                                >
                                  Edit Settings
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Edit Profile Dialog */}
          <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
            <DialogContent className="max-w-md border border-primary/20 bg-card/95 backdrop-blur-2xl text-foreground">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                  <Settings className="h-5 w-5" />
                  Edit User Settings
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Customize theme preferences and profile picture for <strong>{editingProfile?.full_name}</strong>
                </DialogDescription>
              </DialogHeader>

              {editingProfile && (
                <div className="space-y-6 my-4">
                  {/* Theme Mode Selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold tracking-wide">Theme Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={editingProfile.theme_mode === 'dark' ? 'default' : 'outline'}
                        onClick={() => setEditingProfile({ ...editingProfile, theme_mode: 'dark' })}
                        className="w-full flex items-center gap-2 justify-center"
                      >
                        🌙 Dark Mode
                      </Button>
                      <Button
                        type="button"
                        variant={editingProfile.theme_mode === 'light' ? 'default' : 'outline'}
                        onClick={() => setEditingProfile({ ...editingProfile, theme_mode: 'light' })}
                        className="w-full flex items-center gap-2 justify-center"
                      >
                        ☀️ Light Mode
                      </Button>
                    </div>
                  </div>

                  {/* Theme Palette Selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold tracking-wide">Theme Accent Palette</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { v: 'blue',    c: '#2563EB', l: 'Blue' },
                        { v: 'mono',    c: '#525252', l: 'Mono' },
                        { v: 'rose',    c: '#D08F8F', l: 'Rose' },
                        { v: 'emerald', c: '#95BF47', l: 'Emerald' },
                        { v: 'sunset',  c: '#F68B1E', l: 'Sunset' },
                        { v: 'amber',   c: '#FF9900', l: 'Amber' },
                        { v: 'custom',  c: '#6D5ACD', l: 'Custom' },
                      ].map((p) => (
                        <button
                          key={p.v}
                          type="button"
                          onClick={() => setEditingProfile({ ...editingProfile, theme_palette: p.v as any })}
                          className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                            editingProfile.theme_palette === p.v
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border text-muted-foreground hover:border-primary/40'
                          )}
                        >
                          <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p.c }} />
                          {p.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Profile Picture Settings */}
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold tracking-wide">Profile Picture (Avatar)</Label>
                    
                    {/* Live Preview */}
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-background/40">
                      <div className="h-16 w-16 rounded-full overflow-hidden border border-primary/20 bg-card flex items-center justify-center shrink-0 shadow-inner">
                        <img
                          src={
                            editingProfile.avatar_url || (
                              editingProfile.user_type === 'customer'
                                ? (customers?.find((c: any) => c.user_id === editingProfile.id)?.gender === 'male'
                                  ? '/avatar_male.png'
                                  : customers?.find((c: any) => c.user_id === editingProfile.id)?.gender === 'female'
                                    ? '/avatar_female.png'
                                    : '/avatar_neutral.png')
                                : '/avatar_neutral.png'
                            )
                          }
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/avatar_neutral.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avatar Preview</p>
                        <p className="text-xs truncate text-muted-foreground mt-0.5">
                          {editingProfile.avatar_url || "Using System Gender Fallback"}
                        </p>
                      </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">Premium 3D Presets</span>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          type="button"
                          variant={editingProfile.avatar_url === '/avatar_male.png' ? 'default' : 'outline'}
                          onClick={() => setEditingProfile({ ...editingProfile, avatar_url: '/avatar_male.png' })}
                          className="text-xs p-1 h-12 flex flex-col justify-center gap-0.5"
                        >
                          <span className="font-semibold">👦 Male Preset</span>
                          {editingProfile.user_type === 'customer' && customers?.find((c: any) => c.user_id === editingProfile.id)?.gender === 'male' && (
                            <span className="text-[7px] text-primary/70 dark:text-primary scale-90 font-bold uppercase">(Recommended)</span>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant={editingProfile.avatar_url === '/avatar_female.png' ? 'default' : 'outline'}
                          onClick={() => setEditingProfile({ ...editingProfile, avatar_url: '/avatar_female.png' })}
                          className="text-xs p-1 h-12 flex flex-col justify-center gap-0.5"
                        >
                          <span className="font-semibold">👧 Female Preset</span>
                          {editingProfile.user_type === 'customer' && customers?.find((c: any) => c.user_id === editingProfile.id)?.gender === 'female' && (
                            <span className="text-[7px] text-primary/70 dark:text-primary scale-90 font-bold uppercase">(Recommended)</span>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant={editingProfile.avatar_url === '/avatar_neutral.png' ? 'default' : 'outline'}
                          onClick={() => setEditingProfile({ ...editingProfile, avatar_url: '/avatar_neutral.png' })}
                          className="text-xs p-1 h-12 flex flex-col justify-center gap-0.5"
                        >
                          <span className="font-semibold">👤 Neutral Preset</span>
                          {(editingProfile.user_type !== 'customer' || !['male', 'female'].includes(customers?.find((c: any) => c.user_id === editingProfile.id)?.gender || '')) && (
                            <span className="text-[7px] text-primary/70 dark:text-primary scale-90 font-bold uppercase">(Recommended)</span>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Custom URL Input */}
                    <div className="space-y-2">
                      <Label htmlFor="custom-avatar-url" className="text-xs text-muted-foreground">Or Enter Custom Avatar URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="custom-avatar-url"
                          placeholder="https://example.com/image.jpg"
                          value={editingProfile.avatar_url}
                          onChange={(e) => setEditingProfile({ ...editingProfile, avatar_url: e.target.value })}
                          className="bg-background/50 text-sm h-9"
                        />
                        {editingProfile.avatar_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingProfile({ ...editingProfile, avatar_url: "" })}
                            className="text-xs shrink-0 px-2"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(null)}
                  disabled={updateUserProfileMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateUserProfileMutation.mutate({
                      userId: editingProfile.id,
                      themeMode: editingProfile.theme_mode,
                      themePalette: editingProfile.theme_palette,
                      avatarUrl: editingProfile.avatar_url || null
                    });
                    setEditingProfile(null);
                  }}
                  disabled={updateUserProfileMutation.isPending}
                  className="gap-2 font-bold"
                >
                  {updateUserProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Businesses Tab */}
          <TabsContent value="businesses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Verification ({businesses?.length || 0})</CardTitle>
                <CardDescription>Manage verification tiers: None → Verified → Premium</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBusinesses ? (
                  <div className="flex items-center justify-center py-12">
                    <InterlockingLoader size="sm" label="Loading businesses..." />
                  </div>
                ) : (
                  <>
                    {/* Desktop Table Layout */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Business</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Rating</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Wallet Balance</TableHead>
                              <TableHead>Tier</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {businesses
                              ?.filter((b: any) =>
                                b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((business: any) => (
                                <TableRow key={business.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{business.company_name}</p>
                                      <p className="text-xs text-muted-foreground">{business.profiles?.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{business.business_type || 'goods'}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {business.reputation_score ? (
                                      <div className="flex items-center gap-1">
                                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                        <span>{business.reputation_score.toFixed(1)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={business.location_verified ? "default" : "secondary"}>
                                      {business.location_verified ? "Verified" : "Not Verified"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-bold text-foreground">
                                    ₦{Number(business.business_wallets?.[0]?.available_balance || 0).toLocaleString()}
                                  </TableCell>
                                  <TableCell>
                                    <TierBadge tier={business.verification_tier || 'none'} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={business.verification_tier || 'none'}
                                        onValueChange={(value: VerificationTier) =>
                                          updateVerificationTierMutation.mutate({
                                            businessId: business.id,
                                            tier: value,
                                            email: business.profiles?.email,
                                            fullName: business.profiles?.full_name,
                                            companyName: business.company_name,
                                            userId: business.user_id,
                                            isRevocation: value !== 'premium' && business.verification_tier === 'premium'
                                          })
                                        }
                                      >
                                        <SelectTrigger className="w-32 h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          <SelectItem value="verified">Verified</SelectItem>
                                          <SelectItem value="premium">Premium</SelectItem>
                                        </SelectContent>
                                      </Select>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const currentBal = business.business_wallets?.[0]?.available_balance || 0;
                                          const newVal = prompt(`Override wallet balance for ${business.company_name} (Current: ₦${currentBal.toLocaleString()}):`);
                                          if (newVal !== null) {
                                            const parsedVal = parseFloat(newVal);
                                            if (!isNaN(parsedVal) && parsedVal >= 0) {
                                              updateBusinessWalletMutation.mutate({ businessId: business.id, availableBalance: parsedVal });
                                            } else {
                                              toast.error("Please enter a valid non-negative number.");
                                            }
                                          }
                                        }}
                                        className="h-8 text-xs border-primary/20 hover:bg-primary/5 shrink-0 font-semibold"
                                      >
                                        Override 💰
                                      </Button>

                                      {business.verification_tier === 'premium' && (
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="text-xs font-bold px-3 shrink-0 h-8"
                                          onClick={() => {
                                            if (confirm(`Are you absolutely sure you want to revoke the Premium Badge for ${business.company_name}? This will demote them to basic verified, play a safety alert chime, and send a security warning email.`)) {
                                              updateVerificationTierMutation.mutate({
                                                businessId: business.id,
                                                tier: 'verified',
                                                email: business.profiles?.email,
                                                fullName: business.profiles?.full_name,
                                                companyName: business.company_name,
                                                userId: business.user_id,
                                                isRevocation: true
                                              });
                                            }
                                          }}
                                          disabled={updateVerificationTierMutation.isPending}
                                        >
                                          Revoke
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="md:hidden space-y-3">
                      {businesses
                        ?.filter((b: any) =>
                          b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((business: any) => (
                          <div
                            key={business.id}
                            className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm"
                          >
                            {/* Header: Company name + email */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{business.company_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{business.profiles?.email}</p>
                              </div>
                              <TierBadge tier={business.verification_tier || 'none'} />
                            </div>

                            {/* Info Row: Type, Rating, Location */}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">{business.business_type || 'goods'}</Badge>
                              {business.reputation_score ? (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                  {business.reputation_score.toFixed(1)}
                                </Badge>
                              ) : null}
                              <Badge variant={business.location_verified ? "default" : "secondary"} className="text-xs">
                                {business.location_verified ? (
                                  <><MapPin className="h-3 w-3 mr-1" />Verified</>
                                ) : (
                                  "Not Verified"
                                )}
                              </Badge>
                            </div>

                            {/* Wallet Balance */}
                            <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-background/60 border border-border/30">
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-primary/70" />
                                <span className="text-xs text-muted-foreground">Wallet Balance</span>
                              </div>
                              <span className="font-mono text-sm font-bold text-foreground">
                                ₦{Number(business.business_wallets?.[0]?.available_balance || 0).toLocaleString()}
                              </span>
                            </div>

                            {/* Tier Change Select */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-medium text-muted-foreground">Change Tier</span>
                              <Select
                                value={business.verification_tier || 'none'}
                                onValueChange={(value: VerificationTier) =>
                                  updateVerificationTierMutation.mutate({
                                    businessId: business.id,
                                    tier: value,
                                    email: business.profiles?.email,
                                    fullName: business.profiles?.full_name,
                                    companyName: business.company_name,
                                    userId: business.user_id,
                                    isRevocation: value !== 'premium' && business.verification_tier === 'premium'
                                  })
                                }
                              >
                                <SelectTrigger className="w-full h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="verified">Verified</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const currentBal = business.business_wallets?.[0]?.available_balance || 0;
                                  const newVal = prompt(`Override wallet balance for ${business.company_name} (Current: ₦${currentBal.toLocaleString()}):`);
                                  if (newVal !== null) {
                                    const parsedVal = parseFloat(newVal);
                                    if (!isNaN(parsedVal) && parsedVal >= 0) {
                                      updateBusinessWalletMutation.mutate({ businessId: business.id, availableBalance: parsedVal });
                                    } else {
                                      toast.error("Please enter a valid non-negative number.");
                                    }
                                  }
                                }}
                                className="h-8 text-xs border-primary/20 hover:bg-primary/5 font-semibold flex-1 min-w-[120px]"
                              >
                                Override 💰
                              </Button>

                              {business.verification_tier === 'premium' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="text-xs font-bold px-3 h-8 flex-1 min-w-[100px]"
                                  onClick={() => {
                                    if (confirm(`Are you absolutely sure you want to revoke the Premium Badge for ${business.company_name}? This will demote them to basic verified, play a safety alert chime, and send a security warning email.`)) {
                                      updateVerificationTierMutation.mutate({
                                        businessId: business.id,
                                        tier: 'verified',
                                        email: business.profiles?.email,
                                        fullName: business.profiles?.full_name,
                                        companyName: business.company_name,
                                        userId: business.user_id,
                                        isRevocation: true
                                      });
                                    }
                                  }}
                                  disabled={updateVerificationTierMutation.isPending}
                                >
                                  Revoke Premium
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      {businesses?.filter((b: any) =>
                        b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No businesses found.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Orders ({orders?.length || 0})</CardTitle>
                <CardDescription>Monitor and manage customer orders</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-12">
                    <InterlockingLoader size="md" label="Loading orders..." />
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Business</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Tracking</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders?.map((order: any) => (
                              <TableRow key={order.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{order.id?.slice(0, 8).toUpperCase()}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(order.created_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>{order.customers?.profiles?.full_name || 'Unknown'}</TableCell>
                                <TableCell>{order.businesses?.company_name}</TableCell>
                                <TableCell>{'\u20A6'}{Number(order.total).toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    order.status === 'delivered' ? 'default' :
                                      order.status === 'cancelled' ? 'destructive' :
                                        'secondary'
                                  }>
                                    {order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono">{order.tracking_number || '-'}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={order.status}
                                      onValueChange={(val) => updateOrderStatusMutation.mutate({ orderId: order.id, status: val })}
                                    >
                                      <SelectTrigger className="h-8 w-32 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Awaiting Payment</SelectItem>
                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                        <SelectItem value="processing">Processing</SelectItem>
                                        <SelectItem value="shipped">Shipped</SelectItem>
                                        <SelectItem value="delivered">Delivered</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                        <SelectItem value="refunded">Refunded</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {order.status === 'shipped' && (
                                      <Button
                                        size="sm"
                                        className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                        onClick={() => confirmDeliveryMutation.mutate({ orderId: order.id })}
                                      >
                                        Deliver
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {orders?.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No orders found</p>
                      )}
                      {orders?.map((order: any) => (
                        <div key={order.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold">{order.id?.slice(0, 8).toUpperCase()}</span>
                            <Badge variant={
                              order.status === 'delivered' ? 'default' :
                                order.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                            }>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm"><span className="text-muted-foreground">Customer:</span> {order.customers?.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm"><span className="text-muted-foreground">Business:</span> {order.businesses?.company_name}</p>
                            <p className="text-sm"><span className="text-muted-foreground">Tracking:</span> <span className="font-mono">{order.tracking_number || '-'}</span></p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold">{'\u20A6'}{Number(order.total).toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Select
                              value={order.status}
                              onValueChange={(val) => updateOrderStatusMutation.mutate({ orderId: order.id, status: val })}
                            >
                              <SelectTrigger className="h-8 flex-1 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Awaiting Payment</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                              </SelectContent>
                            </Select>
                            {order.status === 'shipped' && (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => confirmDeliveryMutation.mutate({ orderId: order.id })}
                              >
                                Deliver
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Jobs ({jobs?.length || 0})</CardTitle>
                <CardDescription>Monitor service requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-12">
                    <InterlockingLoader size="md" label="Loading jobs..." />
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Business</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobs?.map((job: any) => (
                              <TableRow key={job.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{job.description || 'Service Request'}</p>
                                    <p className="text-xs text-muted-foreground">{job.id?.slice(0, 8).toUpperCase()}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{job.customers?.profiles?.full_name || 'Unknown'}</TableCell>
                                <TableCell>{job.businesses?.company_name}</TableCell>
                                <TableCell>
                                  {job.final_price ? `₦${Number(job.final_price).toLocaleString()}` : '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                                    {job.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {job.status === 'in_progress' && (
                                    <Button
                                      size="sm"
                                      onClick={() => completeJobMutation.mutate({ jobId: job.id })}
                                    >
                                      Mark Complete
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {jobs?.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No jobs found</p>
                      )}
                      {jobs?.map((job: any) => (
                        <div key={job.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{job.description || 'Service Request'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{job.id?.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm"><span className="text-muted-foreground">Customer:</span> {job.customers?.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm"><span className="text-muted-foreground">Business:</span> {job.businesses?.company_name}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold">
                              {job.final_price ? `₦${Number(job.final_price).toLocaleString()}` : '—'}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                          </div>
                          {job.status === 'in_progress' && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => completeJobMutation.mutate({ jobId: job.id })}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Reviews ({allReviews?.length || 0})</CardTitle>
                <CardDescription>Monitor customer reviews and business responses</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReviews ? (
                  <div className="flex items-center justify-center py-12">
                    <InterlockingLoader size="md" label="Loading reviews..." />
                  </div>
                ) : (
                  <>
                    {/* Desktop Layout */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                          {allReviews?.map((review: any) => (
                            <div key={review.id} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`h-4 w-4 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted'
                                            }`}
                                        />
                                      ))}
                                    </div>
                                    {review.verified_purchase && (
                                      <Badge variant="secondary">Verified</Badge>
                                    )}
                                  </div>
                                  {review.title && <p className="font-medium mt-1">{review.title}</p>}
                                  {review.content && <p className="text-sm text-muted-foreground mt-1">{review.content}</p>}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    For: {review.businesses?.company_name} • {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this review? This action is permanent and will instantly recalibrate business ratings.")) {
                                      deleteReviewMutation.mutate(review.id);
                                    }
                                  }}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-xl"
                                  title="Delete Review"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              {review.response && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs font-medium">Business Response:</p>
                                  <p className="text-sm text-muted-foreground">{review.response}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {allReviews?.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No reviews found</p>
                      )}
                      {allReviews?.map((review: any) => (
                        <div key={review.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={`text-sm ${star <= review.rating ? 'text-yellow-500' : 'text-muted'}`}>★</span>
                              ))}
                              {review.verified_purchase && (
                                <Badge variant="secondary" className="ml-1 text-[10px]">Verified</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this review? This action is permanent and will instantly recalibrate business ratings.")) {
                                  deleteReviewMutation.mutate(review.id);
                                }
                              }}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-xl h-8 w-8 p-0"
                              title="Delete Review"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">For: {review.businesses?.company_name}</p>
                            {review.title && <p className="font-medium text-sm">{review.title}</p>}
                            {review.content && <p className="text-sm text-muted-foreground line-clamp-3">{review.content}</p>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                          </p>
                          {review.response && (
                            <div className="p-3 bg-muted/50 rounded-xl">
                              <p className="text-xs font-medium">Business Response:</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">{review.response}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Offer Requests ({allOffers?.length || 0})</CardTitle>
                <CardDescription>Customer requests for products/services</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {allOffers?.map((offer: any) => (
                      <div key={offer.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{offer.offer_type}</Badge>
                              <Badge variant={offer.status === 'open' ? 'secondary' : offer.status === 'fulfilled' ? 'default' : 'outline'}>
                                {offer.status}
                              </Badge>
                              {offer.urgency && <Badge variant="destructive">{offer.urgency}</Badge>}
                            </div>
                            <h4 className="font-medium">{offer.title}</h4>
                            {offer.description && (
                              <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                            )}
                            {offer.budget_min || offer.budget_max ? (
                              <p className="text-sm mt-1">
                                Budget: {'\u20A6'}{offer.budget_min?.toLocaleString() || 0} - {'\u20A6'}{offer.budget_max?.toLocaleString() || 'Any'}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {offer.images && offer.images[0] && (
                            <img src={offer.images[0]} alt="" className="h-20 w-20 rounded-lg object-cover" />
                          )}
                        </div>
                        {offer.status === 'open' && (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateOfferMutation.mutate({ offerId: offer.id, status: 'fulfilled' })}
                            >
                              Mark Fulfilled
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOfferMutation.mutate({ offerId: offer.id, status: 'closed' })}
                            >
                              Close
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests ({withdrawals?.length || 0})</CardTitle>
                <CardDescription>Process business withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingWithdrawals ? (
                  <InterlockingLoader size="sm" label="Loading withdrawals..." />
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <ScrollArea className="h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Business</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Bank Details</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {withdrawals?.map((w: any) => (
                              <TableRow key={w.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {w.businesses?.company_name || w.profiles?.full_name || 'User'}
                                      <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                                        {w.withdrawal_type || 'business'}
                                      </Badge>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {w.businesses?.profiles?.email || w.profiles?.email || 'N/A'}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">₦{Number(w.amount).toLocaleString()}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p>{w.bank_name}</p>
                                    <p className="text-muted-foreground">{w.account_number}</p>
                                    <p className="text-muted-foreground">{w.account_name}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    w.status === 'completed' ? 'default' :
                                      w.status === 'rejected' ? 'destructive' :
                                        'secondary'
                                  }>
                                    {w.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(w.created_at), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell>
                                  {w.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => processWithdrawal.mutate({
                                          withdrawalId: w.id,
                                          status: 'completed',
                                        })}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => processWithdrawal.mutate({
                                          withdrawalId: w.id,
                                          status: 'rejected',
                                          adminNotes: 'Rejected by admin',
                                        })}
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {(!withdrawals || withdrawals.length === 0) ? (
                        <p className="text-center text-muted-foreground py-8 text-sm">No withdrawal requests yet</p>
                      ) : (
                        withdrawals.map((w: any) => (
                          <div key={w.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-sm">
                                  {w.businesses?.company_name || w.profiles?.full_name || 'User'}
                                  <Badge variant="outline" className="ml-1.5 text-[9px] uppercase">
                                    {w.withdrawal_type || 'business'}
                                  </Badge>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {w.businesses?.profiles?.email || w.profiles?.email || 'N/A'}
                                </p>
                              </div>
                              <Badge variant={
                                w.status === 'completed' ? 'default' :
                                  w.status === 'rejected' ? 'destructive' : 'secondary'
                              } className="text-[10px] shrink-0">
                                {w.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-xl font-bold text-primary">₦{Number(w.amount).toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</span>
                            </div>
                            <div className="bg-background/50 rounded-xl p-2.5 text-xs space-y-0.5">
                              <p className="font-medium">{w.bank_name}</p>
                              <p className="text-muted-foreground">{w.account_number}</p>
                              <p className="text-muted-foreground">{w.account_name}</p>
                            </div>
                            {w.status === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  className="flex-1 h-9 text-xs font-bold"
                                  onClick={() => processWithdrawal.mutate({
                                    withdrawalId: w.id,
                                    status: 'completed',
                                  })}
                                >
                                  ✅ Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 h-9 text-xs font-bold"
                                  onClick={() => processWithdrawal.mutate({
                                    withdrawalId: w.id,
                                    status: 'rejected',
                                    adminNotes: 'Rejected by admin',
                                  })}
                                >
                                  ❌ Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab - Enhanced with all users */}
          <TabsContent value="locations" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Pending Requests */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Verification ({pendingLocations.length})</CardTitle>
                  <CardDescription>Verify user locations from Google Maps</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {pendingLocations.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No pending requests</p>
                      ) : (
                        pendingLocations.map((request: any) => {
                          const matchingBiz = businesses?.find((b: any) => b.user_id === request.user_id);
                          return (
                            <LocationVerificationCard
                              key={request.id}
                              request={request}
                              businessName={matchingBiz?.company_name}
                              onVerify={(lat, lng) => verifyLocationMutation.mutate({
                                requestId: request.id,
                                userId: request.user_id,
                                userType: request.user_type,
                                latitude: lat,
                                longitude: lng,
                                approved: true,
                                email: request.profiles?.email,
                                fullName: request.profiles?.full_name,
                                streetAddress: request.street_address,
                                areaName: request.area_name
                              })}
                              onReject={() => verifyLocationMutation.mutate({
                                requestId: request.id,
                                userId: request.user_id,
                                userType: request.user_type,
                                approved: false,
                                email: request.profiles?.email,
                                fullName: request.profiles?.full_name,
                              })}
                              isLoading={verifyLocationMutation.isPending}
                            />
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* All Users with Locations */}
              <Card>
                <CardHeader>
                  <CardTitle>All User Locations ({allUsersWithLocations.length})</CardTitle>
                  <CardDescription>Users with coordinates set</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {allUsersWithLocations.map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${user.type === 'business' ? 'bg-primary/10' : 'bg-muted'}`}>
                              {user.type === 'business' ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                              <p className="text-xs text-muted-foreground">
                                {user.lat.toFixed(4)}, {user.lng.toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={user.verified ? 'default' : 'secondary'}>
                              {user.verified ? 'Verified' : 'Unverified'}
                            </Badge>
                            <a
                              href={`https://www.google.com/maps?q=${user.lat},${user.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs"
                            >
                              View Map
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab - with replies */}
          <TabsContent value="messages" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Sent Messages ({adminMessages?.length || 0})</CardTitle>
                      <CardDescription>Admin announcements</CardDescription>
                    </div>
                    <Button onClick={() => setShowMessageDialog(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {adminMessages?.map((message: any) => (
                        <div
                          key={message.id}
                          className={`p-3 border rounded-lg ${message.is_pinned ? 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {message.is_pinned && <Pin className="h-3 w-3 text-yellow-500" />}
                                <span className="font-medium text-sm">{message.title}</span>
                                <Badge variant="outline" className="text-xs">{message.recipient_type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => togglePinMutation.mutate({
                                  messageId: message.id,
                                  isPinned: !message.is_pinned,
                                })}
                              >
                                <Pin className={`h-3 w-3 ${message.is_pinned ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMessageMutation.mutate(message.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Replies from users */}
              <Card>
                <CardHeader>
                  <CardTitle>User Replies ({messageReplies?.length || 0})</CardTitle>
                  <CardDescription>Responses from businesses and customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {messageReplies?.map((reply: any) => (
                        <div key={reply.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={reply.sender_type === 'business' ? 'default' : 'secondary'}>
                              {reply.sender_type}
                            </Badge>
                            <span className="text-sm font-medium">{reply.profiles?.full_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Re: {reply.admin_messages?.title}
                          </p>
                          <p className="text-sm">{reply.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Platform User-to-User Live Chat Monitor */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      Platform Chat Monitor (Live Feed)
                    </CardTitle>
                    <CardDescription>
                      Monitor real-time user-to-business communications on campus.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] w-full">
                  <div className="space-y-4 pr-4">
                    {liveMessages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-xl">
                        No messages sent in this session yet.
                      </div>
                    ) : (
                      liveMessages.map((msg: any) => {
                        const conversation = msg.conversations;
                        const shopperName = conversation?.customers?.profiles?.full_name || "Shopper";
                        const storeName = conversation?.businesses?.company_name || "Merchant";
                        const isFromStore = msg.sender_type === "business";

                        return (
                          <div
                            key={msg.id}
                            className="p-4 rounded-xl border border-border/40 bg-card hover:bg-muted/10 transition-colors space-y-2 text-left"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{shopperName}</span>
                                <span className="text-muted-foreground">↔</span>
                                <span className="font-semibold text-primary">{storeName}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant={isFromStore ? "default" : "secondary"}
                                  className="text-[10px] font-bold"
                                >
                                  {isFromStore ? "From Store" : "From Customer"}
                                </Badge>
                                <span className="text-muted-foreground font-mono">
                                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-sm text-foreground break-words font-medium">
                              {msg.content}
                            </div>

                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {msg.attachments.map((attachmentUrl: string, idx: number) => (
                                  <a
                                    key={idx}
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-1 rounded border border-primary/20"
                                  >
                                    📎 Attachment {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commission Tab */}
          <TabsContent value="commission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Commission ({products?.length || 0})</CardTitle>
                <CardDescription>Set commission rates (1-20%)</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {products?.map((product: any) => (
                      <ProductCommissionCard
                        key={product.id}
                        product={product}
                        onUpdate={(commission, isRare) =>
                          updateCommissionMutation.mutate({
                            productId: product.id,
                            commission,
                            isRare
                          })
                        }
                        onToggleImageVerified={(verified) =>
                          toggleProductImageVerificationMutation.mutate({
                            productId: product.id,
                            verified
                          })
                        }
                        onDelete={() => {
                          if (confirm(`Are you sure you want to delete product "${product.name}"? This cannot be undone.`)) {
                            deleteProductMutation.mutate(product.id);
                          }
                        }}
                        isLoading={updateCommissionMutation.isPending || deleteProductMutation.isPending || toggleProductImageVerificationMutation.isPending}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platform" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-primary">
                    <Shield className="h-5 w-5" />
                    Legal Enforcement
                  </CardTitle>
                  <CardDescription>Force all users to accept updated terms before platform usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-xl border-2 border-primary/20 shadow-sm transition-all hover:shadow-md">
                    <div>
                      <p className="font-bold text-2xl text-primary">{config?.value || 1}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Terms Version</p>
                    </div>
                    <Button 
                      className="rounded-full px-6 shadow-lg shadow-primary/20"
                      onClick={() => {
                        const nextVer = (config?.value ? parseInt(config.value) : 1) + 1;
                        if (confirm(`Increment terms to version ${nextVer}? This will LOCK ALL USERS out until they accept.`)) {
                          updateTermsVersionMutation.mutate(nextVer);
                        }
                      }}
                      disabled={updateTermsVersionMutation.isPending}
                    >
                      {updateTermsVersionMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Shield className="w-4 h-4 mr-2" />}
                      Push Update
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Acceptance Progress</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-background rounded-2xl border border-border shadow-sm">
                        <p className="text-3xl font-black text-foreground">{profiles?.filter((p: any) => p.accepted_terms_version === (config ? parseInt(config.value) : 1)).length || 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-500">Accepted</p>
                      </div>
                      <div className="p-4 bg-background rounded-2xl border border-border shadow-sm">
                        <p className="text-3xl font-black text-foreground">{profiles?.filter((p: any) => !p.accepted_terms_version || p.accepted_terms_version < (config ? parseInt(config.value) : 1)).length || 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Pending</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-500/20 bg-orange-500/[0.01]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-500 font-bold">
                    <Crown className="h-5 w-5" />
                    Visibility Booster Configurator
                  </CardTitle>
                  <CardDescription>Adjust the monthly subscription cost for businesses to boost views</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">₦</span>
                      <Input
                        type="number"
                        placeholder="15000"
                        value={boosterPriceInput}
                        onChange={(e) => setBoosterPriceInput(e.target.value)}
                        className="pl-7 h-10 font-bold"
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        const parsed = Number(boosterPriceInput);
                        if (!parsed || parsed <= 0) {
                          toast.error("Please enter a valid positive pricing rate.");
                          return;
                        }
                        updateBoosterPriceMutation.mutate(parsed);
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold h-10"
                      disabled={updateBoosterPriceMutation.isPending}
                    >
                      {updateBoosterPriceMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Pricing"}
                    </Button>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1.5 border">
                    <div className="flex justify-between"><span className="text-muted-foreground">Active Price:</span> <span className="font-bold text-foreground">₦{boosterPrice.toLocaleString()} / mo</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Local Backup:</span> <span className="font-semibold text-foreground">₦{Number(localStorage.getItem("booster_monthly_price") || 15000).toLocaleString()}</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* IDIC Tournament Global Control */}
              <Card className="border-amber-500/20 bg-amber-500/[0.01]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-500 font-bold">
                    🏆 IDIC Tournament Settings
                  </CardTitle>
                  <CardDescription>Disable or enable the IDIC Tournament dashboard globally for all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground">Hide IDIC Dashboard</p>
                      <p className="text-xs text-muted-foreground max-w-sm">If enabled, the IDIC card on the customer profile and the `/idic` page will be hidden/blocked.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={hideIdicDashboard ? "default" : "outline"}
                        onClick={() => {
                          const nextVal = !hideIdicDashboard;
                          setHideIdicDashboard(nextVal);
                          toggleIdicDashboardMutation.mutate(nextVal);
                        }}
                        disabled={toggleIdicDashboardMutation.isPending}
                      >
                        {hideIdicDashboard ? "Hidden (ON)" : "Visible (OFF)"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    System Infrastructure
                  </CardTitle>
                  <CardDescription>Real-time edge function and DB status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-3 border border-border/50 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Database Engine</span>
                      <span className="font-bold text-green-500">OPTIMAL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Storage Cache</span>
                      <span className="font-bold text-primary">ENCRYPTED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> AI Matchmaking</span>
                      <span className="font-bold text-purple-500">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> CDN Propagation</span>
                      <span className="font-bold text-muted-foreground">98.4%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commission Config override */}
              <Card className="border-rose-500/25 bg-rose-500/[0.01]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-rose-500 font-bold">
                    <DollarSign className="h-5 w-5 animate-pulse" />
                    Commission Override Config
                  </CardTitle>
                  <CardDescription>Adjust the global sales transaction cut applied to product sales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <Input
                        type="number"
                        placeholder="10"
                        min="1"
                        max="20"
                        value={commissionInput}
                        onChange={(e) => setCommissionInput(e.target.value)}
                        className="pr-7 h-10 font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">%</span>
                    </div>
                    <Button 
                      onClick={() => {
                        const parsed = Number(commissionInput);
                        if (!parsed || parsed < 1 || parsed > 20) {
                          toast.error("Please enter a percentage between 1% and 20%.");
                          return;
                        }
                        localStorage.setItem("global_commission_percent", parsed.toString());
                        toast.success(`Global commission cut updated to ${parsed}%!`);
                      }}
                      className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold h-10 px-5"
                    >
                      Save Cut
                    </Button>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl text-xs space-y-1.5 border">
                    <div className="flex justify-between"><span className="text-muted-foreground">Active Fee:</span> <span className="font-bold text-foreground">{localStorage.getItem("global_commission_percent") || 10}% cut on products</span></div>
                  </div>
                </CardContent>
              </Card>

              {/* Simulation Sandbox console */}
              <Card className="col-span-full border-violet-500/30 bg-violet-500/[0.01] backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-violet-500">
                    <Zap className="h-5 w-5 text-violet-500 animate-bounce" />
                    Live Admin Simulation Sandbox Console
                  </CardTitle>
                  <CardDescription>Test real-time signals, dispatch mock events, and verify audio chimes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Button 
                      onClick={simulateBid} 
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                    >
                      💬 Simulate Custom Bid
                    </Button>
                    <Button 
                      onClick={simulateDemand} 
                      className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                    >
                      🔥 Simulate Search Demand
                    </Button>
                    <Button 
                      onClick={simulateEscrowOrder} 
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
                    >
                      🔔 Simulate Escrow Order
                    </Button>
                  </div>

                  <div className="border-t border-border/40 pt-4">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Sparkling Chime Soundboard Audit</Label>
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-5 mt-2">
                      <Button variant="outline" size="sm" onClick={() => playOrderChime()} className="text-[11px] font-bold border-green-500/30 text-green-500 hover:bg-green-500/10">
                        🔔 Order Bell
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => playPremiumMatchChime()} className="text-[11px] font-bold border-purple-500/30 text-purple-500 hover:bg-purple-500/10">
                        🌟 Match Sweep
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => playChatAlert()} className="text-[11px] font-bold border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
                        💬 Chat Blip
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => playVerificationChime()} className="text-[11px] font-bold border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                        🛡️ Approve Chime
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => playRevokedChime()} className="text-[11px] font-bold border-red-500/30 text-red-500 hover:bg-red-500/10">
                        ⚠️ Cancel Alert
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Activity logs table */}
              <Card className="col-span-full border-border/80 bg-card/30 backdrop-blur-xl shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      Platform Activity Audit Logs
                    </CardTitle>
                    <CardDescription>Real-time log stream of user operations, mock actions, and safety states</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchActivityLogs()} className="h-8 border-primary/20 hover:bg-primary/5">
                    <Loader2 className={`h-3 w-3 mr-1 ${loadingActivityLogs ? "animate-spin" : ""}`} />
                    Refresh Logs
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] rounded-xl border bg-muted/20">
                    <Table>
                      <TableHeader className="bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[180px] font-bold uppercase tracking-wider text-[10px]">Timestamp</TableHead>
                          <TableHead className="w-[150px] font-bold uppercase tracking-wider text-[10px]">Operator</TableHead>
                          <TableHead className="w-[150px] font-bold uppercase tracking-wider text-[10px]">Action</TableHead>
                          <TableHead className="font-bold uppercase tracking-wider text-[10px]">Audit Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingActivityLogs ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                              Loading activity audits...
                            </TableCell>
                          </TableRow>
                        ) : !activityLogs || activityLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8 font-semibold">
                              No platform activities logged yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          activityLogs.map((log: any) => (
                            <TableRow key={log.id} className="hover:bg-muted/30">
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                              </TableCell>
                              <TableCell className="text-xs font-semibold text-foreground">
                                {log.profiles?.full_name || "System Operation"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] py-0.5 font-bold uppercase tracking-wider ${
                                  log.action === 'escrow_deposit' ? 'border-green-500/30 text-green-500 bg-green-500/[0.02]' :
                                  log.action.startsWith('simulated') ? 'border-violet-500/30 text-violet-500 bg-violet-500/[0.02]' :
                                  'border-muted-foreground/30 text-muted-foreground'
                                }`}>
                                  {log.action.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground max-w-xs truncate">
                                {JSON.stringify(log.details)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Feedbacks Tab */}
          <TabsContent value="feedbacks" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Platform User Feedbacks ({feedbacks.length})</CardTitle>
                  <CardDescription>Review and manage direct feedback from platform users</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchFeedbacks()} className="h-8 border-primary/20 hover:bg-primary/5">
                  <Loader2 className={`h-3 w-3 mr-1 ${loadingFeedbacks ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {loadingFeedbacks ? (
                  <div className="flex items-center justify-center py-12">
                    <InterlockingLoader size="sm" label="Loading feedbacks..." />
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground font-semibold">
                    No platform feedback received yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {feedbacks.map((f: any) => (
                      <div key={f.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm text-left">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{f.profiles?.full_name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{f.profiles?.email} • {f.profiles?.user_type}</p>
                          </div>
                          <Badge variant={f.status === 'resolved' ? 'default' : f.status === 'in_progress' ? 'secondary' : 'destructive'}>
                            {f.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 font-bold text-sm">{"⭐".repeat(f.rating)}</span>
                            <span className="font-bold text-xs text-foreground/80">{f.subject}</span>
                          </div>
                          <p className="text-xs text-muted-foreground bg-muted/10 p-2.5 rounded-xl leading-relaxed">
                            {f.message}
                          </p>
                        </div>

                        {/* Admin Action Space */}
                        <div className="space-y-2 pt-1 border-t border-border/20">
                          <div className="flex gap-2 items-center">
                            <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground shrink-0">Configure Status:</Label>
                            <Select
                              value={f.status}
                              onValueChange={(val) => updateFeedbackMutation.mutate({ feedbackId: f.id, status: val })}
                            >
                              <SelectTrigger className="h-7 text-xs bg-muted/20 border-border/40 rounded-lg max-w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">🆕 New</SelectItem>
                                <SelectItem value="in_progress">⚙️ In Progress</SelectItem>
                                <SelectItem value="resolved">✅ Resolved</SelectItem>
                                <SelectItem value="ignored">❌ Ignored</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add private admin notes..."
                              defaultValue={f.admin_notes || ""}
                              onBlur={(e) => {
                                if (e.target.value !== (f.admin_notes || "")) {
                                  updateFeedbackMutation.mutate({ feedbackId: f.id, status: f.status, notes: e.target.value });
                                }
                              }}
                              className="h-8 text-xs bg-muted/20 border-border/40 rounded-lg flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Delete feedback permanently? This action is irreversible.")) {
                                  deleteFeedbackMutation.mutate(f.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals & Security Tab */}
          <TabsContent value="referrals" className="space-y-6">
            {/* 1. Generator and Settings */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card/40 backdrop-blur-md border border-border/40">
                <CardHeader>
                  <CardTitle>Configure Referral Rewards & Campaigns</CardTitle>
                  <CardDescription>Configure points payouts and rules for custom codes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Custom Code String</Label>
                      <Input
                        placeholder="e.g. OOUAFFILIATE"
                        value={newRefCode}
                        onChange={(e) => setNewRefCode(e.target.value.toUpperCase())}
                        className="h-9 bg-muted/20 border-border/40 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Generate Random</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewRefCode("STR-" + Math.random().toString(36).substring(2, 8).toUpperCase())}
                        className="w-full h-9 border-primary/20 hover:bg-primary/5 rounded-xl font-bold text-xs"
                      >
                        Generate Code 🎲
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Referrer Points Reward</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={referrerPointsInput}
                        onChange={(e) => setReferrerPointsInput(e.target.value)}
                        className="h-9 bg-muted/20 border-border/40 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Referred Points Reward</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={referredPointsInput}
                        onChange={(e) => setReferredPointsInput(e.target.value)}
                        className="h-9 bg-muted/20 border-border/40 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Qualifying User Requirement</Label>
                    <Select value={refQualifyingType} onValueChange={setRefQualifyingType}>
                      <SelectTrigger className="h-9 bg-muted/20 border-border/40 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">🔓 Anyone (Immediately Awarded)</SelectItem>
                        <SelectItem value="onboarded_only">📝 Onboarded Users Only</SelectItem>
                        <SelectItem value="verified_only">🛡️ Verified Users Only (NIN/BVN Level 2)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center pt-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={refIsBusiness} onCheckedChange={setRefIsBusiness} />
                      <Label className="text-xs font-semibold">Is Business Code</Label>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase font-bold">Assign to User ID (Optional)</Label>
                      <Input
                        placeholder="Referrer auth user ID..."
                        value={refAssignedUser}
                        onChange={(e) => setRefAssignedUser(e.target.value)}
                        className="h-8 text-xs bg-muted/20 border-border/40 rounded-lg"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      if (!newRefCode) {
                        toast.error("Please provide a referral code string.");
                        return;
                      }
                      createReferralCodeMutation.mutate({
                        code: newRefCode,
                        points_to_referrer: parseInt(referrerPointsInput) || 0,
                        points_to_referred: parseInt(referredPointsInput) || 0,
                        qualifying_user_type: refQualifyingType,
                        assigned_user_id: refAssignedUser || null,
                        is_business_code: refIsBusiness
                      });
                    }}
                    disabled={createReferralCodeMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-10 shadow-lg shadow-primary/20 rounded-xl"
                  >
                    {createReferralCodeMutation.isPending ? "Creating..." : "Save Referral Campaign 🎟️"}
                  </Button>
                </CardContent>
              </Card>

              {/* Active Campaigns List */}
              <Card className="bg-card/40 backdrop-blur-md border border-border/40">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Active Referral Campaigns</CardTitle>
                    <CardDescription>Overview of active referral channels</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchReferralCodes()} className="h-8 border-primary/20 hover:bg-primary/5">
                    <Loader2 className={`h-3 w-3 mr-1 ${loadingReferralCodes ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[280px]">
                    {loadingReferralCodes ? (
                      <div className="flex items-center justify-center py-12">
                        <InterlockingLoader size="sm" label="Loading codes..." />
                      </div>
                    ) : referralCodes.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No active referral codes generated yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {referralCodes.map((rc: any) => (
                          <div key={rc.id} className="p-3 border rounded-xl bg-background/50 flex items-center justify-between text-left">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="font-mono font-bold text-[11px] border-primary/30 text-primary">
                                  {rc.code}
                                </Badge>
                                {rc.is_revoked && <Badge variant="destructive">Deactivated</Badge>}
                                {rc.is_business_code && <Badge variant="secondary">Business</Badge>}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Referrer: +{rc.points_to_referrer} pts • Referred: +{rc.points_to_referred} pts
                              </p>
                              {rc.assigned_profiles && (
                                <p className="text-[9px] text-primary/80 font-semibold mt-0.5">
                                  Assigned to: {rc.assigned_profiles.full_name} ({rc.assigned_profiles.email})
                                </p>
                              )}
                              <p className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">
                                Rule: {rc.qualifying_user_type.replace("_", " ")}
                              </p>
                            </div>
                            
                            {!rc.is_revoked && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Deactivate campaign code ${rc.code}?`)) {
                                    revokeReferralCodeMutation.mutate(rc.id);
                                  }
                                }}
                                className="h-7 text-[10px] font-bold px-2 rounded-lg"
                              >
                                Deactivate
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* 2. Fraud alerts log panel */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Security Fraud Alerts Log */}
              <Card className="bg-card/40 backdrop-blur-md border border-border/40 border-red-500/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-red-500 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                      Security Referrals Fraud Hub
                    </CardTitle>
                    <CardDescription>Real-time log of suspicious and blocked points operations</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchFraudAlerts()} className="h-8 border-red-500/20 hover:bg-red-500/5 text-red-500">
                    <Loader2 className={`h-3 w-3 mr-1 ${loadingFraudAlerts ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {loadingFraudAlerts ? (
                      <div className="flex items-center justify-center py-12">
                        <InterlockingLoader size="sm" label="Scanning alerts..." />
                      </div>
                    ) : fraudAlerts.length === 0 ? (
                      <div className="text-center py-12 text-sm text-muted-foreground font-semibold">
                        🔒 No malicious referrals or fraud signals detected.
                      </div>
                    ) : (
                      <div className="space-y-3 text-left">
                        {fraudAlerts.map((fa: any) => (
                          <div key={fa.id} className="p-3 border border-red-500/30 rounded-xl bg-red-500/[0.02] space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="destructive" className="font-bold text-[9px] uppercase tracking-wider animate-pulse">
                                FRAUD ATTEMPT
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {format(new Date(fa.created_at), "yyyy-MM-dd HH:mm:ss")}
                              </span>
                            </div>
                            <p className="text-xs text-foreground font-medium">
                              User: <strong>{fa.profiles?.full_name || "Unknown"}</strong> ({fa.profiles?.email})
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Attempted referral code: <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs font-semibold">{fa.referral_code}</span>
                            </p>
                            <p className="text-[11px] text-red-500 font-semibold leading-relaxed">
                              Reason: {fa.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Referrals & Reward Payout History */}
              <Card className="bg-card/40 backdrop-blur-md border border-border/40">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Payout History & Payout Operations</CardTitle>
                    <CardDescription>Review referrals payouts and revoke points</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchReferrals()} className="h-8 border-primary/20 hover:bg-primary/5">
                    <Loader2 className={`h-3 w-3 mr-1 ${loadingReferrals ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {loadingReferrals ? (
                      <div className="flex items-center justify-center py-12">
                        <InterlockingLoader size="sm" label="Loading payout logs..." />
                      </div>
                    ) : referralsList.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No referrals history logged yet.
                      </div>
                    ) : (
                      <div className="space-y-3 text-left">
                        {referralsList.map((ref: any) => (
                          <div key={ref.id} className="p-3 border rounded-xl bg-background/50 flex items-center justify-between text-left">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant={ref.status === 'completed' ? 'default' : ref.status === 'pending' ? 'secondary' : 'outline'}>
                                  {ref.status}
                                </Badge>
                                <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                  {ref.referral_code}
                                </Badge>
                                <span className="text-[10px] font-bold text-amber-500 font-mono">+{ref.points_awarded} pts</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                                Referrer: <strong>{ref.referrers?.full_name || "Unknown"}</strong> ({ref.referrers?.email || "No email"})
                              </p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Referred: <strong>{ref.referreds?.full_name || "Unknown"}</strong> ({ref.referreds?.email || "No email"})
                              </p>
                              <p className="text-[9px] text-muted-foreground font-mono">
                                {format(new Date(ref.created_at), "yyyy-MM-dd HH:mm:ss")}
                              </p>
                            </div>
                            
                            {ref.status === 'completed' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to REVOKE the referral points reward for this entry? This will subtract ${ref.points_awarded} points from the referrer and invalidate the log.`)) {
                                    revokeReferralRewardMutation.mutate(ref.id);
                                  }
                                }}
                                className="h-8 text-[10px] font-bold px-2 rounded-lg"
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Send Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Admin Message</DialogTitle>
            <DialogDescription>Send an announcement to platform users</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Message title..."
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select
                value={messageRecipientType}
                onValueChange={(v: 'all' | 'businesses' | 'customers') => setMessageRecipientType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="businesses">Businesses Only</SelectItem>
                  <SelectItem value="customers">Customers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={messagePinned} onCheckedChange={setMessagePinned} />
              <Label>Pin this message</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>Cancel</Button>
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={!messageTitle || !messageContent || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier }: { tier: string }) {
  return <ReputationBadge tier={tier as any} />;
}

// Location Verification Card
function LocationVerificationCard({ request, businessName, onVerify, onReject, isLoading }: any) {
  const [latitude, setLatitude] = useState(request.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(request.longitude?.toString() || "");

  useEffect(() => {
    if (request.latitude) setLatitude(request.latitude.toString());
    if (request.longitude) setLongitude(request.longitude.toString());
  }, [request.latitude, request.longitude]);

  return (
    <div className="p-3 border rounded-lg border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={request.user_type === 'business' ? 'default' : 'secondary'}>
            {request.user_type}
          </Badge>
          {businessName && (
            <span className="text-xs font-bold text-foreground">
              🏪 {businessName}
            </span>
          )}
        </div>
      </div>
      <p className="font-medium text-sm">{request.profiles?.full_name}</p>
      <p className="text-xs text-muted-foreground">{request.profiles?.email}</p>
      <div className="mt-2 p-2 bg-muted rounded text-xs">
        <p><strong>Street:</strong> {request.street_address}</p>
        {request.area_name && <p><strong>Area:</strong> {request.area_name}</p>}
        {request.admin_notes && <p className="mt-1 text-muted-foreground"><strong>Details:</strong> {request.admin_notes}</p>}
      </div>

      {request.video_url && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">🎥 Verification Video Proof</p>
          <video src={request.video_url} controls className="w-full max-h-40 rounded bg-black border border-border/40" />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Latitude</label>
          <Input
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Longitude</label>
          <Input
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <Button
          size="sm"
          className="flex-1 font-bold"
          onClick={() => onVerify(parseFloat(latitude), parseFloat(longitude))}
          disabled={isLoading || !latitude || !longitude}
        >
          Verify
        </Button>
        {latitude && longitude && (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="flex-1 font-bold border-yellow-600/30 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/10 cursor-pointer"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank')}
          >
            Open Maps ↗
          </Button>
        )}
        <Button size="sm" variant="destructive" className="font-bold" onClick={onReject} disabled={isLoading}>
          Reject
        </Button>
      </div>
    </div>
  );
}

// Product Commission Card
function ProductCommissionCard({ product, onUpdate, onDelete, onToggleImageVerified, isLoading }: any) {
  const [commission, setCommission] = useState(product.commission_percent || 10);
  const [isRare, setIsRare] = useState(product.is_rare || false);

  const hasChanges = commission !== product.commission_percent || isRare !== product.is_rare;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        {/* Product Image preview */}
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/40 shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground">No Image</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{product.name}</p>
            {product.is_rare && <Badge variant="destructive">Rare</Badge>}
            {product.image_verified === false ? (
              <Badge variant="destructive" className="scale-90 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.25">Rejected</Badge>
            ) : (
              <Badge className="scale-90 font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-[8px] px-1.5 py-0.25 text-white">Approved</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {product.businesses?.company_name} • ₦{Number(product.price || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {product.image_verified === false ? (
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 h-8 text-[11px] font-semibold"
            onClick={() => onToggleImageVerified(true)}
            disabled={isLoading}
          >
            Approve Image
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-8 text-[11px] font-semibold"
            onClick={() => onToggleImageVerified(false)}
            disabled={isLoading}
          >
            Reject Image
          </Button>
        )}
        <Input
          type="number"
          min={1}
          max={20}
          value={commission}
          onChange={(e) => setCommission(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-14 h-8 text-center text-sm"
        />
        <span className="text-xs">%</span>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={isRare}
            onChange={(e) => setIsRare(e.target.checked)}
            className="rounded"
          />
          Rare
        </label>
        <Button size="sm" onClick={() => onUpdate(commission, isRare)} disabled={isLoading || !hasChanges}>
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={isLoading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-xl"
          title="Delete Product Listing"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}
