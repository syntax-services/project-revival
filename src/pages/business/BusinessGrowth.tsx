import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
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
import { TikTokBoostHub } from "@/components/business/growth/TikTokBoostHub";

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
  usePageMeta({
    title: "Store Growth & Sales Acceleration",
    description: "Growth tools, referral campaigns, and merchant marketing strategies to scale your campus business.",
    keywords: ["business growth", "referral campaigns", "marketing", "tiktok auto boost"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Strategy & Growth
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actionable marketing channels and social reach automation to scale your campus business.
          </p>
        </div>

        {/* String TikTok Auto-Boost & Social Commerce Reach Hub */}
        <TikTokBoostHub />

        {/* Growth Strategy Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Growth Fundamentals
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {GROWTH_TIPS.map((tip, idx) => (
              <Card key={idx} className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
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
        </div>

        {/* Search Ranking & Visibility Card */}
        <Card className="border-primary/15 bg-primary/5 rounded-3xl p-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Visibility & Ranking Booster
            </CardTitle>
            <CardDescription>How to appear higher in student search results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                <p className="text-sm text-foreground">Verify your location to appear in "Nearest" campus searches.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                <p className="text-sm text-foreground">Maintain an 80%+ order fulfillment rate.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                <p className="text-sm text-foreground">Update your inventory weekly to stay top-of-mind.</p>
              </div>
            </div>
            <Button className="w-full mt-2" variant="outline">
              View Ranking Score
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}