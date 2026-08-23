/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CreditCard, Star, Users, Copy, Sparkles,
  AlertTriangle, CheckCircle, Gift, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSquadPayment } from "@/hooks/useSquadPayment";

interface CustomerWalletSectionProps {
  profile: any;
  customer: any;
  totalPoints: number;
  totalReferrals: number;
  referralCode: string | null;
  giftClaimed: boolean;
  setGiftClaimed: (v: boolean) => void;
  monthlySpent: number;
  totalSpent: number;
  withdrawHistory: any[];
  setWithdrawHistory: (v: any[]) => void;
  refreshProfile: () => Promise<void>;
}

export function CustomerWalletSection({
  profile,
  customer,
  totalPoints,
  totalReferrals,
  referralCode,
  giftClaimed,
  setGiftClaimed,
  monthlySpent,
  totalSpent,
  withdrawHistory,
  setWithdrawHistory,
  refreshProfile,
}: CustomerWalletSectionProps) {
  const queryClient = useQueryClient();
  const { initializePayment: initSquad } = useSquadPayment();

  // Local form states
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [fundingAmount, setFundingAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const handleClaimMonthlyGift = async () => {
    try {
      const { data, error } = await supabase.rpc('check_and_claim_monthly_gift');
      if (error) throw error;

      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.message || "Failed to claim VIP gift");
      }

      toast.success(result?.message || "VIP Gift Claimed! Enjoy your reward ");
      setGiftClaimed(true);
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["referral-data", profile?.user_id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to claim VIP gift");
    }
  };

  const handleClaimReferral = async () => {
    if (!claimCode.trim()) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_referral_code', {
        code_input: claimCode.trim().toUpperCase()
      });
      if (error) throw error;

      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.message || "Invalid or already claimed code.");
      }

      toast.success(result.message || "Referral reward claimed successfully! ");
      setClaimCode("");
      queryClient.invalidateQueries({ queryKey: ["referral-data", profile?.user_id] });
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to claim code");
    } finally {
      setClaiming(false);
    }
  };

  const handleFundWallet = async () => {
    const amount = Number(fundingAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }
    if (amount < 100) {
      toast.error("Minimum deposit is ₦100.");
      return;
    }

    setFunding(true);
    try {
      await initSquad({
        amount,
        email: profile?.email || "customer@string.app",
        metadata: {
          type: "wallet_funding",
          user_id: profile?.user_id,
          customer_id: customer?.id,
        },
        onSuccess: async () => {
          toast.success(`Successfully deposited ₦${amount.toLocaleString()} into your wallet! `);
          setFundingAmount("");
          await refreshProfile();
        },
        onClose: () => {
          setFunding(false);
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize payment gateway.");
      setFunding(false);
    }
  };

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (totalSpent < 25000) {
      toast.error("You must spend at least ₦25,000 before you can withdraw rewards.");
      return;
    }
    if (!amount || amount < 1000) {
      toast.error("Minimum withdrawal amount is ₦1,000.");
      return;
    }
    if (amount > totalPoints) {
      toast.error("Withdrawal amount exceeds your available coupon/rewards balance.");
      return;
    }
    if (!bankName || !accountNumber || !accountName) {
      toast.error("Please provide complete bank payout details.");
      return;
    }

    setWithdrawing(true);
    try {
      // 1. Insert withdrawal request
      const { data: withdrawReq, error: reqError } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: profile!.user_id,
          amount,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          status: "pending"
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Deduct points / coupons
      let remaining = amount;
      let newCouponBalance = profile?.coupon_balance || 0;
      let newPoints = totalPoints;

      if (newCouponBalance >= remaining) {
        newCouponBalance -= remaining;
        remaining = 0;
      } else {
        remaining -= newCouponBalance;
        newCouponBalance = 0;
      }

      if (remaining > 0) {
        newPoints = Math.max(0, newPoints - remaining);
      }

      await supabase
        .from("profiles")
        .update({ coupon_balance: newCouponBalance })
        .eq("user_id", profile!.user_id);

      await supabase
        .from("user_points")
        .update({ total_points: newPoints })
        .eq("user_id", profile!.user_id);

      // 3. Trigger payout Edge Function
      try {
        await supabase.functions.invoke("paystack-payout", {
          body: { withdrawalRequestId: withdrawReq.id }
        });
      } catch (fErr) {
        console.warn("Edge function payout call failed:", fErr);
      }

      toast.success(`Withdrawal request for ₦${amount.toLocaleString()} submitted successfully!`);
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");

      queryClient.invalidateQueries({ queryKey: ["referral-data", profile?.user_id] });
      await refreshProfile();

      const { data: wds } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", profile!.user_id)
        .order("created_at", { ascending: false });
      if (wds) setWithdrawHistory(wds);
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Gamified Rewards & Wallet Section */}
      <div className="bg-card rounded-2xl border border-border/40 overflow-hidden shadow-md">
        <div className="p-4 border-b border-border/10 flex items-center justify-between bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-inner">
              <Gift className="h-4.5 w-4.5 text-primary drop-shadow-sm" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground tracking-tight">Rewards Hub</h2>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Points & Payouts</p>
            </div>
          </div>
          {giftClaimed ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] tracking-wider py-1 px-2.5">VIP GIFT CLAIMED</Badge>
          ) : (
            <Button onClick={handleClaimMonthlyGift} size="sm" className="h-8 rounded-xl bg-primary text-primary-foreground font-bold text-[10px] shadow-sm hover:shadow-md hover:bg-primary/90 transition-all">
              CLAIM VIP GIFT
            </Button>
          )}
        </div>
        
        <div className="p-4 space-y-5 text-left">
          {/* Wallet & Points Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-muted/20 border border-border/20 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <CreditCard className="h-4.5 w-4.5 text-emerald-500 mb-1.5" />
              <p className="text-sm font-extrabold text-foreground tracking-tight">₦{Number(profile?.wallet_balance || 0).toLocaleString()}</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Wallet Cash</p>
            </div>
            <div className="rounded-2xl bg-muted/20 border border-border/20 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500/20 mb-1.5" />
              <p className="text-sm font-extrabold text-foreground tracking-tight">₦{totalPoints.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Coupon Cash</p>
            </div>
            <div className="rounded-2xl bg-muted/20 border border-border/20 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <Users className="h-4.5 w-4.5 text-blue-500 mb-1.5" />
              <p className="text-sm font-extrabold text-foreground tracking-tight">{totalReferrals.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Referred</p>
            </div>
          </div>

          {/* Referral Code */}
          {referralCode && (
            <div className="flex items-center gap-2 bg-muted/10 rounded-2xl p-2 border border-border/20">
              <div className="flex-1 px-3">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Your Referral Code</p>
                <p className="text-sm font-black font-mono tracking-wider text-foreground">{referralCode}</p>
              </div>
              <Button variant="secondary" size="icon" className="h-10 w-10 rounded-xl bg-background shadow-sm hover:shadow active:scale-95 transition-all" onClick={() => {
                navigator.clipboard.writeText(referralCode);
                toast.success("Referral code copied!");
              }}>
                <Copy className="h-4 w-4 text-foreground/70" />
              </Button>
            </div>
          )}

          {/* Monthly VIP Gift Progress Card */}
          <div className="p-3 bg-muted/20 border border-border/20 rounded-2xl space-y-2 text-left">
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                Monthly VIP Gift Progress
              </span>
              <span className={cn(monthlySpent >= 50000 ? "text-emerald-500" : "text-primary")}>
                ₦{monthlySpent.toLocaleString()} / ₦50,000
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-500", monthlySpent >= 50000 ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${Math.min(100, (monthlySpent / 50000) * 100)}%` }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              {monthlySpent >= 50000 
                ? "Congratulations! You have reached the monthly spend of ₦50,000. Claim your ₦5,000 cash gift above!"
                : `Spend ₦${(50000 - monthlySpent).toLocaleString()} more on delivered orders this month to unlock a free ₦5,000 VIP cash gift.`}
            </p>
          </div>

          {/* Claim Promo / Referral Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Claim Promo or Referral Code</p>
              {profile?.referral_code_used && (
                <Badge variant="outline" className="text-[8px] font-bold tracking-wider px-2 py-0.5 border-border/20 text-muted-foreground bg-muted/5">WELCOME BONUS CLAIMED</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Enter code (e.g. STR-XXXXXX or promo)..." value={claimCode} onChange={(e) => setClaimCode(e.target.value)} className="rounded-xl bg-muted/10 border-border/20 focus-visible:ring-primary/30 font-medium" />
              <Button onClick={handleClaimReferral} disabled={claiming || !claimCode} className="rounded-xl shadow-sm font-bold text-xs px-5">
                {claiming ? "Claiming..." : "Claim"}
              </Button>
            </div>
          </div>

          {/* Minimalist Wallet Fund Section */}
          <div className="border-t border-border/10 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-foreground tracking-tight">Fund Wallet</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Deposit secure funds instantly via GTCO Squad</p>
              </div>
              <Badge variant="outline" className="text-[8px] font-bold tracking-wider px-2 py-0.5 bg-emerald-500/5 text-emerald-500 border-emerald-500/20 uppercase">SQUAD SECURE</Badge>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3 text-sm font-bold text-muted-foreground">₦</span>
              <Input
                type="number"
                placeholder="0.00"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                className="pl-7 pr-24 h-11 rounded-xl bg-muted/20 border-border/20 focus-visible:ring-emerald-500/30 font-bold text-sm"
              />
              <Button
                onClick={handleFundWallet}
                disabled={funding || !fundingAmount || Number(fundingAmount) <= 0}
                className="absolute right-1.5 h-8 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                {funding ? "Processing..." : "Deposit"}
              </Button>
            </div>
          </div>

          {/* Local Bank Withdrawal Form */}
          <form onSubmit={handleWithdrawalRequest} className="border-t border-border/10 pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Request Naira Bank Payout</p>
              <Badge variant="secondary" className="text-[8px] font-bold tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">SQUAD SECURE</Badge>
            </div>

            {/* Purchase Volume Bridge Warning Progress */}
            <div className="p-3 bg-muted/30 border border-border/10 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-muted-foreground uppercase tracking-wider">Purchase Bridge Threshold</span>
                <span className={cn(totalSpent >= 25000 ? "text-emerald-500" : "text-yellow-500")}>
                  ₦{totalSpent.toLocaleString()} / ₦25,000
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", totalSpent >= 25000 ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${Math.min(100, (totalSpent / 25000) * 100)}%` }}
                />
              </div>
              {totalSpent < 25000 ? (
                <p className="text-[9.5px] leading-relaxed text-muted-foreground flex items-start gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                  <span>You need to spend at least ₦25,000 on purchases before you can withdraw referral points.</span>
                </p>
              ) : (
                <p className="text-[9.5px] leading-relaxed text-emerald-500 flex items-center gap-1 font-bold">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Purchase threshold reached! Withdrawal enabled.</span>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="withdrawAmount" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Withdrawal Amount (₦)</Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="Min ₦1,000..."
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={withdrawing || totalSpent < 25000}
                  className="rounded-xl border-border/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankName" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Bank</Label>
                <Select value={bankName} onValueChange={setBankName} disabled={withdrawing || totalSpent < 25000}>
                  <SelectTrigger className="rounded-xl border-border/20">
                    <SelectValue placeholder="Select bank name..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="access">Access Bank</SelectItem>
                    <SelectItem value="gtbank">Guaranty Trust Bank (GTB)</SelectItem>
                    <SelectItem value="zenith">Zenith Bank</SelectItem>
                    <SelectItem value="uba">United Bank for Africa (UBA)</SelectItem>
                    <SelectItem value="firstbank">First Bank of Nigeria</SelectItem>
                    <SelectItem value="fcmb">First City Monument Bank (FCMB)</SelectItem>
                    <SelectItem value="wema">Wema Bank</SelectItem>
                    <SelectItem value="sterling">Sterling Bank</SelectItem>
                    <SelectItem value="union">Union Bank</SelectItem>
                    <SelectItem value="polaris">Polaris Bank</SelectItem>
                    <SelectItem value="opay">OPay</SelectItem>
                    <SelectItem value="palmpay">PalmPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountNumber" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Account Number (10 digits)</Label>
                <Input
                  id="accountNumber"
                  placeholder="0123456789"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={withdrawing || totalSpent < 25000}
                  className="rounded-xl border-border/20 font-mono tracking-wider"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountName" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Account Holder Name</Label>
                <Input
                  id="accountName"
                  placeholder="e.g. John Doe"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={withdrawing || totalSpent < 25000}
                  className="rounded-xl border-border/20 font-semibold"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={withdrawing || !withdrawAmount || totalSpent < 25000}
              className="w-full rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all text-xs py-2.5"
            >
              {withdrawing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payout...
                </>
              ) : (
                "Request Bank Transfer"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Withdrawal History Card */}
      {withdrawHistory.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/40 p-4 shadow-md space-y-3 text-left">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Payout History</p>
          <div className="space-y-2.5 max-h-48 overflow-y-auto divide-y divide-border/10">
            {withdrawHistory.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 first:pt-0 last:pb-0 text-xs">
                <div>
                  <p className="font-bold text-foreground">₦{Number(item.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{item.bank_name.toUpperCase()} • {item.account_number}</p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={item.status === 'completed' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'}
                    className={cn(
                      "text-[8px] font-black uppercase tracking-wider px-2 py-0.5",
                      item.status === 'completed' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15"
                    )}
                  >
                    {item.status}
                  </Badge>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{format(new Date(item.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
