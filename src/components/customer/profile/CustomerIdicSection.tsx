import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CustomerIdicSectionProps {
  profile: {
    user_id?: string;
    full_name?: string;
    idic_code?: string | null;
    idic_department?: string | null;
  } | null;
  refreshProfile: () => Promise<void>;
  hideIdic: boolean;
}

const DEPARTMENTS = [
  "Computer Science", "Mathematics", "Statistics", "Physics", "Chemistry",
  "Medicine", "Pharmacy", "Nursing", "Biochemistry", "Microbiology",
  "Law", "Political Science", "Sociology", "Economics", "Mass Communication",
  "Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering", "Business Administration"
];

export function CustomerIdicSection({ profile, refreshProfile, hideIdic }: CustomerIdicSectionProps) {
  const [idicDept, setIdicDept] = useState("");
  const [registeringIdic, setRegisteringIdic] = useState(false);

  if (hideIdic) return null;

  const handleIDICRegister = async () => {
    if (!idicDept || !profile?.user_id) {
      toast.error("Please select your department");
      return;
    }

    setRegisteringIdic(true);
    try {
      const code = `IDIC-${idicDept.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { error } = await supabase
        .from("profiles")
        .update({
          idic_code: code,
          idic_department: idicDept
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      await refreshProfile();
      toast.success(`Successfully registered for IDIC! Your code: ${code}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration error";
      toast.error(message || "Failed to register for IDIC");
    } finally {
      setRegisteringIdic(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4 shadow-sm space-y-3 text-left">
      <div className="flex items-center gap-2">
        <span className="text-base"></span>
        <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">IDIC Championship</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-tight">
        Select your department to generate your official competitor code.
      </p>

      {profile?.idic_code ? (
        <div className="bg-amber-500/[0.02] border border-amber-500/10 rounded-xl p-3 text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Competitor Code</p>
          <p className="text-xl font-black text-amber-500 font-mono tracking-wider">{profile.idic_code}</p>
          <p className="text-xs text-muted-foreground">
            Dept: <span className="font-bold text-foreground">{profile.idic_department}</span>
          </p>
          <p className="text-[10px] text-muted-foreground pt-1.5 border-t border-border/10 mt-1">
             Rewards will be unlocked at the end of the tournament.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="space-y-1">
            <Label htmlFor="idic-dept" className="text-[10px] font-bold text-muted-foreground">Select Department</Label>
            <Select value={idicDept} onValueChange={setIdicDept}>
              <SelectTrigger id="idic-dept" className="rounded-xl border-border/20 bg-muted/30 h-8 text-xs">
                <SelectValue placeholder="Choose department..." />
              </SelectTrigger>
              <SelectContent className="max-h-[220px]">
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept} className="text-xs">
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleIDICRegister}
            disabled={registeringIdic || !idicDept}
            className="w-full h-10 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10 transition-all duration-300"
          >
            {registeringIdic ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</>
            ) : (
              "Register & Get Badge"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
