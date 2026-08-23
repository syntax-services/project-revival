import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeCustomizer } from "@/components/ui/theme-customizer";

export function BusinessThemeSettings() {
  return (
    <div className="p-5 border-t border-border/10 space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground">Dark Theme</p>
          <p className="text-[11px] text-muted-foreground">Toggle between dark and light workspace modes.</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="pt-2 border-t border-border/5">
        <p className="text-xs font-semibold text-foreground mb-2.5">Brand Accent Color</p>
        <ThemeCustomizer />
      </div>
    </div>
  );
}
