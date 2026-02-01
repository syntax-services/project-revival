import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DollarSign, TrendingUp, Wallet, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useBusinessEarnings, useWithdrawalRequests, useCreateWithdrawal } from "@/hooks/useBusinessEarnings";
import { format } from "date-fns";

interface BusinessEarningsCardProps {
  businessId: string;
}

export function BusinessEarningsCard({ businessId }: BusinessEarningsCardProps) {
  const { data: earnings, isLoading } = useBusinessEarnings(businessId);
  const { data: withdrawals = [] } = useWithdrawalRequests(businessId);
  const createWithdrawal = useCreateWithdrawal();

  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const handleWithdraw = async () => {
    if (!amount || !bankName || !accountNumber || !accountName) return;

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-32 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const pendingWithdrawals = withdrawals.filter(w => w.status === "pending" || w.status === "processing");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Earnings & Withdrawals
          </CardTitle>
          <CardDescription>Your revenue after platform fees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Balance Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 text-primary">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Available Balance</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                ₦{earnings?.availableBalance.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                ₦{earnings?.pendingBalance.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-semibold">₦{earnings?.grossRevenue.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Gross Revenue</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-semibold text-destructive">-₦{earnings?.totalCommission.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Platform Fees</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-lg font-semibold text-green-600">₦{earnings?.netRevenue.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Net Earnings</p>
            </div>
          </div>

          {/* Withdrawal Button */}
          <Button
            className="w-full"
            onClick={() => setShowWithdrawDialog(true)}
            disabled={(earnings?.availableBalance || 0) <= 0}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Withdraw Funds
          </Button>

          {/* Pending Withdrawals */}
          {pendingWithdrawals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pending Withdrawals</p>
              {pendingWithdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">₦{Number(w.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.bank_name} - {w.account_number}
                    </p>
                  </div>
                  <Badge variant={w.status === "pending" ? "secondary" : "outline"}>
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Recent Withdrawals */}
          {withdrawals.filter(w => w.status === "completed").length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Recent Withdrawals</p>
              {withdrawals
                .filter(w => w.status === "completed")
                .slice(0, 3)
                .map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(w.created_at), "MMM d, yyyy")}
                    </span>
                    <span className="font-medium">₦{Number(w.amount).toLocaleString()}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter your bank details to withdraw your earnings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-xl font-bold">₦{earnings?.availableBalance.toLocaleString() || 0}</p>
            </div>

            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={earnings?.availableBalance || 0}
              />
            </div>

            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                placeholder="e.g. First Bank, GTBank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                placeholder="10-digit account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                placeholder="Name on account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={
                !amount ||
                !bankName ||
                !accountNumber ||
                !accountName ||
                createWithdrawal.isPending ||
                parseFloat(amount) > (earnings?.availableBalance || 0)
              }
            >
              {createWithdrawal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
