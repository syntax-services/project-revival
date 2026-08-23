import { useState, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness, useBusinessOrders } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
 Package, Clock, CheckCircle2, Truck, XCircle, Eye, 
 MapPin, Phone, ArrowUpRight, ShieldCheck, CheckCheck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
 pending: { label: "Pending", icon: Clock, variant: "secondary" },
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

export default function BusinessOrders() {
  usePageMeta({
    title: "Manage Orders & Deliveries",
    description: "Process incoming orders, track delivery milestones, and confirm item handoffs for payout releases.",
    keywords: ["merchant orders","delivery management","escrow payouts"],
    });

 const { data: business } = useBusiness();
 const { data: orders = [], isLoading } = useBusinessOrders(business?.id);
 const queryClient = useQueryClient();
 const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
 const [updating, setUpdating] = useState(false);
 const [trackingInput, setTrackingInput] = useState("");

 const handleConfirmReturn = async (orderId: string) => {
 try {
 const { error } = await supabase.rpc("confirm_order_return", {
 p_order_id: orderId,
 p_actor_type: "business"
 });
 if (error) throw error;
 toast.success("Return receipt confirmed! Customer refunded successfully.");
 queryClient.invalidateQueries({ queryKey: ["business-orders"] });
 } catch (err: any) {
 toast.error(err.message || "Failed to confirm return");
 }
 };

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
 } catch {
 toast.error("Failed to update order status");
 } finally {
 setUpdating(false);
 }
 };

 // Filter orders strictly separating active orders from cancelled orders
 const filterOrders = (status: string) => {
 if (status === "all") {
 // Exclude cancelled and refunded orders from main/active view
 return orders.filter(o => !["cancelled", "refunded"].includes(o.status));
 }
 if (status === "pending") {
 return orders.filter(o => o.status === "pending" || o.status === "confirmed");
 }
 if (status === "active") {
 return orders.filter(o => ["processing", "shipped"].includes(o.status));
 }
 if (status === "delivered") {
 return orders.filter(o => o.status === "delivered");
 }
 if (status === "cancelled") {
 // Cancelled tab contains cancelled AND refunded orders ONLY
 return orders.filter(o => ["cancelled", "refunded"].includes(o.status));
 }
 return orders.filter(o => o.status === status);
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
 {isCompleted ? "" : step.id}
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

 const customerName = order.customerProfile?.full_name || "Customer";
 const customerPhone = order.customerProfile?.phone;
 const deliveryLocation = order.delivery_address || order.customer?.street_address || order.customer?.location || "Pickup at store";

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
 {status === "pending" && (
 <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] font-bold">
 Buyer Initiated
 </Badge>
 )}
 </div>

 {/* Buyer Profile & Delivery Info */}
 <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 space-y-1 text-xs mt-2">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground truncate">{customerName}</span>
 {customerPhone && (
 <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
 <Phone className="h-3 w-3" /> {customerPhone}
 </span>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
 <MapPin className="h-3 w-3 text-primary shrink-0" /> {deliveryLocation}
 </p>
 </div>

 <p className="text-xs font-black text-primary mt-2">
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
 {status === "pending" && (
 <Button 
 size="sm" 
 onClick={() => updateOrderStatus(order.id, "processing")}
 className="rounded-xl text-[10px] font-black h-8 px-3 bg-primary text-primary-foreground"
 >
 Sort Package
 </Button>
 )}
 </div>
 </div>

 <EscrowTimeline status={status} />
 
 {/* Merchant Return Confirmation UI Block */}
 {order.satisfaction_status === "unsatisfied" && (
 <div className="mt-3 pt-3 border-t border-border/20 space-y-2 text-left text-xs">
 <p className="font-bold text-amber-500 flex items-center gap-1.5">
 Shopper Rejected Product (Escrow Locked)
 </p>
 {order.return_status === "requested" && (
 <div className="space-y-1.5 text-muted-foreground">
 {!order.return_confirmed_by_business ? (
 <>
 <p className="text-[11px]">Collect the product physically from the customer, then click below to confirm receipt:</p>
 <Button 
 size="sm"
 onClick={() => handleConfirmReturn(order.id)}
 className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-8 px-3.5 mt-1"
 >
 Confirm Return Received
 </Button>
 </>
 ) : (
 <p className="text-indigo-400 font-bold text-xs flex items-center gap-1">
 You confirmed return receipt. Waiting for shopper confirmation...
 </p>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 );
 };

 const activeOrdersCount = useMemo(() => filterOrders("all").length, [orders]);
 const pendingOrdersCount = useMemo(() => filterOrders("pending").length, [orders]);
 const inProgressOrdersCount = useMemo(() => filterOrders("active").length, [orders]);
 const deliveredOrdersCount = useMemo(() => filterOrders("delivered").length, [orders]);
 const cancelledOrdersCount = useMemo(() => filterOrders("cancelled").length, [orders]);

 return (
 <DashboardLayout>
 <div className="max-w-5xl mx-auto space-y-6 pb-24 text-left">
 <div>
 <h1 className="text-xl font-black text-foreground">Orders</h1>
 <p className="text-xs text-muted-foreground">Manage incoming product orders, dispatch, and escrow fulfillment</p>
 </div>

 <Tabs defaultValue="all" className="w-full">
 <TabsList className="w-full justify-start overflow-x-auto gap-2 p-1 border-b border-border/15 pb-2 mb-4 h-auto bg-transparent">
 <TabsTrigger value="all" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
 All Active ({activeOrdersCount})
 </TabsTrigger>
 <TabsTrigger value="pending" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
 New/Pending ({pendingOrdersCount})
 </TabsTrigger>
 <TabsTrigger value="active" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
 In Progress ({inProgressOrdersCount})
 </TabsTrigger>
 <TabsTrigger value="delivered" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs">
 Delivered ({deliveredOrdersCount})
 </TabsTrigger>
 <TabsTrigger value="cancelled" className="rounded-xl px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-card shadow-xs text-muted-foreground">
 Cancelled ({cancelledOrdersCount})
 </TabsTrigger>
 </TabsList>

 {["all", "pending", "active", "delivered", "cancelled"].map((tab) => (
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
 {tab === "pending"
 ? "No pending orders awaiting sorting or payment confirmation."
 : tab === "cancelled"
 ? "Cancelled and refunded orders will be safely archived here."
 : "Orders will appear here once customers place their requests."}
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
 <DialogTitle className="text-base font-bold">
 Order #{selectedOrder?.id.slice(0, 8).toUpperCase()}
 </DialogTitle>
 </DialogHeader>
 {selectedOrder && (
 <div className="space-y-4 text-xs">
 <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/30 border border-border/15">
 <div>
 <p className="text-muted-foreground text-[10px] font-bold uppercase">Status</p>
 <Badge variant={statusConfig[selectedOrder.status as OrderStatus]?.variant || "secondary"} className="mt-1">
 {statusConfig[selectedOrder.status as OrderStatus]?.label || selectedOrder.status}
 </Badge>
 </div>
 <div>
 <p className="text-muted-foreground text-[10px] font-bold uppercase">Total</p>
 <p className="font-black text-sm text-primary mt-1">₦{Number(selectedOrder.total).toLocaleString()}</p>
 </div>
 <div>
 <p className="text-muted-foreground text-[10px] font-bold uppercase">Placed On</p>
 <p className="font-semibold text-foreground mt-0.5">{format(new Date(selectedOrder.created_at), "MMM d, yyyy")}</p>
 </div>
 <div>
 <p className="text-muted-foreground text-[10px] font-bold uppercase">Payment Mode</p>
 <p className="font-semibold text-foreground mt-0.5">Direct Escrow Deposit</p>
 </div>
 </div>

 {selectedOrder.delivery_address && (
 <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 space-y-1">
 <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1">
 <MapPin className="h-3 w-3 text-primary" /> Delivery Destination
 </p>
 <p className="font-semibold text-foreground">{selectedOrder.delivery_address}</p>
 </div>
 )}

 {/* Order Items */}
 <div className="space-y-2">
 <p className="text-[10px] text-muted-foreground font-bold uppercase">Purchased Items</p>
 <div className="divide-y divide-border/10 rounded-2xl border border-border/15 bg-muted/10 p-2">
 {((selectedOrder.items as unknown as OrderItem[]) || []).map((item, idx) => (
 <div key={idx} className="py-2 flex justify-between items-center text-xs">
 <div>
 <span className="font-bold text-foreground">{item.name}</span>
 <span className="text-muted-foreground ml-1.5 font-mono">x{item.quantity}</span>
 </div>
 <span className="font-black text-foreground">₦{Number(item.price * item.quantity).toLocaleString()}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Quick Status Action */}
 {selectedOrder.status !== "cancelled" && selectedOrder.status !== "delivered" && (
 <div className="pt-2 flex justify-end gap-2">
 {selectedOrder.status === "pending" && (
 <Button
 onClick={() => updateOrderStatus(selectedOrder.id, "processing")}
 disabled={updating}
 className="rounded-2xl text-xs font-bold bg-primary text-primary-foreground"
 >
 Mark as In Progress
 </Button>
 )}
 {selectedOrder.status === "processing" && (
 <Button
 onClick={() => updateOrderStatus(selectedOrder.id, "shipped")}
 disabled={updating}
 className="rounded-2xl text-xs font-bold bg-primary text-primary-foreground"
 >
 Mark as Shipped
 </Button>
 )}
 {selectedOrder.status === "shipped" && (
 <Button
 onClick={() => updateOrderStatus(selectedOrder.id, "delivered")}
 disabled={updating}
 className="rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
 >
 Mark as Delivered
 </Button>
 )}
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </DashboardLayout>
 );
}