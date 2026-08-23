import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2, Store, UserX, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AccountDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userType: "customer" | "business";
}

export function AccountDeletionDialog({
  open,
  onOpenChange,
  userType,
}: AccountDeletionDialogProps) {
  const { user, signOut, refreshProfile, switchRole } = useAuth();
  const navigate = useNavigate();
  const [deleteMode, setDeleteMode] = useState<"store_only" | "full_account">(
    userType === "business" ? "store_only" : "full_account"
  );
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText.trim().toUpperCase() === "DELETE";

  const handleExecuteDeletion = async () => {
    if (!user || !isConfirmed) return;

    setIsDeleting(true);
    try {
      if (deleteMode === "store_only") {
        // ── 1. STORE-ONLY DELETION ──
        const { data, error } = await supabase.rpc("delete_business_store" as any);
        if (error) {
          console.warn("RPC delete_business_store fallback:", error);
          // Fallback direct update
          await supabase
            .from("businesses")
            .delete()
            .eq("user_id", user.id);
          await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", user.id)
            .eq("role", "business");
        }

        toast.success("Your merchant store has been closed and deleted. Your shopper account remains active.");
        await refreshProfile();
        switchRole("customer");
        navigate("/customer", { replace: true });
      } else {
        // ── 2. FULL USER ACCOUNT DELETION ──
        try {
          await supabase.rpc("delete_user_account" as any);
        } catch (rpcErr) {
          console.warn("RPC delete_user_account fallback:", rpcErr);
          await supabase
            .from("businesses")
            .delete()
            .eq("user_id", user.id);
          await supabase
            .from("customers")
            .delete()
            .eq("user_id", user.id);
          await supabase
            .from("profiles")
            .delete()
            .eq("user_id", user.id);
        }

        localStorage.clear();
        sessionStorage.clear();
        toast.success("Your account and all associated profiles have been deleted.");
        await signOut();
        navigate("/auth", { replace: true });
      }
    } catch (err: any) {
      console.error("Deletion failed:", err);
      toast.error(err.message || "Failed to process deletion request. Please try again.");
    } finally {
      setIsDeleting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-destructive/30 shadow-2xl text-left">
        <DialogHeader className="space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-black text-foreground">
            {userType === "business" && deleteMode === "store_only"
              ? "Close & Delete Store"
              : "Delete Account Permanently"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {userType === "business" && deleteMode === "store_only"
              ? "This will delete your store catalogue, listings, and merchant profile. Your customer shopper account will remain 100% active."
              : "This action will permanently delete your entire String profile, customer account, merchant store, and login."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-left">
          {/* Options toggle if on business dashboard */}
          {userType === "business" && (
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted/40 rounded-2xl border border-border/20">
              <button
                type="button"
                onClick={() => setDeleteMode("store_only")}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  deleteMode === "store_only"
                    ? "bg-card text-foreground shadow-xs border border-border/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Store className="h-4 w-4 mb-1 text-primary" />
                <span>Delete Store Alone</span>
                <span className="text-[10px] text-muted-foreground font-medium">Keep Shopper Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteMode("full_account")}
                className={cn(
                  "flex flex-col items-center justify-center py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  deleteMode === "full_account"
                    ? "bg-card text-destructive shadow-xs border border-destructive/30"
                    : "text-muted-foreground hover:text-destructive"
                )}
              >
                <UserX className="h-4 w-4 mb-1 text-destructive" />
                <span>Delete Full Account</span>
                <span className="text-[10px] text-muted-foreground font-medium">Purge Everything</span>
              </button>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-destructive/5 border border-destructive/20 text-xs text-destructive space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />{" "}
              {deleteMode === "store_only" ? "Store Deletion Warning" : "Permanent Account Deletion"}
            </p>
            <p className="text-[11px] opacity-90">
              {deleteMode === "store_only"
                ? "All your published products, services, store hours, and business listings will be erased."
                : "All shopper records, merchant stores, reviews, and profile history tied to this account will be erased."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete" className="text-xs font-bold text-foreground">
              Type <span className="font-mono text-destructive">DELETE</span> to confirm:
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="google-input font-mono text-xs uppercase"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-2xl text-xs font-bold w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleExecuteDeletion}
            disabled={!isConfirmed || isDeleting}
            className="rounded-2xl text-xs font-black w-full sm:w-auto shadow-md"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : deleteMode === "store_only" ? (
              "Confirm Store Deletion"
            ) : (
              "Delete Everything"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
