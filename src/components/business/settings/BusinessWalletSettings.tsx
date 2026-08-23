/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSquadPayment } from "@/hooks/useSquadPayment";

interface BusinessWalletSettingsProps {
  user: any;
  profile: any;
  businessData: any;
  businessWallet: {
    available_balance: number;
    pending_escrow: number;
  } | null;
  setBusinessWallet: React.Dispatch<React.SetStateAction<{
    available_balance: number;
    pending_escrow: number;
  } | null>>;
  withdrawConfig: { allow: boolean; minSpend: number };
  withdrawHistory: any[];
  setWithdrawHistory: React.Dispatch<React.SetStateAction<any[]>>;
  refreshProfile: () => Promise<void>;
}

export function BusinessWalletSettings({
  user,
  profile,
  businessData,
  businessWallet,
  setBusinessWallet,
  withdrawConfig,
  withdrawHistory,
  setWithdrawHistory,
  refreshProfile,
}: BusinessWalletSettingsProps) {
  const { initializePayment: initSquad } = useSquadPayment();
  const [withdrawalType, setWithdrawalType] = useState<"business" | "coupon">("business");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // Funding States
  const [fundingAmount, setFundingAmount] = useState("");
  const [funding, setFunding] = useState(false);

  const handleFundWallet = async () => {
    const amountNum = Number(fundingAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount to deposit.");
      return;
    }

    setFunding(true);
    try {
      await initSquad({
        amount: amountNum,
        email: user?.email || "merchant@string.app",
        metadata: {
          type: "business_funding",
          user_id: user?.id,
          business_id: businessData?.id,
        },
        onSuccess: async () => {
          toast.success(`Successfully deposited ₦${amountNum.toLocaleString()}! `);
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
    if (!user || !profile) return;

    const amount = Number(withdrawAmount);
    
    if (withdrawalType === "coupon") {
      if (!amount || amount <= 0 || amount > (profile.coupon_balance || 0)) {
        toast.error("Please enter a valid amount within your coupon balance.");
        return;
      }
      if (!withdrawConfig.allow) {
        toast.error("Coupon cash withdrawals are currently disabled by admin.");
        return;
      }
    } else {
      if (!businessData) {
        toast.error("No business profile associated with this account.");
        return;
      }
      if (!amount || amount <= 0 || amount > (businessWallet?.available_balance || 0)) {
        toast.error("Please enter a valid amount within your sales balance.");
        return;
      }
    }

    setWithdrawing(true);
    try {
      const insertPayload: any = {
        amount: amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        withdrawal_type: withdrawalType,
        status: "pending"
      };

      if (withdrawalType === "coupon") {
        insertPayload.user_id = user.id;
      } else {
        insertPayload.business_id = businessData.id;
      }

      const { error: insertError } = await supabase
        .from("withdrawal_requests")
        .insert(insertPayload)
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (withdrawalType === "coupon") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ coupon_balance: Number(profile.coupon_balance || 0) - amount })
          .eq("user_id", user.id);

        if (profileError) throw profileError;
      } else {
        const newBalance = Number(businessWallet?.available_balance || 0) - amount;
        const { error: walletError } = await supabase
          .from("business_wallets")
          .update({ available_balance: newBalance })
          .eq("business_id", businessData.id);

        if (walletError) throw walletError;
        
        setBusinessWallet((prev) => prev ? { ...prev, available_balance: newBalance } : null);
      }

      toast.success(`Your bank payout request of ₦${amount.toLocaleString()} has been submitted. It will be reviewed by an admin and processed within 2-3 hours.`);
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");

      const { data: wds } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (wds) setWithdrawHistory(wds);
    } catch (err: any) {
      toast.error(err.message || "Failed to process withdrawal request");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="p-5 border-t border-border/10 space-y-5 text-left">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sales Wallet</span>
          <p className="font-extrabold text-lg text-foreground mt-1">
            ₦{Number(businessWallet?.available_balance || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Escrow</span>
          <p className="font-extrabold text-lg text-muted-foreground mt-1">
            ₦{Number(businessWallet?.pending_escrow || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Personal Wallet</span>
          <p className="font-extrabold text-lg text-emerald-500 mt-1">
            ₦{Number(profile?.wallet_balance || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl bg-muted/20 border border-border/10 p-4 flex flex-col text-left relative overflow-hidden group">
          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Coupon Cash</span>
          <p className="font-extrabold text-lg text-primary mt-1">
            ₦{Number(profile?.coupon_balance || 0).toLocaleString()}
          </p>
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
            type="button"
            onClick={() => handleFundWallet()}
            disabled={funding || !fundingAmount || Number(fundingAmount) <= 0}
            className="absolute right-1.5 h-8 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          >
            {funding ? "Processing..." : "Deposit"}
          </Button>
        </div>
      </div>

      {/* Withdrawal Type Selection */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs text-muted-foreground">Withdrawal Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={withdrawalType === "business" ? "default" : "outline"}
            onClick={() => setWithdrawalType("business")}
            className="h-9 rounded-xl font-bold text-xs"
          >
            Sales Balance
          </Button>
          <Button
            type="button"
            variant={withdrawalType === "coupon" ? "default" : "outline"}
            disabled={!withdrawConfig.allow}
            onClick={() => setWithdrawalType("coupon")}
            className="h-9 rounded-xl font-bold text-xs"
          >
            Coupon Points {!withdrawConfig.allow && "(Locked)"}
          </Button>
        </div>
      </div>

      {(withdrawalType === "business" || withdrawConfig.allow) && (
        <form onSubmit={handleWithdrawalRequest} className="space-y-3 pt-2 border-t border-border/10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Request Squad Bank Payout
          </h3>
          
          <div className="space-y-1.5">
            <Label htmlFor="bankName" className="text-xs text-muted-foreground">Bank Name</Label>
            <select
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 h-10 text-sm focus:ring-1 focus:ring-primary"
              required
            >
              <option value="">Select your bank</option>
              <option value="044">Access Bank</option>
              <option value="050">Ecobank Nigeria</option>
              <option value="070">Fidelity Bank</option>
              <option value="011">First Bank of Nigeria</option>
              <option value="058">GTBank</option>
              <option value="030">Heritage Bank</option>
              <option value="301">Jaiz Bank</option>
              <option value="082">Keystone Bank</option>
              <option value="999992">OPay Digital Services</option>
              <option value="999991">PalmPay</option>
              <option value="076">Polaris Bank</option>
              <option value="101">Providus Bank</option>
              <option value="221">Stanbic IBTC Bank</option>
              <option value="068">Standard Chartered Bank</option>
              <option value="232">Sterling Bank</option>
              <option value="100">SunTrust Bank</option>
              <option value="032">Union Bank of Nigeria</option>
              <option value="033">United Bank for Africa (UBA)</option>
              <option value="215">Unity Bank</option>
              <option value="035">Wema Bank</option>
              <option value="057">Zenith Bank</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acctNumber" className="text-xs text-muted-foreground">Account Number</Label>
              <Input
                id="acctNumber"
                maxLength={10}
                placeholder="10 digit NUBAN"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acctName" className="text-xs text-muted-foreground">Account Name</Label>
              <Input
                id="acctName"
                placeholder="E.g. John Doe"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wdAmount" className="text-xs text-muted-foreground">Amount (₦)</Label>
            <Input
              id="wdAmount"
              type="number"
              placeholder="₦ Amount to withdraw"
              max={withdrawalType === "coupon" ? (profile?.coupon_balance || 0) : (businessWallet?.available_balance || 0)}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={
              withdrawing || 
              !withdrawAmount || 
              Number(withdrawAmount) > (withdrawalType === "coupon" ? (profile?.coupon_balance || 0) : (businessWallet?.available_balance || 0))
            }
            className="w-full rounded-xl font-semibold mt-2 h-10"
          >
            {withdrawing ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Processing Payout...
              </>
            ) : (
              "Request Bank Transfer"
            )}
          </Button>
        </form>
      )}

      {/* Withdrawal History Log */}
      {withdrawHistory.length > 0 && (
        <div className="pt-3 border-t border-border/10 space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payout History</h4>
          <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar">
            {withdrawHistory.map((w) => (
              <div key={w.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/20 text-[11px] border border-border/5">
                <div className="text-left">
                  <p className="font-semibold text-foreground">₦{Number(w.amount).toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase py-0.5 px-2 rounded-full",
                  w.status === "completed" ? "bg-green-500/10 text-green-500" :
                  w.status === "processing" ? "bg-amber-500/10 text-amber-500" :
                  w.status === "rejected" ? "bg-red-500/10 text-red-500" :
                  "bg-muted text-muted-foreground"
                )}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
