import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DollarSign, Wallet, Clock, ArrowRight, ArrowLeft, Loader2, Landmark } from "lucide-react";
import { useBusinessEarnings, useWithdrawalRequests, useCreateWithdrawal } from "@/hooks/useBusinessEarnings";
import { useBusiness } from "@/hooks/useBusiness";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function BusinessPayments() {
  usePageMeta({
    title: "Earnings, Wallet & Bank Withdrawals",
    description: "Track your sales revenue, view completed escrow payouts, and withdraw funds directly to your Nigerian bank account.",
    keywords: ["merchant wallet","bank withdrawals","sales revenue","payouts"],
    });

  const { data: business } = useBusiness();
  const navigate = useNavigate();

  const businessId = business?.id || "";

  const { data: earnings, isLoading } = useBusinessEarnings(businessId);
  const { data: withdrawals = [] } = useWithdrawalRequests(businessId);
  const createWithdrawal = useCreateWithdrawal();

  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const handleWithdraw = async () => {
    if (!amount || !bankName || !accountNumber || !accountName || !businessId) return;

    await createWithdrawal.mutateAsync({
      businessId,
      amount: parseFloat(amount),
      bankName,
      accountNumber,
      accountName,
    });

    setShowWithdrawDialog(false);
    setAmount("");
    setBankName("");
    setAccountNumber("");
    setAccountName("");
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending" || w.status === "processing");
  const completedWithdrawals = withdrawals.filter(w => w.status === "completed");

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/20 px-4 h-14 flex items-center gap-3">
          <button 
            onClick={() => navigate("/business/profile")}
            className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-bold text-lg">Wallet & Payments</h1>
        </div>

        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="h-32 animate-pulse bg-muted rounded-2xl" />
          ) : (
            <>
              {/* Primary Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Available</span>
                  </div>
                  <p className="text-3xl font-black">
                    {'\u20A6'}{(earnings?.availableBalance || 0).toLocaleString()}
                  </p>
                  <Button
                    className="w-full mt-4 rounded-xl font-bold shadow-md"
                    onClick={() => setShowWithdrawDialog(true)}
                    disabled={(earnings?.availableBalance || 0) <= 0}
                  >
                    Withdraw Funds
                  </Button>
                </div>

                <div className="p-5 bg-muted/40 border border-border/20 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                    </div>
                    <p className="text-3xl font-black text-muted-foreground">
                      {'\u20A6'}{(earnings?.pendingBalance || 0).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 leading-tight">
                    Funds from ongoing or uncompleted escrow orders.
                  </p>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-muted/30 rounded-2xl text-center border border-border/10">
                  <p className="text-lg font-black">{'\u20A6'}{(earnings?.grossRevenue || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Gross Revenue</p>
                </div>
                <div className="p-4 bg-rose-500/5 rounded-2xl text-center border border-rose-500/10">
                  <p className="text-lg font-black text-rose-500">- {'\u20A6'}{(earnings?.totalCommission || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-rose-500/70 uppercase tracking-wider mt-1">Platform Fees</p>
                </div>
                <div className="p-4 bg-emerald-500/5 rounded-2xl text-center border border-emerald-500/10">
                  <p className="text-lg font-black text-emerald-600">{'\u20A6'}{(earnings?.netRevenue || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider mt-1">Net Earnings</p>
                </div>
              </div>

              {/* Withdrawal History */}
              <div className="space-y-4 pt-4">
                <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground px-1">Withdrawal History</h3>
                
                {withdrawals.length === 0 ? (
                  <div className="p-8 text-center bg-muted/20 border border-border/20 rounded-2xl">
                    <Landmark className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm font-bold text-muted-foreground">No withdrawals yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-4 bg-background border border-border/20 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                            w.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
                            w.status === "failed" ? "bg-rose-500/10 text-rose-600" :
                            "bg-amber-500/10 text-amber-600"
                          }`}>
                            <Landmark className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-black text-sm">{'\u20A6'}{Number(w.amount).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {w.bank_name} ••• {w.account_number.slice(-4)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(w.created_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          w.status === "completed" ? "default" :
                          w.status === "failed" ? "destructive" : "secondary"
                        } className="uppercase text-[9px] tracking-wider font-bold rounded-md">
                          {w.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-xl">Request Payout</DialogTitle>
            <DialogDescription className="text-xs">
              Enter your bank details to withdraw your available balance. Minimum withdrawal is ₦1,000.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₦)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                max={earnings?.availableBalance || 0}
                className="h-12 rounded-xl text-lg font-bold"
              />
              <p className="text-[10px] text-muted-foreground flex justify-between">
                <span>Available: ₦{(earnings?.availableBalance || 0).toLocaleString()}</span>
                <button type="button" onClick={() => setAmount(String(earnings?.availableBalance || 0))} className="text-primary font-bold hover:underline">
                  Max
                </button>
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank Name</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Guarantee Trust Bank"
                className="h-11 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Number</Label>
              <Input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="0123456789"
                maxLength={10}
                className="h-11 rounded-xl font-mono text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Name</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="John Doe"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleWithdraw}
              disabled={!amount || !bankName || !accountNumber || !accountName || createWithdrawal.isPending || Number(amount) < 1000}
              className="w-full h-12 rounded-xl font-black text-sm"
            >
              {createWithdrawal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Withdraw ₦${Number(amount || 0).toLocaleString()}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
