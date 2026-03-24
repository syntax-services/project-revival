import { Badge } from "@/components/ui/badge";
import { Crown, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = 'none' | 'basic' | 'verified' | 'premium' | 'elite';

interface ReputationBadgeProps {
  tier: Tier;
  className?: string;
  showIcon?: boolean;
}

export function ReputationBadge({ tier, className, showIcon = true }: ReputationBadgeProps) {
  switch (tier) {
    case 'elite':
      return (
        <Badge 
          variant="secondary" 
          className={cn(
            "bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-600 text-white border-none shadow-lg shadow-purple-500/20 animate-pulse-subtle gap-1.5 py-1 px-3 relative overflow-hidden",
            className
          )}
        >
          {showIcon && <Crown className="h-3.5 w-3.5 fill-current" />}
          <span className="font-bold tracking-tight">ELITE</span>
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-fuchsia-200 animate-spin-slow" />
        </Badge>
      );
    case 'premium':
      return (
        <Badge 
          variant="secondary" 
          className={cn(
            "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white border-none shadow-lg shadow-amber-500/20 animate-pulse-subtle gap-1.5 py-1 px-3 relative overflow-hidden",
            className
          )}
        >
          {showIcon && <Crown className="h-3.5 w-3.5 fill-current" />}
          <span className="font-bold tracking-tight">PREMIUM</span>
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-amber-200 animate-spin-slow" />
        </Badge>
      );
    case 'verified':
      return (
        <Badge 
          variant="secondary" 
          className={cn(
            "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none shadow-md shadow-blue-500/20 gap-1.5 py-1 px-3",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="h-3.5 w-3.5 fill-current" />}
          <span className="font-bold tracking-tight">VERIFIED</span>
        </Badge>
      );
    case 'basic':
      return (
        <Badge 
          variant="secondary" 
          className={cn(
            "bg-slate-700 text-slate-100 border-none gap-1.5 py-1 px-3",
            className
          )}
        >
          {showIcon && <ShieldCheck className="h-3.5 w-3.5" />}
          <span className="font-bold tracking-tight">BASIC</span>
        </Badge>
      );
    default:
      return (
        <Badge 
          variant="outline" 
          className={cn(
            "text-muted-foreground border-dashed gap-1.5 py-1 px-3 bg-secondary/30",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="h-3.5 w-3.5 opacity-30" />}
          <span className="font-medium tracking-tight uppercase">Standard</span>
        </Badge>
      );
  }
}
