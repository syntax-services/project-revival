import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ShieldAlert, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Banned() {
  usePageMeta({
    title: "Account Notice | String Trust & Safety",
    description: "Account suspension or restriction information and support appeal channel.",
    keywords: ["String account status","trust and safety"],
    });

  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth?mode=login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Visual background details */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="dashboard-card max-w-md w-full text-center space-y-6 p-8 border-destructive/20 relative z-10 shadow-2xl backdrop-blur-xl bg-background/40">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center animate-bounce">
            <ShieldAlert className="h-9 w-9" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Deactivated</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono text-destructive">
            Administrative Enforcement
          </p>
        </div>

        <div className="text-sm text-muted-foreground leading-relaxed bg-muted/20 border border-border/10 rounded-2xl p-4">
          Your String marketplace profile has been suspended due to violations of our platform security guidelines, suspicious transaction patterns, or report reviews.
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 justify-center text-xs text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            <span>Support: <strong>appeals@stringplatform.com</strong></span>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="flex-1 rounded-2xl h-11 border-border/40 hover:bg-destructive/5 hover:text-destructive active:scale-95 transition-all"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
          <Button
            asChild
            className="flex-1 rounded-2xl h-11 bg-primary text-primary-foreground hover:bg-primary/95 active:scale-95 transition-transform"
          >
            <a href="mailto:appeals@stringplatform.com?subject=String%20Account%20Appeal">
              File Appeal
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
