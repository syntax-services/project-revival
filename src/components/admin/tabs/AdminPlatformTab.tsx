/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Crown, Zap, DollarSign, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { playOrderChime, playPremiumMatchChime, playChatAlert, playVerificationChime, playRevokedChime } from "@/hooks/useAudioSignals";

interface AdminPlatformTabProps {
  config: any;
  profiles: any[];
  boosterPrice: number;
  hideIdicDashboard: boolean;
  setHideIdicDashboard: (val: boolean) => void;
  activityLogs: any[];
  loadingActivityLogs: boolean;
  refetchActivityLogs: () => void;
  refetchConfig: () => void;
}

export function AdminPlatformTab({
  config,
  profiles,
  boosterPrice,
  hideIdicDashboard,
  setHideIdicDashboard,
  activityLogs,
  loadingActivityLogs,
  refetchActivityLogs,
  refetchConfig,
}: AdminPlatformTabProps) {
  const queryClient = useQueryClient();
  const [boosterPriceInput, setBoosterPriceInput] = useState(boosterPrice.toString());
  const [commissionInput, setCommissionInput] = useState(localStorage.getItem("global_commission_percent") || "10");

  // Update terms version mutation
  const updateTermsVersionMutation = useMutation({
    mutationFn: async (version: number) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          key: "terms_version",
          value: version.toString(),
          description: "Global required terms of service version for legal enforcement"
        }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, version) => {
      toast.success(`Legal Terms bumped to Version ${version}! All users must re-accept. `);
      refetchConfig();
    },
    onError: (err: any) => {
      toast.error("Failed to update terms: " + err.message);
    }
  });

  // Booster pricing mutation
  const updateBoosterPriceMutation = useMutation({
    mutationFn: async (price: number) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          key: "booster_monthly_price",
          value: price.toString(),
          description: "Monthly subscription price for business visibility booster"
        }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, price) => {
      localStorage.setItem("booster_monthly_price", price.toString());
      toast.success(`Booster price updated to ₦${price.toLocaleString()}/mo! `);
      queryClient.invalidateQueries({ queryKey: ["admin-booster-price"] });
    },
    onError: (err: any) => {
      toast.error("Failed to update booster price: " + err.message);
    }
  });

  // Toggle IDIC Dashboard Mutation
  const toggleIdicDashboardMutation = useMutation({
    mutationFn: async (hide: boolean) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({
          key: "hide_idic_dashboard",
          value: hide.toString(),
          description: "Hide or show the IDIC tournament dashboard globally"
        }, { onConflict: "key" });
      if (error) throw error;
      return hide;
    },
    onSuccess: (hide) => {
      queryClient.invalidateQueries({ queryKey: ["admin-idic-config"] });
      queryClient.invalidateQueries({ queryKey: ["idic-global-config"] });
      toast.success(hide ? "IDIC Tournament Dashboard is now globally HIDDEN " : "IDIC Tournament Dashboard is now VISIBLE ");
    },
    onError: (err: any) => {
      toast.error("Failed to update IDIC visibility: " + err.message);
    }
  });

  // Live simulation helpers
  const simulateBid = () => {
    playChatAlert();
    toast.info("Simulating new customer bid matching merchant tags...");
  };

  const simulateDemand = () => {
    playPremiumMatchChime();
    toast.success("Simulating spike in campus search demand for Electronics & Groceries!");
  };

  const simulateEscrowOrder = () => {
    playOrderChime();
    toast.success("Simulating verified escrow checkout: ₦12,500 deposited!");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Legal Terms Enforcement */}
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

        {/* Visibility Booster */}
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
               IDIC Tournament Settings
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

        {/* System Infrastructure */}
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
                 Simulate Custom Bid
              </Button>
              <Button 
                onClick={simulateDemand} 
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                 Simulate Search Demand
              </Button>
              <Button 
                onClick={simulateEscrowOrder} 
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                 Simulate Escrow Order
              </Button>
            </div>

            <div className="border-t border-border/40 pt-4">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Sparkling Chime Soundboard Audit</Label>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-5 mt-2">
                <Button variant="outline" size="sm" onClick={() => playOrderChime()} className="text-[11px] font-bold border-green-500/30 text-green-500 hover:bg-green-500/10">
                   Order Bell
                </Button>
                <Button variant="outline" size="sm" onClick={() => playPremiumMatchChime()} className="text-[11px] font-bold border-purple-500/30 text-purple-500 hover:bg-purple-500/10">
                   Match Sweep
                </Button>
                <Button variant="outline" size="sm" onClick={() => playChatAlert()} className="text-[11px] font-bold border-blue-500/30 text-blue-500 hover:bg-blue-500/10">
                   Chat Blip
                </Button>
                <Button variant="outline" size="sm" onClick={() => playVerificationChime()} className="text-[11px] font-bold border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                   Approve Chime
                </Button>
                <Button variant="outline" size="sm" onClick={() => playRevokedChime()} className="text-[11px] font-bold border-red-500/30 text-red-500 hover:bg-red-500/10">
                   Cancel Alert
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
    </div>
  );
}
