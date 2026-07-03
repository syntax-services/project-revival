import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomer, useCustomerOrders } from "@/hooks/useCustomer";
import { Package, Clock, CheckCircle, Truck, XCircle, Eye, Star } from "lucide-react";
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
import { useState, useEffect } from "react";
import { OrderConfirmation } from "@/components/orders/OrderConfirmation";
import { PostPurchaseReview } from "@/components/reviews/PostPurchaseReview";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Awaiting Payment", icon: Clock, variant: "secondary" },
  confirmed: { label: "Confirmed", icon: CheckCircle, variant: "default" },
  processing: { label: "Processing", icon: Package, variant: "default" },
  shipped: { label: "Shipped", icon: Truck, variant: "default" },
  delivered: { label: "Delivered", icon: CheckCircle, variant: "default" },
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
      toast.success(satisfied ? "Order confirmed as satisfied! 🚀" : "Order marked as unsatisfied. Return flow initiated.");
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
    if (status === "active") {
      filtered = orders.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status));
    } else if (status === "completed") {
      filtered = orders.filter(o => o.status === "delivered");
    } else if (status !== "all") {
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

  // Check if order can be confirmed (shipped status)
  const canConfirmOrder = (order: typeof orders[0]) => {
    return order.status === "shipped";
  };

  const EscrowTimeline = ({ status }: { status: OrderStatus }) => {
    const isUnpaid = status === "pending";
    const isCancelled = ["cancelled", "refunded"].includes(status);
    
    if (isCancelled) {
      return (
        <div className="mt-3.5 p-2 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
          <XCircle className="h-4 w-4 shrink-0" />
          Escrow Transaction Cancelled / Refunded
        </div>
      );
    }

    const steps = [
      { id: 1, label: "Unpaid ⏳", active: true, done: !isUnpaid },
      { id: 2, label: "Escrowed 🔒", active: !isUnpaid, done: ["confirmed", "processing", "shipped", "delivered"].includes(status) },
      { id: 3, label: "Dispatched 🚚", active: ["shipped", "delivered"].includes(status), done: status === "delivered" },
      { id: 4, label: "Settle 🔓", active: status === "delivered", done: status === "delivered" },
    ];

    return (
      <div className="mt-4 pt-3.5 border-t border-border/40 space-y-2.5">
        <div className="flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold tracking-widest px-1">
          <span>Escrow Protection System</span>
          <span className={isUnpaid ? "text-amber-500 font-extrabold animate-pulse" : "text-green-500 font-extrabold"}>
            {isUnpaid ? "Awaiting Deposit" : "Protected 🔒"}
          </span>
        </div>
        <div className="relative flex items-center justify-between w-full px-2">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 h-0.5 bg-muted -translate-y-2 z-0">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
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
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all duration-300 ${
                    isCompleted ? "bg-green-500 border-green-600 text-white shadow-sm shadow-green-500/20" :
                    isHighlighted ? "bg-background border-green-500 text-green-500 ring-2 ring-green-500/10" :
                    "bg-background border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : step.id}
                </div>
                <span className={`text-[9px] font-bold mt-1.5 transition-colors ${isHighlighted ? "text-foreground font-extrabold" : "text-muted-foreground"}`}>
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
    const config = statusConfig[status];
    const StatusIcon = config.icon;
    const items = (order.items as unknown as OrderItem[]) || [];

    return (
      <div className="dashboard-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-foreground">{order.businesses?.company_name || "Order"}</span>
              <Badge variant={config.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.id.slice(0, 8).toUpperCase()} • {items.length} item{items.length !== 1 ? "s" : ""} • {'\u20A6'}{Number(order.total).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Show review button for delivered orders */}
            {order.status === "delivered" && order.businesses && (
              <PostPurchaseReview
                orderId={order.id}
                businessId={order.business_id}
                businessName={order.businesses.company_name || "Business"}
              />
            )}
            {order.status === "pending" && (
              <Button 
                size="sm" 
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={async () => {
                   const { data, error } = await supabase.functions.invoke("initialize-payment", {
                     body: { 
                       orderId: order.id,
                       email: user?.email, // Assuming user is available from context
                       total: order.total
                     }
                   });
                   if (data?.authorization_url) {
                     window.location.assign(data.authorization_url);
                   } else {
                     toast.error("Failed to resume payment");
                   }
                }}
              >
                Pay Now
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <EscrowTimeline status={status} />
        
        {/* Customer Satisfaction Escrow UI Block */}
        {(order.status === "shipped" || order.status === "delivered") && (
          <div className="mt-3.5 pt-3.5 border-t border-border/40 space-y-2 text-left">
            {order.satisfaction_status === "pending" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">
                  Have you received this order and are you satisfied with the product?
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleSatisfaction(order.id, true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl h-8 px-3.5"
                  >
                    Yes, satisfied
                  </Button>
                  <Button 
                    size="sm"
                    variant="destructive"
                    onClick={() => handleSatisfaction(order.id, false)}
                    className="text-xs font-bold rounded-xl h-8 px-3.5"
                  >
                    No, reject item
                  </Button>
                </div>
              </div>
            )}

            {order.satisfaction_status === "unsatisfied" && (
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-amber-500 flex items-center gap-1.5">
                  ⚠️ Product Rejected (Escrow Funds Locked)
                </p>
                {order.return_status === "requested" && (
                  <div className="space-y-1.5 text-slate-400">
                    {!order.return_confirmed_by_shopper ? (
                      <>
                        <p>Please return the product physically to the merchant. Once returned, confirm below:</p>
                        <Button 
                          size="sm"
                          onClick={() => handleConfirmReturn(order.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-8 px-3.5 mt-1"
                        >
                          Confirm Returned
                        </Button>
                      </>
                    ) : (
                      <p className="text-indigo-400 font-semibold flex items-center gap-1">
                        ✓ You confirmed the return. Waiting for merchant to confirm receipt...
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">My Orders</h1>
            <p className="mt-1 text-muted-foreground">Track your product orders and confirm deliveries</p>
          </div>
          <div className="w-full sm:w-72">
            <input 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search tracking number or Order ID..."
              value={trackingSearch}
              onChange={(e) => setTrackingSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({filterOrders("active").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterOrders("completed").length})</TabsTrigger>
          </TabsList>

          {["all", "active", "completed"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="dashboard-card animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filterOrders(tab).length === 0 ? (
                <div className="dashboard-card text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-medium text-foreground">No orders</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your orders will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterOrders(tab).map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Business</p>
                  <p className="font-medium">{selectedOrder.businesses?.company_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Number</p>
                  <p className="font-medium">{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
                {selectedOrder.tracking_number && (
                  <div>
                    <p className="text-muted-foreground">Tracking Number</p>
                    <p className="font-medium text-primary">{selectedOrder.tracking_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedOrder.status as OrderStatus].variant}>
                    {statusConfig[selectedOrder.status as OrderStatus].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{'\u20A6'}{Number(selectedOrder.total).toLocaleString()}</p>
                </div>
                 <div>
                   <p className="text-muted-foreground">Delivery</p>
                   <p className="font-medium capitalize">{selectedOrder.delivery_address ? "Delivery" : "Pickup"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ordered</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>

              {selectedOrder.delivery_address && (
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Address</p>
                  <p className="text-sm font-medium">{selectedOrder.delivery_address}</p>
                </div>
              )}

              {/* Delivery Info */}
              {selectedOrder.delivery_method === "delivery" && (
                <div className="bg-muted/30 p-3 rounded-2xl border border-border/10 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Delivery Details</p>
                    <Badge variant="outline" className="scale-90 font-black">
                      Store Delivery
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This order will be delivered by the store's default delivery method.
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="space-y-2">
                  {((selectedOrder.items as unknown as OrderItem[]) || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{'\u20A6'}{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Timeline */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Timeline</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Ordered</span>
                    <span>{format(new Date(selectedOrder.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  {selectedOrder.confirmed_at && (
                    <div className="flex justify-between">
                      <span>Confirmed</span>
                      <span>{format(new Date(selectedOrder.confirmed_at), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                  {selectedOrder.shipped_at && (
                    <div className="flex justify-between">
                      <span>Shipped</span>
                      <span>{format(new Date(selectedOrder.shipped_at), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                  {selectedOrder.delivered_at && (
                    <div className="flex justify-between">
                      <span>Delivered</span>
                      <span>{format(new Date(selectedOrder.delivered_at), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm Receipt Button in Dialog */}
              {canConfirmOrder(selectedOrder) && customer && (
                <div className="pt-4 border-t">
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