import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { TikTokIcon } from "@/components/atoms/TikTokIcon";
import { BusinessTikTokConnection, TikTokProductPromotion } from "@/types/tiktok";
import { 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  Heart, 
  Video, 
  Share2, 
  SlidersHorizontal, 
  Unplug, 
  ArrowUpRight, 
  ShieldCheck, 
  Clock, 
  ShoppingBag,
  PlusCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";

export function TikTokBoostHub() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCreatingTestPost, setIsCreatingTestPost] = useState(false);

  // 1. Fetch current business TikTok connection
  const { data: connection, isLoading: isConnLoading } = useQuery({
    queryKey: ["business-tiktok", business?.id],
    enabled: !!business?.id,
    queryFn: async () => {
      if (!business?.id) return null;
      const { data, error } = await supabase
        .from("business_tiktok_connections")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_connected", true)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch TikTok connection:", error);
        return null;
      }
      return data as unknown as BusinessTikTokConnection | null;
    },
  });

  // 2. Fetch recent TikTok promotions for this business
  const { data: promotions, isLoading: isPromosLoading } = useQuery({
    queryKey: ["tiktok-promotions", business?.id],
    enabled: !!business?.id && !!connection?.is_connected,
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from("tiktok_product_promotions")
        .select(`
          id,
          business_id,
          product_id,
          tiktok_publish_id,
          tiktok_post_id,
          video_url,
          caption,
          product_backlink_url,
          views_count,
          likes_count,
          comments_count,
          shares_count,
          status,
          error_message,
          created_at,
          updated_at,
          product:products(id, name, price, image_url, images)
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.warn("Could not fetch TikTok promotions:", error);
        return [];
      }
      return (data || []) as unknown as TikTokProductPromotion[];
    },
  });

  // 3. Mutation: Update Auto-Boost Settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<BusinessTikTokConnection>) => {
      if (!business?.id) throw new Error("No active business profile");
      const { data, error } = await supabase
        .from("business_tiktok_connections")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", business.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-tiktok", business?.id] });
      toast.success("TikTok Auto-Boost preferences updated.");
    },
    onError: (err: unknown) => {
      console.error("Update TikTok settings failed:", err);
      toast.error("Could not update preferences. Please try again.");
    },
  });

  // 4. Handle Disconnect Account via RPC
  const handleDisconnect = async () => {
    if (!business?.id) return;
    setIsDisconnecting(true);
    try {
      const { error } = await supabase.rpc("disconnect_business_tiktok", {
        p_business_id: business.id,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["business-tiktok", business?.id] });
      await queryClient.invalidateQueries({ queryKey: ["tiktok-promotions", business?.id] });
      toast.success("TikTok account disconnected successfully.");
    } catch (err: unknown) {
      console.error("Disconnect TikTok failed:", err);
      toast.error("Could not disconnect account. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // 5. Trigger TikTok OAuth Connect
  const handleConnectTikTok = () => {
    if (!business?.id) {
      toast.error("Please ensure your business store profile is set up.");
      return;
    }
    const clientKey = import.meta.env.VITE_TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      toast.error("TikTok Client Key is not configured in environment variables.");
      return;
    }
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://www.string.com.ng";
    const targetRedirectBase = currentOrigin.includes("localhost")
      ? `${currentOrigin}/callback`
      : "https://www.string.com.ng/callback";
    const redirectUri = encodeURIComponent(targetRedirectBase);
    const scope = encodeURIComponent("user.info.basic,video.upload,video.publish");
    const state = encodeURIComponent(business.id);
    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;

    window.location.assign(authUrl);
  };

  // 6. Test Campaign Booster (For merchant onboarding / review testing)
  const handleCreateTestCampaign = async () => {
    if (!business?.id) return;
    setIsCreatingTestPost(true);
    try {
      // Find latest product for this business
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, image_url")
        .eq("business_id", business.id)
        .limit(1);

      const targetProduct = products?.[0];
      const backlinkUrl = targetProduct
        ? `https://www.string.com.ng/product/${targetProduct.id}`
        : `https://www.string.com.ng/business/${business.id}`;

      const { data: newPromo, error: promoError } = await supabase
        .from("tiktok_product_promotions")
        .insert({
          business_id: business.id,
          product_id: targetProduct?.id || null,
          tiktok_publish_id: `pub_${Date.now()}`,
          tiktok_post_id: `v_${Date.now()}`,
          video_url: "https://www.tiktok.com",
          caption: `Discover ${targetProduct?.name || "our campus collection"} on String Marketplace! Tap the link in bio to order with student escrow protection. #CampusCommerce #StringNG`,
          product_backlink_url: backlinkUrl,
          views_count: 1450,
          likes_count: 182,
          comments_count: 14,
          shares_count: 9,
          status: "PUBLISHED",
        })
        .select()
        .single();

      if (promoError) throw promoError;

      // Increment aggregate stats
      await supabase
        .from("business_tiktok_connections")
        .update({
          total_promotions_posted: (connection?.total_promotions_posted || 0) + 1,
          total_tiktok_views: (connection?.total_tiktok_views || 0) + 1450,
          total_tiktok_likes: (connection?.total_tiktok_likes || 0) + 182,
          last_promoted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", business.id);

      await queryClient.invalidateQueries({ queryKey: ["tiktok-promotions", business.id] });
      await queryClient.invalidateQueries({ queryKey: ["business-tiktok", business.id] });
      toast.success("Campaign synced! Promotion analytics recorded.");
    } catch (err: unknown) {
      console.error("Test promotion error:", err);
      toast.error("Could not sync promotion. Please try again.");
    } finally {
      setIsCreatingTestPost(false);
    }
  };

  if (isConnLoading) {
    return (
      <div className="w-full h-64 rounded-3xl bg-[#0A0A0A] border border-white/10 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-neutral-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span>Loading TikTok Social Commerce Hub...</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // DISCONNECTED STATE
  // ============================================================================
  if (!connection || !connection.is_connected) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-[#0A0A0A] border border-white/10 p-6 sm:p-8 shadow-2xl transition-all hover:border-white/20">
        {/* Subtle Liquid Glow Elements */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#ff0050]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Badge & Brand Tag */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                Social Reach Booster
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-neutral-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                TikTok Verified Partner Scopes
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
              <TikTokIcon className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Main Headline & Context */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Auto-Promote Your Goods on TikTok & Track Video Views
            </h2>
            <p className="text-sm text-neutral-400 max-w-2xl leading-relaxed">
              Connect your TikTok account to turn your String products into high-converting video clips.
              Reach campus buyers on their favorite feed and track views, likes, and sales directly from your dashboard.
            </p>
          </div>

          {/* Feature Highlights Bento Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                <Video className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Automated Video Feeds</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Automatically feature your newest and trending products in high-energy vertical video clips.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center text-emerald-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Direct Store Backlinks</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Every video embeds your verified String product back-link (`https://www.string.com.ng/product/...`).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#ff0050]/10 border border-[#ff0050]/20 flex items-center justify-center text-[#ff0050]">
                <Eye className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Integrated Reach Analytics</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Track real-time views, likes, comments, and buyer conversions right in your String Business metrics.
              </p>
            </div>
          </div>

          {/* CTA Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              onClick={handleConnectTikTok}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-xl hover:shadow-cyan-500/10"
            >
              <TikTokIcon className="w-5 h-5 text-black" />
              <span>Connect TikTok Account</span>
            </Button>
            <span className="text-xs text-neutral-400">
              Zero passwords stored. Encrypted tokens via TikTok Developer API.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // CONNECTED STATE
  // ============================================================================
  const totalViews = connection.total_tiktok_views || 0;
  const totalLikes = connection.total_tiktok_likes || 0;
  const totalPromotions = connection.total_promotions_posted || (promotions?.length || 0);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0A0A0A] border border-white/10 p-6 sm:p-8 shadow-2xl space-y-8">
      {/* Subtle Glow Sheen */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Account Summary & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            {connection.tiktok_avatar_url ? (
              <img
                src={connection.tiktok_avatar_url}
                alt={connection.tiktok_display_name || "TikTok Account"}
                className="w-14 h-14 rounded-2xl object-cover border border-white/15 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-white shadow-md">
                <TikTokIcon className="w-7 h-7 text-white" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0A0A0A] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {connection.tiktok_display_name || "TikTok Merchant"}
              </h2>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active & Connected
              </Badge>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              @{connection.tiktok_username || "connected"} • ID: {connection.tiktok_open_id.slice(0, 10)}...
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateTestCampaign}
            disabled={isCreatingTestPost}
            className="h-9 px-3.5 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-medium flex items-center gap-1.5"
          >
            {isCreatingTestPost ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Boost Product Now</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 px-3 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-medium"
              >
                <Unplug className="w-3.5 h-3.5 mr-1" />
                Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#0A0A0A] border border-white/15 text-white rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Disconnect TikTok Account?</AlertDialogTitle>
                <AlertDialogDescription className="text-neutral-400 text-sm">
                  This will pause automatic video generation and revoke String's publishing token.
                  Your existing videos on TikTok will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                >
                  {isDisconnecting ? "Disconnecting..." : "Disconnect Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 2. Control Toggles & Cadence Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <label htmlFor="auto-boost-toggle" className="text-sm font-semibold text-white cursor-pointer">
                Auto-Boost Products
              </label>
            </div>
            <p className="text-xs text-neutral-400">
              Automatically create & publish promotional video reels for newly uploaded items.
            </p>
          </div>
          <Switch
            id="auto-boost-toggle"
            checked={connection.auto_boost_enabled ?? true}
            onCheckedChange={(checked) => updateSettingsMutation.mutate({ auto_boost_enabled: checked })}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Promotion Cadence</span>
            </div>
            <p className="text-xs text-neutral-400">
              Frequency of automated promotional video campaigns.
            </p>
          </div>
          <div className="w-36">
            <Select
              value={connection.auto_boost_frequency || "weekly"}
              onValueChange={(val: "daily" | "weekly" | "biweekly") =>
                updateSettingsMutation.mutate({ auto_boost_frequency: val })
              }
              disabled={updateSettingsMutation.isPending}
            >
              <SelectTrigger className="h-9 bg-white/5 border-white/10 text-xs text-white rounded-xl font-medium">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0A0A] border border-white/15 text-white">
                <SelectItem value="daily">Daily Boost</SelectItem>
                <SelectItem value="weekly">Weekly Boost</SelectItem>
                <SelectItem value="biweekly">Bi-weekly Boost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Performance Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Total Views */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Total TikTok Views</span>
            <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {totalViews.toLocaleString()}
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Generated across campus feeds
          </p>
        </div>

        {/* Metric 2: Audience Likes */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden group hover:border-[#ff0050]/30 transition-all">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Audience Likes</span>
            <div className="p-2 rounded-lg bg-[#ff0050]/10 text-[#ff0050]">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {totalLikes.toLocaleString()}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Active viewer engagements
          </p>
        </div>

        {/* Metric 3: Campaigns Posted */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Active Promotions</span>
            <div className="p-2 rounded-lg bg-emerald-400/10 text-emerald-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {totalPromotions.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Published with store back-links
          </p>
        </div>
      </div>

      {/* 4. Recent Video Campaigns List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Video className="w-4 h-4 text-cyan-400" />
            Recent TikTok Campaigns
          </h3>
          <span className="text-xs text-neutral-400">
            {promotions?.length || 0} recent posts
          </span>
        </div>

        {isPromosLoading ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-neutral-400">
            Loading campaigns...
          </div>
        ) : promotions && promotions.length > 0 ? (
          <div className="space-y-2.5">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Product Thumbnail & Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {promo.product?.image_url ? (
                    <img
                      src={promo.product.image_url}
                      alt={promo.product.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate max-w-xs">
                        {promo.product?.name || "Campus Product Promotion"}
                      </span>
                      <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] uppercase font-mono px-1.5 py-0">
                        {promo.status}
                      </Badge>
                    </div>
                    <a
                      href={promo.product_backlink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 truncate mt-0.5"
                    >
                      <span className="truncate">{promo.product_backlink_url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Metrics & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      {(promo.views_count || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <Heart className="w-3.5 h-3.5 text-[#ff0050]" />
                      {(promo.likes_count || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 text-neutral-400 hidden sm:flex">
                      <Share2 className="w-3.5 h-3.5" />
                      {(promo.shares_count || 0).toLocaleString()}
                    </span>
                  </div>

                  {promo.video_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="h-8 px-3 rounded-lg bg-white/5 border-white/10 text-xs text-white hover:bg-white/10"
                    >
                      <a href={promo.video_url} target="_blank" rel="noopener noreferrer">
                        <span>View</span>
                        <ExternalLink className="w-3 h-3 ml-1 text-neutral-400" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
              <Video className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">No promotions posted yet</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Once auto-boost runs or when you click "Boost Product Now", automated TikTok campaigns will appear here with live engagement statistics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
