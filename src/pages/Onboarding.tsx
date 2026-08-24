import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowRight,
  Gift,
  Mail,
  CheckCircle2,
  RefreshCw,
  School,
  Sparkles,
  MapPin,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

const CAMPUSES = [
  "University of Lagos (UNILAG)",
  "Lagos State University (LASU)",
  "University of Benin (UNIBEN)",
  "Obafemi Awolowo University (OAU)",
  "University of Nigeria Nsukka (UNN)",
  "University of Ibadan (UI)",
  "Ahmadu Bello University (ABU)",
  "Federal University of Technology Akure (FUTA)",
  "Covenant University",
  "Babcock University",
  "Other / Non-Campus",
];

export default function Onboarding() {
  usePageMeta({
    title: "Welcome to String | Account Setup & Campus Selection",
    description: "Set up your profile, choose your university campus, and start buying or selling goods on String.",
    keywords: ["String onboarding", "campus selection", "profile setup"],
  });

  const { user, profile, refreshProfile, dashboardPath, isEmailVerified } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [campus, setCampus] = useState(CAMPUSES[0]);
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingEmail, setPendingEmail] = useState(searchParams.get("email") || "");

  // Hydrate user metadata and profile
  useEffect(() => {
    if (user) {
      if (user.email && !pendingEmail) {
        setPendingEmail(user.email);
      }
      const metadata = user.user_metadata;
      if (metadata?.full_name && !fullName) {
        setFullName(metadata.full_name);
      }
      if (metadata?.referral_code && !referralCode) {
        setReferralCode(metadata.referral_code);
      }
    }
    if (profile) {
      if (profile.full_name && !fullName) {
        setFullName(profile.full_name);
      }
      if (profile.onboarding_completed) {
        // If already onboarded, redirect after a brief moment
        const timer = setTimeout(() => {
          navigate(dashboardPath, { replace: true });
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user, profile, dashboardPath, navigate, fullName, referralCode, pendingEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle direct OTP verification if email not yet confirmed
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = pendingEmail.trim() || user?.email;
    if (!targetEmail || !otpCode.trim()) {
      toast({
        variant: "destructive",
        title: "Code Required",
        description: "Please enter the 6-digit confirmation code.",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: otpCode.trim(),
        type: "signup",
      });

      if (error) {
        // Try email verification fallback type
        const { data: fallbackData, error: fallbackError } = await supabase.auth.verifyOtp({
          email: targetEmail,
          token: otpCode.trim(),
          type: "email",
        });
        if (fallbackError) throw fallbackError;
      }

      toast({
        title: "Email Verified",
        description: "Your email address has been verified successfully.",
      });
      await refreshProfile();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message || "Invalid code. Please check your email or request a new code.",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    const targetEmail = pendingEmail.trim() || user?.email;
    if (!targetEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please provide your email to resend confirmation.",
      });
      return;
    }

    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
      });

      if (error) throw error;

      setResendCooldown(60);
      toast({
        title: "Code Sent",
        description: `A new confirmation link and code have been sent to ${targetEmail}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Resend Failed",
        description: err.message || "Could not resend email. Please try again in a moment.",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  // Complete profile setup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    setLoading(true);

    try {
      // 1. Complete onboarding as a customer with selected campus
      const { data, error } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: fullName.trim() || "Student",
        p_phone: null,
        p_user_type: "customer",
        p_business_data: null,
        p_customer_data: {
          streetAddress: campus,
          areaName: campus,
          location: campus,
        } as unknown as Json,
      });

      if (error) throw error;

      const success = (data as any)?.success;
      if (!success) {
        throw new Error((data as any)?.message || "Failed to save details. Please try again.");
      }

      // 2. Claim coupon / referral code if provided
      if (referralCode.trim()) {
        try {
          const { data: refData, error: refError } = await supabase.rpc("process_referral", {
            p_referral_code: referralCode.trim().toUpperCase(),
          });

          if (!refError && refData && (refData as any).success) {
            toast({
              title: "Bonus Claimed",
              description: (refData as any).message || "Your sign-up bonus was successfully applied.",
            });
          }
        } catch (refErr) {
          console.warn("Referral processing:", refErr);
        }
      }

      await refreshProfile();

      toast({
        title: "Welcome to String",
        description: "Your campus marketplace account is ready!",
      });

      navigate("/customer", { replace: true });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message || "Failed to complete onboarding. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // If user is already onboarded
  if (profile?.onboarding_completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-3xl border border-border/40 bg-card p-8 text-center space-y-4 shadow-xl">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">You are all set!</h2>
          <p className="text-sm text-muted-foreground">
            Redirecting to your campus discovery feed...
          </p>
          <Button
            onClick={() => navigate(dashboardPath, { replace: true })}
            className="w-full rounded-2xl h-11 font-bold"
          >
            Continue to Marketplace <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/30 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          STRING
        </Link>
        {user ? (
          <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
        ) : (
          <Link to="/auth" className="text-xs font-bold text-primary hover:underline">
            Sign In
          </Link>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center p-4 py-8">
        <div className="w-full max-w-md space-y-6">

          {/* Email Confirmation Notice Card (If unconfirmed or reached via signup redirect) */}
          {!user && (
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 space-y-4 text-left shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Confirm Your Email</h3>
                  <p className="text-xs text-muted-foreground">
                    We sent a verification link and 6-digit code to your email.
                  </p>
                </div>
              </div>

              {pendingEmail && (
                <div className="bg-background/80 rounded-xl px-3 py-2 text-xs font-mono text-foreground border border-border/40">
                  {pendingEmail}
                </div>
              )}

              {/* OTP Direct Entry Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="otpCode" className="text-xs font-bold">
                    Enter 6-Digit Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otpCode"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="pl-9 font-mono tracking-widest text-center text-sm font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={verifyingOtp || otpCode.length < 6}
                    className="flex-1 rounded-xl text-xs font-bold"
                  >
                    {verifyingOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify Code"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={resendingEmail || resendCooldown > 0}
                    className="rounded-xl text-xs font-semibold"
                  >
                    {resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : resendingEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" /> Resend Code
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Main Account Setup Card */}
          <div className="rounded-3xl border border-border/40 bg-card p-6 shadow-xl space-y-5 text-left">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Account Finalization
              </div>
              <h1 className="text-xl font-black text-foreground">Welcome to String!</h1>
              <p className="text-xs text-muted-foreground">
                Set up your student profile to discover local goods and verified campus stores.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-bold">
                  Your Full Name
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Tunde Balogun"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="rounded-xl text-xs"
                />
              </div>

              {/* Campus Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="campus" className="text-xs font-bold flex items-center gap-1">
                  <School className="h-3.5 w-3.5 text-primary" /> Select Your Campus
                </Label>
                <select
                  id="campus"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  {CAMPUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  You'll see verified merchants, student services, and delivery options in your campus area.
                </p>
              </div>

              {/* Referral / Promo Code */}
              <div className="space-y-1.5">
                <Label htmlFor="referralCode" className="text-xs font-bold flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5 text-primary" /> Coupon or Referral Code (Optional)
                </Label>
                <div className="relative">
                  <Input
                    id="referralCode"
                    placeholder="e.g. STR-WELCOME"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    className="rounded-xl uppercase font-mono text-xs"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Apply a referral code to earn instant bonus reward points to your wallet.
                </p>
              </div>

              {/* Trust Badge */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/20 flex items-center gap-2.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Protected by String Escrow and verified student security.</span>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl h-11 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizing Your Profile...
                  </>
                ) : (
                  <>
                    Complete Setup & Enter Marketplace
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="text-center">
            <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground font-medium">
              Already have an account? <span className="text-primary font-bold">Sign In</span>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
