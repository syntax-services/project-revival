import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

// ============================================================================
// BESPOKE ULTRA-MINIMALIST USER MODE SVGS
// Crafted with bold lines for active state & thin airy geometry for idle state.
// ============================================================================

export const ShopperModeIcon: React.FC<{ active?: boolean; bold?: boolean; className?: string }> = ({
  active = false,
  bold = false,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={bold ? 2.2 : active ? 1.8 : 1.3}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-4 h-4 transition-all duration-300", className)}
  >
    {/* Shopper Bag Contour */}
    <path d="M6 8h12l1.2 11.2a2 2 0 0 1-2 2.3H6.8a2 2 0 0 1-2-2.3L6 8Z" />
    {/* Bag Loop / String Handle */}
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    {/* Internal Crescent Motif */}
    <circle cx="12" cy="14" r="1.5" className={active || bold ? "fill-primary stroke-none" : "stroke-current"} />
  </svg>
);

export const MerchantModeIcon: React.FC<{ active?: boolean; bold?: boolean; className?: string }> = ({
  active = false,
  bold = false,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={bold ? 2.2 : active ? 1.8 : 1.3}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-4 h-4 transition-all duration-300", className)}
  >
    {/* Storefront Roof / Canopy */}
    <path d="M3 9l2.5-5h13L21 9v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9Z" />
    {/* Store Structure */}
    <path d="M4 10v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9" />
    {/* Shop Entryway Arch */}
    <path d="M10 21v-5a2 2 0 0 1 4 0v5" />
  </svg>
);

export const AdminModeIcon: React.FC<{ active?: boolean; bold?: boolean; className?: string }> = ({
  active = false,
  bold = false,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={bold ? 2.2 : active ? 1.8 : 1.3}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-4 h-4 transition-all duration-300", className)}
  >
    {/* Shield Security Console Shell */}
    <path d="M12 3l7.5 3.5v5.5c0 5-3.5 9-7.5 10-4-1-7.5-5-7.5-10V6.5L12 3Z" />
    {/* Central Core Console Matrix */}
    <circle cx="12" cy="11.5" r="2" />
    <path d="M12 13.5v3" />
  </svg>
);

// Tiny Custom SVG Switch Indicator Icon
export const TinySwitchIcon: React.FC<{ isOpen?: boolean; className?: string }> = ({
  isOpen = false,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("w-3 h-3 text-muted-foreground/70 transition-transform duration-300", isOpen && "rotate-180 text-primary", className)}
  >
    {/* Dual directional swap arrows */}
    <path d="M2.5 4.5h7.5M7.5 2.5l2.5 2-2.5 2" />
    <path d="M11.5 9.5H4M6.5 7.5l-2.5 2 2.5 2" />
  </svg>
);

export const UserRoleSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { user, resolvedUserType, isAdmin, hasBothRoles, switchRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // If user only has a single role and is not an admin, hide the switcher
  if (!hasBothRoles && !isAdmin) {
    return null;
  }

  const handleRoleSelect = async (targetRole: "customer" | "business" | "admin") => {
    setIsOpen(false);
    if (targetRole === resolvedUserType) return;

    if (targetRole === "admin") {
      if (user?.id) {
        localStorage.setItem(`string_active_admin_mode_${user.id}`, "true");
      }
      await refreshProfile();
      toast.success("Switched to Admin View");
      navigate("/admin");
      return;
    }

    if (resolvedUserType === "admin" && user?.id) {
      localStorage.removeItem(`string_active_admin_mode_${user.id}`);
    }

    await switchRole(targetRole);
    toast.success(`Switched to ${targetRole === "business" ? "Merchant" : "Shopper"} View`);
    navigate(targetRole === "business" ? "/business" : "/customer");
  };

  const getActiveIcon = () => {
    if (resolvedUserType === "admin") {
      return <AdminModeIcon bold active className="w-4 h-4 text-red-500" />;
    }
    if (resolvedUserType === "business") {
      return <MerchantModeIcon bold active className="w-4 h-4 text-primary" />;
    }
    return <ShopperModeIcon bold active className="w-4 h-4 text-primary" />;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch User Mode"
          title={`Active: ${resolvedUserType === "admin" ? "Admin Console" : resolvedUserType === "business" ? "Merchant Studio" : "Shopper Mode"}`}
          className={cn(
            "relative flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-full bg-muted/40 hover:bg-muted/70 dark:bg-card/40 dark:hover:bg-card/70 border border-border/50 backdrop-blur-xl transition-all duration-300 active:scale-95 shadow-sm focus:outline-none",
            isOpen && "border-primary/40 bg-muted/70",
            className
          )}
        >
          {/* Main Active Dashboard SVG (Bold) */}
          <div className="flex items-center justify-center">
            {getActiveIcon()}
          </div>

          {/* Tiny Custom Switcher SVG */}
          <div className="flex items-center justify-center pl-0.5">
            <TinySwitchIcon isOpen={isOpen} />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 p-1.5 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/50 shadow-2xl shadow-black/20 animate-in fade-in-0 zoom-in-95 duration-200 z-50 text-left"
      >
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Switch Workspace
        </div>

        {/* Shopper Mode Item */}
        <DropdownMenuItem
          onClick={() => handleRoleSelect("customer")}
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors focus:bg-muted/40",
            resolvedUserType === "customer" && "bg-primary/10 text-primary font-bold"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShopperModeIcon bold={resolvedUserType === "customer"} active={resolvedUserType === "customer"} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-tight">Shopper View</p>
              <p className="text-[10px] text-muted-foreground">Campus marketplace & bids</p>
            </div>
          </div>
          {resolvedUserType === "customer" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        {/* Merchant Mode Item */}
        <DropdownMenuItem
          onClick={() => handleRoleSelect("business")}
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors focus:bg-muted/40",
            resolvedUserType === "business" && "bg-primary/10 text-primary font-bold"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <MerchantModeIcon bold={resolvedUserType === "business"} active={resolvedUserType === "business"} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground leading-tight">Merchant Studio</p>
              <p className="text-[10px] text-muted-foreground">Products, services & payouts</p>
            </div>
          </div>
          {resolvedUserType === "business" && <Check className="h-3.5 w-3.5 text-primary" />}
        </DropdownMenuItem>

        {/* Admin Console Item */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator className="my-1 bg-border/40" />
            <DropdownMenuItem
              onClick={() => handleRoleSelect("admin")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors focus:bg-red-500/10",
                resolvedUserType === "admin" && "bg-red-500/10 text-red-500 font-bold"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                  <AdminModeIcon bold={resolvedUserType === "admin"} active={resolvedUserType === "admin"} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-500 leading-tight">Admin Console</p>
                  <p className="text-[10px] text-muted-foreground">Platform controls & telemetry</p>
                </div>
              </div>
              {resolvedUserType === "admin" && <Check className="h-3.5 w-3.5 text-red-500" />}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
