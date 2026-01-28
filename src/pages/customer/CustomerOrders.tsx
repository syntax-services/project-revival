import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomer, useCustomerOrders } from "@/hooks/useCustomer";
import { Package, Clock, CheckCircle, Truck, XCircle, Eye } from "lucide-react";
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
import { useState } from "react";
import { OrderConfirmation } from "@/components/orders/OrderConfirmation";
import { useQueryClient } from "@tanstack/react-query";

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

export default function CustomerOrders() {
  const { data: customer } = useCustomer();
  const { data: orders = [], isLoading } = useCustomerOrders(customer?.id);
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const queryClient = useQueryClient();

  const filterOrders = (status: string) => {
    if (status === "all") return orders;
    if (status === "active") return orders.filter(o => ["pending", "confirmed", "processing", "shipped"].includes(o.status));
    if (status === "completed") return orders.filter(o => o.status === "delivered");
    return orders.filter(o => o.status === status);
  };

  // Check if order can be confirmed (shipped status)
  const canConfirmOrder = (order: typeof orders[0]) => {
    return order.status === "shipped";
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
              {order.order_number} • {items.length} item{items.length !== 1 ? "s" : ""} • ₦{Number(order.total).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canConfirmOrder(order) && customer && (
              <OrderConfirmation
                orderId={order.id}
                businessId={order.business_id}
                customerId={customer.id}
                orderNumber={order.order_number}
                onConfirmed={() => {
                  queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
                  setSelectedOrder(null);
                }}
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Orders</h1>
          <p className="mt-1 text-muted-foreground">Track your product orders and confirm deliveries</p>
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
                  <p className="font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedOrder.status as OrderStatus].variant}>
                    {statusConfig[selectedOrder.status as OrderStatus].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">₦{Number(selectedOrder.total).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivery Method</p>
                  <p className="font-medium capitalize">{selectedOrder.delivery_method}</p>
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
                    orderNumber={selectedOrder.order_number}
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