import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness, useBusinessOrders } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Clock, CheckCircle, Truck, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
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

export default function BusinessOrders() {
  const { data: business } = useBusiness();
  const { data: orders = [], isLoading } = useBusinessOrders(business?.id);
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleConfirmReturn = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc("confirm_order_return", {
        p_order_id: orderId,
        p_actor_type: 'business'
      });
      if (error) throw error;
      toast.success("Return receipt confirmed! Customer refunded successfully.");
      queryClient.invalidateQueries({ queryKey: ["business-orders"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm return");
    }
  };

  const [trackingInput, setTrackingInput] = useState("");

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === "confirmed") updateData.confirmed_at = new Date().toISOString();
      if (newStatus === "shipped") {
        updateData.shipped_at = new Date().toISOString();
        if (trackingInput.trim()) {
          updateData.tracking_number = trackingInput.trim();
        }
      }
      if (newStatus === "delivered") updateData.delivered_at = new Date().toISOString();
      if (newStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success(`Order status updated to ${statusConfig[newStatus].label}`);
      queryClient.invalidateQueries({ queryKey: ["business-orders"] });
      setSelectedOrder(null);
    } catch (error) {
      toast.error("Failed to update order status");
    } finally {
      setUpdating(false);
    }
  };

  const filterOrders = (status: string) => {
    if (status === "all") return orders;
    if (status === "pending") return orders.filter(o => o.status === "pending" || o.status === "confirmed");
    if (status === "active") return orders.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status));
    return orders.filter(o => o.status === status);
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
    const config = statusConfig[status] || statusConfig.pending;
    const StatusIcon = config.icon;
    const items = (order.items as unknown as OrderItem[]) || [];

    return (
      <div className="dashboard-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</span>
              <Badge variant={config.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""} • {'\u20A6'}{Number(order.total).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
        <EscrowTimeline status={status} />
        
        {/* Merchant Return Confirmation UI Block */}
        {order.satisfaction_status === "unsatisfied" && (
          <div className="mt-3.5 pt-3.5 border-t border-border/40 space-y-2 text-left text-xs">
            <p className="font-semibold text-amber-500 flex items-center gap-1.5">
              ⚠️ Shopper Rejected Product (Escrow Locked)
            </p>
            {order.return_status === "requested" && (
              <div className="space-y-1.5 text-slate-400">
                {!order.return_confirmed_by_business ? (
                  <>
                    <p>Collect the product physically from the customer, then click below to confirm receipt:</p>
                    <Button 
                      size="sm"
                      onClick={() => handleConfirmReturn(order.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-8 px-3.5 mt-1"
                    >
                      Confirm Return Received
                    </Button>
                  </>
                ) : (
                  <p className="text-indigo-400 font-semibold flex items-center gap-1">
                    ✓ You confirmed return receipt. Waiting for shopper to confirm return dispatch...
                  </p>
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
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="mt-1 text-muted-foreground">Manage incoming product orders</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="pending">New/Pending ({filterOrders("pending").length})</TabsTrigger>
            <TabsTrigger value="active">In Progress ({filterOrders("active").length})</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({filterOrders("delivered").length})</TabsTrigger>
          </TabsList>

          {["all", "pending", "active", "delivered"].map((tab) => (
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
                    {tab === "pending" ? "No pending orders to process" : "Orders will appear here"}
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
            <DialogTitle>Order #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedOrder.status as OrderStatus]?.variant || "secondary"}>
                    {statusConfig[selectedOrder.status as OrderStatus]?.label || selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{'\u20A6'}{Number(selectedOrder.total).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
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

              {selectedOrder.delivery_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedOrder.delivery_notes}</p>
                </div>
              )}

              {selectedOrder.tracking_number && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                  <p className="font-medium text-primary">{selectedOrder.tracking_number}</p>
                </div>
              )}

              {!["delivered", "cancelled", "refunded"].includes(selectedOrder.status) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Update Status</p>
                  
                  {selectedOrder.status === "processing" && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Add Tracking Number (Optional)</p>
                      <input 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="e.g. TRK-12345678"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                      />
                    </div>
                  )}

                  <Select
                    onValueChange={(value) => updateOrderStatus(selectedOrder.id, value as OrderStatus)}
                    disabled={updating}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOrder.status === "pending" && (
                        <>
                          <SelectItem value="confirmed">Confirm Order</SelectItem>
                          <SelectItem value="cancelled">Cancel Order</SelectItem>
                        </>
                      )}
                      {selectedOrder.status === "confirmed" && (
                        <>
                          <SelectItem value="processing">Start Processing</SelectItem>
                          <SelectItem value="cancelled">Cancel Order</SelectItem>
                        </>
                      )}
                      {selectedOrder.status === "processing" && (
                        <>
                          <SelectItem value="shipped">Mark as Shipped</SelectItem>
                        </>
                      )}
                      {selectedOrder.status === "shipped" && (
                        <SelectItem value="delivered">Mark as Delivered</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}