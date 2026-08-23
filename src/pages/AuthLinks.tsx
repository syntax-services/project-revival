import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLinks() {
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();
 const { refreshProfile, dashboardPath } = useAuth();
 
 const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
 const [errorMsg, setErrorMsg] = useState("");

 const tokenHash = searchParams.get("token_hash");
 const type = searchParams.get("type"); // signup, recovery, invite, magiclink, email_change
 const next = searchParams.get("next") || "/";

 useEffect(() => {
 const verifyToken = async () => {
 if (!tokenHash || !type) {
 setStatus("error");
 setErrorMsg("Missing required security verification tokens.");
 return;
 }

 try {
 console.log(`Exchanging token_hash for session. Type: ${type}`);
 
 // 1. Verify OTP with Supabase
 const { error } = await supabase.auth.verifyOtp({
 token_hash: tokenHash,
 type: type as any,
 });

 if (error) throw error;

 // 2. Refresh profile state
 await refreshProfile();
 
 setStatus("success");
 
 // 3. Redirect to dashboard or landing
 setTimeout(() => {
 navigate(next === "/" ? dashboardPath : next, { replace: true });
 }, 2000);

 } catch (err: any) {
 console.error("Token verification failed:", err);
 setStatus("error");
 setErrorMsg(err.message || "The verification link is invalid or has expired.");
 }
 };

 verifyToken();
 }, [tokenHash, type, next, navigate, refreshProfile, dashboardPath]);

 return (
 <div className="flex min-h-screen items-center justify-center bg-[#070a13] p-4 text-foreground">
 {/* Background glowing gradients */}
 <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
 <div className="absolute bottom-1/4 right-1/4 h-82 w-82 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />

 <Card className="relative w-full max-w-md border-slate-800 bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-6 text-center overflow-hidden">
 <div className="watermark"><div class="watermark-inner"></div></div>
 
 <CardHeader className="space-y-2 pb-6">
 <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
 <ShieldCheck className="h-6 w-6" />
 </div>
 <CardTitle className="text-xl font-bold text-white">String Secure Gate</CardTitle>
 <CardDescription className="text-slate-400">
 Trust & Security Verification Coordination
 </CardDescription>
 </CardHeader>
 
 <CardContent className="space-y-6">
 {status === "verifying" && (
 <div className="flex flex-col items-center space-y-4">
 <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
 <p className="text-sm text-slate-300 font-semibold animate-pulse">
 Exchanging security tokens, please wait...
 </p>
 </div>
 )}

 {status === "success" && (
 <div className="flex flex-col items-center space-y-4">
 <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-bounce" />
 <p className="text-sm text-emerald-400 font-extrabold">
 Verification Successful! 
 </p>
 <p className="text-xs text-slate-400">
 Securing connection parameters. Redirecting you shortly...
 </p>
 </div>
 )}

 {status === "error" && (
 <div className="flex flex-col items-center space-y-4">
 <XCircle className="h-12 w-12 text-destructive" />
 <p className="text-sm text-destructive font-extrabold">
 Verification Failed
 </p>
 <p className="text-xs text-slate-400 max-w-xs mx-auto">
 {errorMsg}
 </p>
 <Button 
 onClick={() => navigate("/auth?mode=login", { replace: true })}
 className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl h-10 mt-2"
 >
 Return to Login
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
