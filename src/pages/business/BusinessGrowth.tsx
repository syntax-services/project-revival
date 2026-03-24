import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  TrendingUp, 
  Target, 
  Rocket, 
  Users, 
  MousePointer2,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const GROWTH_TIPS = [
  {
    title: "Optimize Your Profile",
    description: "Businesses with complete descriptions and high-quality cover images get 40% more engagement.",
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/10"
  },
  {
    title: "Request Reviews",
    description: "Send your profile link to loyal customers. High reputation scores boost your AI matching rank.",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/10"
  },
  {
    title: "Rare Products",
    description: "Mark unique items as 'Rare' to stand out in the Discover feed and attract premium customers.",
    icon: Target,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/10"
  }
];

export default function BusinessGrowth() {
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategy & Growth</h1>
          <p className="mt-1 text-muted-foreground">Actionable insights to scale your business on String</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {GROWTH_TIPS.map((tip, idx) => (
            <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-lg ${tip.bg} flex items-center justify-center mb-2`}>
                  <tip.icon className={`h-5 w-5 ${tip.color}`} />
                </div>
                <CardTitle className="text-base">{tip.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/10 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Visibility Booster
              </CardTitle>
              <CardDescription>How to appear higher in search results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                  <p className="text-sm text-foreground">Verify your location to appear in "Nearest" searches.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                  <p className="text-sm text-foreground">Maintain an 80%+ order fulfillment rate.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                  <p className="text-sm text-foreground">Update your inventory weekly to stay relevant.</p>
                </div>
              </div>
              <Button className="w-full mt-2" variant="outline">
                View Ranking Score
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer2 className="h-5 w-5 text-green-500" />
                Market Trends
              </CardTitle>
              <CardDescription>General recommendations based on platform demand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                 <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Trending Industry</p>
                    <p className="text-sm font-semibold">Home Services & Logistics</p>
                 </div>
                 <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Top Search Query</p>
                    <p className="text-sm font-semibold">"Same day delivery"</p>
                 </div>
                 <p className="text-xs text-muted-foreground">
                   Tip: Align your product tags with these trends to capture more traffic.
                 </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}