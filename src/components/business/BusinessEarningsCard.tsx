import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowRight, TrendingUp } from "lucide-react";
import { useBusinessEarnings } from "@/hooks/useBusinessEarnings";
import { useNavigate } from "react-router-dom";

interface BusinessEarningsCardProps {
  businessId: string;
}

export function BusinessEarningsCard({ businessId }: BusinessEarningsCardProps) {
  const { data: earnings, isLoading } = useBusinessEarnings(businessId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-none shadow-xs bg-muted/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse bg-muted rounded" />
            <div className="h-6 w-32 animate-pulse bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-none shadow-xs bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available Balance</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 rounded-full text-xs font-bold px-3 hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={() => navigate("/business/payments")}
          >
            Open Wallet <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-3xl font-black tracking-tight text-foreground">
              {'\u20A6'}{(earnings?.availableBalance || 0).toLocaleString()}
            </h3>
            <p className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> 
              Net earnings ready for payout
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
