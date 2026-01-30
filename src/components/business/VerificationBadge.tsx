import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Shield, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type VerificationTier = "none" | "verified" | "premium";

interface VerificationBadgeProps {
  tier: VerificationTier;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const tierConfig: Record<VerificationTier, {
  label: string;
  icon: typeof CheckCircle2;
  variant: "default" | "secondary" | "outline" | "destructive";
  className: string;
}> = {
  none: {
    label: "Unverified",
    icon: AlertTriangle,
    variant: "outline",
    className: "text-muted-foreground border-muted",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    variant: "secondary",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  premium: {
    label: "Premium",
    icon: Crown,
    variant: "default",
    className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0",
  },
};

const sizeConfig = {
  sm: { icon: "h-3 w-3", text: "text-xs", padding: "px-1.5 py-0.5" },
  md: { icon: "h-3.5 w-3.5", text: "text-xs", padding: "px-2 py-1" },
  lg: { icon: "h-4 w-4", text: "text-sm", padding: "px-2.5 py-1" },
};

export function VerificationBadge({
  tier,
  className,
  showLabel = true,
  size = "md",
}: VerificationBadgeProps) {
  const config = tierConfig[tier];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  if (tier === "none" && !showLabel) {
    return null;
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "flex items-center gap-1 font-medium",
        sizeStyles.padding,
        sizeStyles.text,
        config.className,
        className
      )}
    >
      <Icon className={sizeStyles.icon} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

// Just the icon for compact displays
export function VerificationIcon({
  tier,
  className,
  size = "md",
}: Omit<VerificationBadgeProps, "showLabel">) {
  const config = tierConfig[tier];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  if (tier === "none") {
    return null;
  }

  return (
    <Icon 
      className={cn(
        sizeStyles.icon,
        tier === "verified" && "text-blue-500",
        tier === "premium" && "text-amber-500",
        className
      )} 
    />
  );
}
