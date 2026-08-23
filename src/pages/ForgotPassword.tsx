import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, ShieldAlert } from "lucide-react";
import stringLogoLight from "@/assets/string-logo-light.png";
import stringLogoDark from "@/assets/String-logo-dark.png";
import { usePremiumMail } from "@/hooks/usePremiumMail";

export default function ForgotPassword() {
  usePageMeta({
    title: "Reset Your Password | Account Recovery",
    description: "Recover your String account password securely to regain access to your campus marketplace dashboard.",
    keywords: ["String password reset","account recovery","forgot password"],
    });

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { dispatchEmail } = usePremiumMail();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address to continue.",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Trigger Supabase real password recovery request
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });

      if (resetError) {
        toast({
          variant: "destructive",
          title: "Request failed",
          description: resetError.message,
        });
        return;
      }

      // 2. Query matching profile to send local mock HSL-themed preview email (ideal for developers)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle();

      if (profile) {
        // Queue interactive HSL email in developer notifications
        await dispatchEmail(
          "password_reset",
          profile.id,
          email,
          profile.full_name,
          {}
        );
      }

      setIsSubmitted(true);
      toast({
        title: "Recovery email sent",
        description: "A secure reset link has been dispatched to your email address.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: err.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex h-14 items-center px-4">
          <Link
            to="/auth?mode=login"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo */}
          <div className="mb-6 text-center flex flex-col items-center">
            <img src={stringLogoLight} alt="String Logo" className="h-14 w-auto mb-3 object-contain logo-light" />
            <img src={stringLogoDark} alt="String Logo" className="h-14 w-auto mb-3 object-contain logo-dark" />
            <h1 className="text-2xl font-semibold text-foreground">Reset Password</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your email to receive a secure recovery coordinate link
            </p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    className="pl-10 bg-background/50 h-10 border-border/80 focus:border-primary"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  "Send Secure Reset Link"
                )}
              </Button>
            </form>
          ) : (
            <div className="p-6 rounded-2xl border border-primary/20 bg-card/40 backdrop-blur-xl space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-bounce">
                <Mail className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Check your email</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We've sent a secure recovery link to <strong>{email}</strong>. Please check your inbox and promotions tab.
                </p>
              </div>
              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-2.5 text-left text-xs text-muted-foreground leading-relaxed">
                <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Tip:</strong> If you are testing locally, check your String notifications bar! The interactive HSL-themed email was also dispatched there for zero-latency previewing.
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => navigate("/auth?mode=login", { replace: true })}
              >
                Return to Login
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
