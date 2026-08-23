import { Button } from "@/components/ui/button";
import { Copy, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VirtualAccountData {
  accountNumber: string;
  bankName: string;
  accountName: string;
  expectedAmount: number;
  reference: string;
}

interface CheckoutBankTransferModalProps {
  virtualAccount: VirtualAccountData;
  transferTimer: number;
  processing: boolean;
  onVerifyPayment: () => void;
}

export function CheckoutBankTransferModal({
  virtualAccount,
  transferTimer,
  processing,
  onVerifyPayment,
}: CheckoutBankTransferModalProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-5 shadow-lg space-y-4 text-left">
      <div className="flex items-center gap-3 border-b border-border/10 pb-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">Complete Bank Transfer</h3>
          <p className="text-[11px] text-muted-foreground">Transfer exact amount to the dedicated checkout account.</p>
        </div>
      </div>

      <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/10 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-sans">Bank:</span>
          <span className="font-bold text-foreground">{virtualAccount.bankName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-sans">Account Number:</span>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-primary tracking-wider">{virtualAccount.accountNumber}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(virtualAccount.accountNumber, "Account number")}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-sans">Account Name:</span>
          <span className="font-semibold text-foreground text-[11px]">{virtualAccount.accountName}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border/10">
          <span className="text-muted-foreground font-sans">Expected Amount:</span>
          <span className="font-black text-base text-emerald-600 dark:text-emerald-400">
            ₦{virtualAccount.expectedAmount.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Account expires in:</span>
        <span className="font-bold text-amber-500 font-mono">{formatTimer(transferTimer)}</span>
      </div>

      <Button
        type="button"
        onClick={onVerifyPayment}
        disabled={processing}
        className="w-full bg-primary hover:bg-primary/95 text-white font-bold h-11 rounded-xl shadow-md"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Verifying Transaction...
          </>
        ) : (
          "I Have Sent the Money "
        )}
      </Button>
    </div>
  );
}
