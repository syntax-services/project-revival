/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";

interface AdminReferralsTabProps {
  referralCodes: any[];
  fraudAlerts: any[];
  referralsList: any[];
  loadingReferralCodes: boolean;
  loadingFraudAlerts: boolean;
  loadingReferrals: boolean;
  refetchReferralCodes: () => void;
  refetchFraudAlerts: () => void;
  refetchReferrals: () => void;
}

export function AdminReferralsTab({
  referralCodes,
  fraudAlerts,
  referralsList,
  loadingReferralCodes,
  loadingFraudAlerts,
  loadingReferrals,
  refetchReferralCodes,
  refetchFraudAlerts,
  refetchReferrals,
}: AdminReferralsTabProps) {
  const { user } = useAuth();
  const [newRefCode, setNewRefCode] = useState("");
  const [referrerPointsInput, setReferrerPointsInput] = useState("100");
  const [referredPointsInput, setReferredPointsInput] = useState("50");
  const [refQualifyingType, setRefQualifyingType] = useState("any");
  const [refAssignedUser, setRefAssignedUser] = useState("");
  const [refIsBusiness, setRefIsBusiness] = useState(false);

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
      toast.success("Referral campaign created successfully! ");
      refetchReferralCodes();
      setNewRefCode("");
      setRefAssignedUser("");
    },
    onError: (err: any) => {
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
      toast.success("Referral code deactivated successfully! ");
      refetchReferralCodes();
    },
    onError: (err: any) => {
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
        toast.success("Successfully revoked bonus points! ");
        refetchReferrals();
        refetchFraudAlerts();
      } else {
        toast.error(data?.message || "Could not revoke points.");
      }
    },
    onError: (err: any) => {
      toast.error("Failed to revoke points: " + err.message);
    }
  });

  return (
    <div className="space-y-6">
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
                  Generate Code 
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
                  <SelectItem value="any"> Anyone (Immediately Awarded)</SelectItem>
                  <SelectItem value="onboarded_only"> Onboarded Users Only</SelectItem>
                  <SelectItem value="verified_only"> Verified Users Only (NIN/BVN Level 2)</SelectItem>
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
              {createReferralCodeMutation.isPending ? "Creating..." : "Save Referral Campaign "}
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
                   No malicious referrals or fraud signals detected.
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
    </div>
  );
}
