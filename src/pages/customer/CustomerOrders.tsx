import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomer, useCustomerOrders } from "@/hooks/useCustomer";
import { Package, Clock, CheckCircle2, Truck, XCircle, Eye, ShieldCheck, MapPin, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { OrderConfirmation } from "@/components/orders/OrderConfirmation";
import { PostPurchaseReview } from "@/components/reviews/PostPurchaseReview";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Awaiting Payment", icon: Clock, variant: "secondary" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, variant: "default" },
  processing: { label: "Processing", icon: Package, variant: "default" },
  shipped: { label: "Shipped", icon: Truck, variant: "default" },
  delivered: { label: "Delivered", icon: CheckCheck, variant: "default" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
  refunded: { label: "Refunded", icon: XCircle, variant: "outline" },
};

interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function CustomerOrders() {
  const { user } = useAuth();
  const { data: customer } = useCustomer();
  const { data: orders = [], isLoading } = useCustomerOrders(customer?.id);
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [trackingSearch, setTrackingSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!customer?.id) return;

    const channelName = `customer_orders_${customer.id}_${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${customer.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customer?.id, queryClient]);

  const handleSatisfaction = async (orderId: string, satisfied: boolean) => {
    try {
      const { error } = await supabase.rpc("respond_to_satisfaction", {
        p_order_id: orderId,
        p_satisfied: satisfied
      });
      if (error) throw error;
      toast.success(satisfied ? "Order confirmed as satisfied!" : "Order marked as unsatisfied. Return flow initiated.");
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit response");
    }
  };

  const handleConfirmReturn = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc("confirm_order_return", {
        p_order_id: orderId,
        p_actor_type: 'shopper'
      });
      if (error) throw error;
      toast.success("Return confirmed! Refund will be credited once the merchant also confirms.");
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm return");
    }
  };

  const filterOrders = (status: string) => {
    let filtered = orders;
    if (status === "all") {
      filtered = orders.filter(o => !["cancelled", "refunded"].includes(o.status));
    } else if (status === "active") {
      filtered = orders.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status));
    } else if (status === "completed") {
      filtered = orders.filter(o => o.status === "delivered");
    } else if (status === "cancelled") {
      filtered = orders.filter(o => ["cancelled", "refunded"].includes(o.status));
    } else {
      filtered = orders.filter(o => o.status === status);
    }
    
    if (trackingSearch.trim()) {
      const q = trackingSearch.toLowerCase();
      filtered = filtered.filter(o => 
        (o.tracking_number && o.tracking_number.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const canConfirmOrder = (order: typeof orders[0]) => {
    return order.status === "shipped";
  };

  const EscrowTimeline = ({ status }: { status: OrderStatus }) => {
    const isUnpaid = status === "pending";
    const isCancelled = ["cancelled", "refunded"].includes(status);
    
    if (isCancelled) {
      return (
        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
          <XCircle className="h-4 w-4 shrink-0" />
          Order Cancelled / Refunded
        </div>
      );
    }

    const steps = [
      { id: 1, label: "Unpaid", active: true, done: !isUnpaid },
      { id: 2, label: "Escrow Secured", active: !isUnpaid, done: ["confirmed", "processing", "shipped", "delivered"].includes(status) },
      { id: 3, label: "Dispatched", active: ["shipped", "delivered"].includes(status), done: status === "delivered" },
      { id: 4, label: "Settled", active: status === "delivered", done: status === "delivered" },
    ];

    return (
      <div className="mt-3 pt-3 border-t border-border/15 space-y-2">
        <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold tracking-wider px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-primary" /> Escrow Protection
          </span>
          <span className={isUnpaid ? "text-amber-500 font-extrabold" : "text-emerald-500 font-extrabold"}>
            {isUnpaid ? "Awaiting Deposit" : "Protected"}
          </span>
        </div>
        <div className="relative flex items-center justify-between w-full px-2">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 h-0.5 bg-muted -translate-y-2 z-0">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: 
                  status === "delivered" ? "100%" :
                  status === "shipped" ? "66%" :
                  !isUnpaid ? "33%" : "0%"
              }}
            />
          </div>

          {/* Stepper nodes */}
          {steps.map((step) => {
            const isHighlighted = step.done || step.active;
            const isCompleted = step.done;
            return (
              <div key={step.id} className="relative flex flex-col items-center z-10">
                <div 
                  className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all duration-300",
                    isCompleted
                      ? "bg-emerald-500 border-emerald-600 text-white shadow-xs"
                      : isHighlighted
                        ? "bg-background border-emerald-500 text-emerald-500 ring-2 ring-emerald-500/10"
                        : "bg-background border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : step.id}
                </div>
                <span className={cn(
                  "text-[9px] font-bold mt-1.5 transition-colors",
                  isHighlighted ? "text-foreground font-black" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const OrderCard = ({ order }: { order: typeof orders[0] }) => {
    const status = order.status as OrderStatus;
    const config = statusConfig[status] || statusConfig.pending;
    const StatusIcon = config.icon;
    const items = (order.items as unknown as OrderItem[]) || [];

    return (
      <div className="bg-card border border-border/20 shadow-xs hover:border-border/35 rounded-3xl p-5 text-left space-y-3.5 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono font-bold text-xs text-foreground">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <Badge variant={config.variant} className="flex items-center gap-1 text-[10px] font-black rounded-full px-2 py-0.5">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>

            <p className="font-bold text-sm text-foreground">{order.businesses?.company_name || "Merchant Store"}</p>

            <p className="text-xs font-black text-primary mt-1.5">
              {items.length} item{items.length !== 1 ? "s" : ""} • ₦{Number(order.total).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => setSelectedOrder(order)} 
              className="rounded-xl text-xs font-bold h-8 px-3"
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View
            </Button>
          </div>
        </div>

        <EscrowTimeline status={status} />

        {/* Action Prompt for Shipped item confirmation */}
        {canConfirmOrder(order) && customer && (
          <div className="mt-3 pt-3 border-t border-border/20">
            <OrderConfirmation
              orderId={order.id}
              businessId={order.business_id}
              customerId={customer.id}
              orderNumber={order.id.slice(0, 8).toUpperCase()}
              onConfirmed={() => queryClient.invalidateQueries({ queryKey: ["customer-orders"] })}
            />
          </div>
        )}
      </div>
    );
  };

  const activeOrdersCount = useMemo(() => filterOrders("all").length, [orders]);
  const inProgressOrdersCount = useMemo(() => filterOrders("active").length, [orders]);
  const completedOrdersCount = useMemo(() => filterOrders("completed").length, [orders]);
  const cancelledOrdersCount = useMemo(() => filterOrders("cancelled").length, [orders]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-foreground">My Orders</h1>
            <p className="text-xs text-muted-foreground">Track your product orders, delivery updates, and confirm receipt</p>
          </div>
          <div className="w-full sm:w-72">
            <input 
              className="flex h-10 w-full rounded-2xl border border-border/25 bg-muted/30 px-3.5 py-2 text-xs focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
              placeholder="Search tracking or Order ID..."
              value={trackingSearch}
              onChange={(e) => setTrackingSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto gap-2 p-1 border-b border-border/15 pb-2 mb-4 h-auto bg-transparent">
            <TabsTrigger value="all" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              All Active ({activeOrdersCount})
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              In Transit ({inProgressOrdersCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
              Completed ({completedOrdersCount})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs text-muted-foreground">
              Cancelled ({cancelledOrdersCount})
            </TabsTrigger>
          </TabsList>

          {["all", "active", "completed", "cancelled"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="dashboard-card animate-pulse h-36 rounded-3xl" />
                  ))}
                </div>
              ) : filterOrders(tab).length === 0 ? (
                <div className="bg-card/50 border border-border/20 rounded-3xl p-12 text-center space-y-3">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                  <h3 className="font-bold text-sm text-foreground">
                    {tab === "cancelled" ? "No cancelled orders" : "No orders found"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {tab === "cancelled"
                      ? "Cancelled orders will appear here."
                      : "Your purchase orders will appear here once placed."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filterOrders(tab).map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ORDER DETAILS DIALOG */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-card border border-border/20 text-left">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/15">
                <div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase">Business</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedOrder.businesses?.company_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase">Order Number</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
                {selectedOrder.tracking_number && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-[10px] font-bold uppercase">Tracking Number</p>
                    <p className="font-mono font-bold text-primary mt-0.5">{selectedOrder.tracking_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase">Status</p>
                  <Badge variant={statusConfig[selectedOrder.status as OrderStatus].variant} className="mt-1">
                    {statusConfig[selectedOrder.status as OrderStatus].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] font-bold uppercase">Total</p>
                  <p className="font-black text-sm text-primary mt-0.5">₦{Number(selectedOrder.total).toLocaleString()}</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Items</p>
                <div className="divide-y divide-border/10 rounded-2xl border border-border/15 bg-muted/10 p-2">
                  {((selectedOrder.items as unknown as OrderItem[]) || []).map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="text-muted-foreground ml-1.5 font-mono">x{item.quantity}</span>
                      </div>
                      <span className="font-black text-foreground">₦{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Receipt Button */}
              {canConfirmOrder(selectedOrder) && customer && (
                <div className="pt-3 border-t border-border/15">
                  <OrderConfirmation
                    orderId={selectedOrder.id}
                    businessId={selectedOrder.business_id}
                    customerId={customer.id}
                    orderNumber={selectedOrder.id.slice(0, 8).toUpperCase()}
                    onConfirmed={() => {
                      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
                      setSelectedOrder(null);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
