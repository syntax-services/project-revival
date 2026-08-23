import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  MessageSquare, Loader2, MapPin, DollarSign, Briefcase, 
  Clock, ShieldCheck, ShoppingBag, Wrench, Users, ArrowUpRight, 
  Search, Sparkles, Send, Tag, ChevronRight, CheckCircle2, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getMaskedAssetUrl } from "@/lib/assetMask";

type LeadType = "product" | "service" | "employment" | "collaboration";

const typeConfig: Record<LeadType, { label: string; icon: typeof ShoppingBag; color: string; bg: string }> = {
  product: { label: "Product Sourcing", icon: ShoppingBag, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/25" },
  service: { label: "Service Request", icon: Wrench, color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/25" },
  employment: { label: "Campus Job", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/25" },
  collaboration: { label: "Partnership", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/25" },
};

const urgencyColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border/30",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  urgent: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-black animate-pulse",
};

export default function BusinessLeads() {
  const { data: business } = useBusiness();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Tailor default tab to business type (default to "product" if goods store)
  const defaultTab = business?.business_type === "service" ? "service" : "all";
  const [activeFilter, setActiveFilter] = useState<string>(defaultTab);

  // Pitch Modal State
  const [pitchLead, setPitchLead] = useState<any | null>(null);
  const [pitchMessage, setPitchMessage] = useState("");
  const [pitchOfferPrice, setPitchOfferPrice] = useState("");
  const [pitching, setPitching] = useState(false);

  // Fetch all open leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["business-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select(`
          *,
          profiles:user_id (id, full_name, avatar_url, email, verification_level)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Offers query error:", error);
      }

      return data || [];
    },
  });

  const handleOpenPitchModal = (lead: any) => {
    setPitchLead(lead);
    setPitchMessage(`Hello ${lead.profiles?.full_name || "there"}! I saw your request for "${lead.title}". We have this in stock and ready for immediate delivery/pickup. Let's finalize!`);
    setPitchOfferPrice(lead.budget_max ? String(lead.budget_max) : lead.budget_min ? String(lead.budget_min) : "");
  };

  const handleSendPitch = async () => {
    if (!pitchLead || !business) {
      toast.error("Please complete your merchant profile to pitch to buyers.");
      return;
    }

    setPitching(true);
    try {
      // 1. Resolve customer ID
      let targetCustomerId = pitchLead.user_id;
      const { data: custRow } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", pitchLead.user_id)
        .maybeSingle();

      if (custRow?.id) {
        targetCustomerId = custRow.id;
      }

      // 2. Check or create conversation
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", business.id)
        .or(`customer_id.eq.${targetCustomerId},customer_id.eq.${pitchLead.user_id}`)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            business_id: business.id,
            customer_id: targetCustomerId || pitchLead.user_id,
            last_message: pitchMessage.trim(),
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (convErr || !newConv) {
          throw new Error("Could not initialize chat channel.");
        }
        conversationId = newConv.id;
      }

      // 3. Dispatch pitch message & optional custom bid
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: business.user_id,
        sender_type: "business",
        content: pitchMessage.trim(),
      });

      if (pitchOfferPrice) {
        const bidData = {
          product: pitchLead.title,
          price: Number(pitchOfferPrice),
          quantity: 1,
          notes: "Merchant Direct Proposal",
          status: "pending",
        };
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: business.user_id,
          sender_type: "business",
          content: `[BID_OFFER]:${JSON.stringify(bidData)}`,
        });
      }

      await supabase
        .from("conversations")
        .update({
          last_message: pitchMessage.trim(),
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      toast.success("Pitch & Offer Dispatched! Redirecting to chat...");
      setPitchLead(null);
      navigate("/business/messages");
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch pitch");
    } finally {
      setPitching(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead: any) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm.trim() ||
        lead.title?.toLowerCase().includes(q) ||
        lead.description?.toLowerCase().includes(q) ||
        lead.location?.toLowerCase().includes(q);

      if (activeFilter === "all") return matchesSearch;
      return matchesSearch && lead.offer_type === activeFilter;
    });
  }, [leads, searchTerm, activeFilter]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Leads & Requests
            </h1>
            <p className="text-xs text-muted-foreground">
              Pitch to clients and bid on incoming requests matching your trade
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search active leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-2xl google-input text-xs"
            />
          </div>
        </div>

        {/* Categories Tabs */}
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
          <TabsList className="flex w-full justify-start overflow-x-auto gap-2 p-1 border-b border-border/15 pb-2 mb-4 h-auto bg-transparent">
            <TabsTrigger value="all" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              All Leads ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="product" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              Products Only ({leads.filter((l: any) => l.offer_type === "product").length})
            </TabsTrigger>
            <TabsTrigger value="service" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              Services Only ({leads.filter((l: any) => l.offer_type === "service").length})
            </TabsTrigger>
            <TabsTrigger value="employment" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              Jobs ({leads.filter((l: any) => l.offer_type === "employment").length})
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              Partnerships ({leads.filter((l: any) => l.offer_type === "collaboration").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeFilter} className="mt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="dashboard-card animate-pulse h-36 rounded-2xl" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="bg-card/50 border border-border/20 rounded-3xl p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground opacity-40" />
                </div>
                <h3 className="font-bold text-sm text-foreground">No matching requests</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  There are no open customer requests matching this category at the moment.
                </p>
              </div>
            ) : (
              <div className="grid gap-3.5 md:grid-cols-1">
                {filteredLeads.map((lead: any) => {
                  const type = (lead.offer_type as LeadType) || "product";
                  const config = typeConfig[type] || typeConfig.product;
                  const TypeIcon = config.icon;

                  return (
                    <div 
                      key={lead.id} 
                      className="p-5 rounded-3xl bg-card border border-border/20 shadow-xs hover:border-border/40 hover:shadow-md transition-all duration-300 space-y-4"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[11px] font-bold border", config.bg, config.color)}>
                              <TypeIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                            {lead.urgency && (
                              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border", urgencyColors[lead.urgency] || urgencyColors.medium)}>
                                <Clock className="h-3 w-3 inline mr-1" />
                                {lead.urgency}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-foreground">
                            {lead.title}
                          </h3>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed break-words">
                        {lead.description || "No request description provided."}
                      </p>

                      {/* Badges Box */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-muted/20 border border-border/15 rounded-2xl p-3">
                        <div>
                          <span className="text-muted-foreground text-[10px] font-bold uppercase flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-primary" /> Budget
                          </span>
                          <span className="text-xs font-black text-foreground mt-0.5 block">
                            {lead.budget_min && lead.budget_max ? (
                              `₦${lead.budget_min.toLocaleString()} - ₦${lead.budget_max.toLocaleString()}`
                            ) : lead.budget_min ? (
                              `₦${lead.budget_min.toLocaleString()}+`
                            ) : lead.budget_max ? (
                              `Up to ₦${lead.budget_max.toLocaleString()}`
                            ) : (
                              "Negotiable"
                            )}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground text-[10px] font-bold uppercase flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-primary" /> Location
                          </span>
                          <span className="text-xs font-bold text-foreground truncate mt-0.5 block">
                            {lead.location || "On-Campus"}
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground text-[10px] font-bold uppercase flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-primary" /> Requester
                          </span>
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                            {lead.profiles?.avatar_url ? (
                              <img src={getMaskedAssetUrl(lead.profiles.avatar_url)} className="h-4 w-4 rounded-full object-cover border border-border/30" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="truncate">{lead.profiles?.full_name || "Campus Buyer"}</span>
                          </span>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          onClick={() => handleOpenPitchModal(lead)}
                          className="rounded-2xl h-9 px-5 bg-primary text-primary-foreground font-black text-xs gap-1.5 shadow-xs active:scale-95 transition-all"
                        >
                          <Send className="h-3.5 w-3.5" /> Pitch & Send Offer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* PITCH OFFER DIALOG */}
        <Dialog open={!!pitchLead} onOpenChange={(open) => !open && setPitchLead(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border/20 text-left">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Pitch to {pitchLead?.profiles?.full_name || "Buyer"}
              </DialogTitle>
            </DialogHeader>

            {pitchLead && (
              <div className="space-y-3.5 pt-2 text-xs">
                <div className="p-2.5 rounded-2xl bg-muted/40 border border-border/20 space-y-1">
                  <p className="font-bold text-foreground text-xs">{pitchLead.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Target Budget: <strong>₦{Number(pitchLead.budget_max || pitchLead.budget_min || 0).toLocaleString()}</strong>
                  </p>
                </div>

                <div className="space-y-1">
                  <Label>Your Pitch & Response</Label>
                  <Textarea
                    value={pitchMessage}
                    onChange={(e) => setPitchMessage(e.target.value)}
                    rows={3}
                    className="rounded-xl google-input text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Your Offer Price (₦)</Label>
                  <Input
                    type="number"
                    value={pitchOfferPrice}
                    onChange={(e) => setPitchOfferPrice(e.target.value)}
                    placeholder="e.g., 25000"
                    className="rounded-xl google-input text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPitchLead(null)}
                    className="flex-1 rounded-2xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSendPitch}
                    disabled={!pitchMessage.trim() || pitching}
                    className="flex-1 rounded-2xl text-xs font-black bg-primary text-primary-foreground"
                  >
                    {pitching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Proposal"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
