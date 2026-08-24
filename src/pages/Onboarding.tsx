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
  ArrowLeft,
  Gift,
  Mail,
  CheckCircle2,
  RefreshCw,
  School,
  MapPin,
  KeyRound,
  ShieldCheck,
  User,
} from "lucide-react";
import stringLogoLight from "@/assets/string-logo-light.png";
import stringLogoDark from "@/assets/String-logo-dark.png";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

// ============================================================================
// BESPOKE CUSTOM SVG: ACCOUNT COMPLETION & VERIFICATION BADGE
// ============================================================================
const AccountCompletionBadge = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="24" height="24" rx="7" className="fill-primary/10" />
    <path
      d="M7 12.5L10.5 16L17 8.5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    />
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="3 3"
      className="text-primary/40"
    />
  </svg>
);

// Focused exclusively on Olabisi Onabanjo University (OOU) Ago-Iwoye Main & Mini Campuses
const OOU_CAMPUSES = [
  "OOU Main Campus (Ago-Iwoye)",
  "OOU Mini Campus (Ago-Iwoye)",
];

export default function Onboarding() {
  usePageMeta({
    title: "OOU Account Setup | String Campus Marketplace",
    description: "Complete your student profile for Olabisi Onabanjo University (OOU) on String.",
    keywords: ["String OOU", "OOU marketplace", "Olabisi Onabanjo University", "Ago-Iwoye", "OOU student commerce"],
  });

  const { user, profile, refreshProfile, dashboardPath, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [campus, setCampus] = useState(OOU_CAMPUSES[0]);
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
        const timer = setTimeout(() => {
          navigate(dashboardPath, { replace: true });
        }, 1000);
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
      const { error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: otpCode.trim(),
        type: "signup",
      });

      if (error) {
        const { error: fallbackError } = await supabase.auth.verifyOtp({
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
      // 1. Complete onboarding as a customer with OOU campus
      const { data, error } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: fullName.trim() || "OOU Student",
        p_phone: null,
        p_user_type: "customer",
        p_business_data: null,
        p_customer_data: {
          streetAddress: campus,
          areaName: "Olabisi Onabanjo University",
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
        description: "Your OOU campus marketplace account is ready!",
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already onboarded
  if (profile?.onboarding_completed) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border">
          <div className="container flex h-14 items-center">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to home</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md animate-fade-in text-center space-y-6">
            <div className="mb-6 text-center flex flex-col items-center">
              <img src={stringLogoLight} alt="String Logo" className="h-14 w-auto mb-3 object-contain logo-light" />
              <img src={stringLogoDark} alt="String Logo" className="h-14 w-auto mb-3 object-contain logo-dark" />
              <h1 className="text-2xl font-semibold text-foreground">Account Ready</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You're already set up for Olabisi Onabanjo University.
              </p>
            </div>
            <Button
              onClick={() => navigate(dashboardPath, { replace: true })}
              className="w-full flex items-center justify-center gap-2 h-11"
            >
              Proceed to Marketplace <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header matching Auth.tsx */}
      <header className="border-b border-border">
        <div className="container flex h-14 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          {user ? (
            <span className="text-xs text-muted-foreground font-medium">{user.email}</span>
          ) : (
            <Link to="/auth?mode=login" className="text-xs font-semibold text-primary hover:underline">
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in space-y-6">
          
          {/* Logo & Headline matching Auth.tsx */}
          <div className="mb-6 text-center flex flex-col items-center">
            <img src={stringLogoLight} alt="String Logo" className="h-14 w-auto mb-3 object-contain logo-light" />
            <img src={stringLogoDark} alt="String Logo" className="h-14 w-auto mb-3 object-contain logo-dark" />
            <div className="flex items-center gap-2 justify-center mb-1">
              <AccountCompletionBadge className="h-5 w-5 shrink-0" />
              <h1 className="text-2xl font-semibold text-foreground">Welcome to String</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete your profile for <span className="font-semibold text-foreground">Olabisi Onabanjo University (OOU)</span>
            </p>
          </div>

          {/* Unconfirmed Email Notice / OTP Verification Card */}
          {!user && (
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Verify Your Email</h2>
                  <p className="text-xs text-muted-foreground">
                    Check your mail for the 6-digit confirmation code.
                  </p>
                </div>
              </div>

              {pendingEmail && (
                <div className="bg-background rounded-lg px-3 py-2 text-xs font-mono text-foreground border border-border">
                  {pendingEmail}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="otpCode" className="text-xs">
                    6-Digit Verification Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otpCode"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="pl-10 font-mono tracking-widest text-center text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={verifyingOtp || otpCode.length < 6}
                    className="flex-1 h-9 text-xs font-medium"
                  >
                    {verifyingOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify Code"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendVerification}
                    disabled={resendingEmail || resendCooldown > 0}
                    className="h-9 text-xs font-medium"
                  >
                    {resendCooldown > 0 ? (
                      `Resend (${resendCooldown}s)`
                    ) : resendingEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" /> Resend
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="e.g. Tunde Balogun"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {/* Campus Selection - Restricted to OOU Ago-Iwoye Main & Mini Campuses */}
            <div className="space-y-2">
              <Label htmlFor="campus" className="flex items-center gap-1.5">
                <School className="h-4 w-4 text-primary" /> OOU Campus Location
              </Label>
              <div className="relative">
                <select
                  id="campus"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {OOU_CAMPUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Currently exclusively operating across OOU Main Campus & Mini Campus (Ago-Iwoye).
              </p>
            </div>

            {/* Referral / Promo Code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-muted-foreground" /> Referral / Promo Code (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="referralCode"
                  placeholder="e.g. OOU-VIP"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  className="uppercase font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Apply a friend's referral code to instantly claim welcome bonus reward points.
              </p>
            </div>

            {/* Escrow Security Guarantee */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Zero-fraud campus trade protected by verified student escrow.</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  Complete Setup & Enter String
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-sm text-muted-foreground">
            Have an account?{" "}
            <Link
              to="/auth?mode=login"
              className="font-semibold text-primary hover:underline hover:text-primary/80 transition-all"
            >
              Sign In
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
