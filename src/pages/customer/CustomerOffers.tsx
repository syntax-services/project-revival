import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CreateOfferPanel } from "@/components/offers/CreateOfferPanel";
import { OffersList } from "@/components/offers/OffersList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ListChecks } from "lucide-react";

export default function CustomerOffers() {
  const [activeTab, setActiveTab] = useState("browse");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Requests</h1>
            <p className="mt-1 text-muted-foreground">
              Request products, services, or opportunities
            </p>
          </div>
          <CreateOfferPanel />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Browse Requests
            </TabsTrigger>
            <TabsTrigger value="my-requests" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              My Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4">
            <OffersList />
          </TabsContent>

          <TabsContent value="my-requests" className="mt-4">
            <OffersList showMyOffers />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
