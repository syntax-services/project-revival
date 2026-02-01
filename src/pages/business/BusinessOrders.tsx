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

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === "confirmed") updateData.confirmed_at = new Date().toISOString();
      if (newStatus === "shipped") updateData.shipped_at = new Date().toISOString();
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
    if (status === "active") return orders.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status));
    return orders.filter(o => o.status === status);
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
              <span className="font-medium text-foreground">Order #{order.id.slice(0, 8)}</span>
              <Badge variant={config.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""} • ₦{Number(order.total).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
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
            <TabsTrigger value="pending">Pending ({filterOrders("pending").length})</TabsTrigger>
            <TabsTrigger value="active">Active ({filterOrders("active").length})</TabsTrigger>
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
                  <p className="font-medium">₦{Number(selectedOrder.total).toLocaleString()}</p>
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

              <div>
                <p className="text-sm text-muted-foreground mb-2">Items</p>
                <div className="space-y-2">
                  {((selectedOrder.items as unknown as OrderItem[]) || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span>₦{(item.price * item.quantity).toLocaleString()}</span>
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

              {!["delivered", "cancelled", "refunded"].includes(selectedOrder.status) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Update Status</p>
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