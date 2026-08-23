/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";
import { playOrderChime } from "@/hooks/useAudioSignals";

interface AdminOrdersTabProps {
  orders: any[];
  loadingOrders: boolean;
  refetchOrders: () => void;
}

export function AdminOrdersTab({
  orders,
  loadingOrders,
  refetchOrders,
}: AdminOrdersTabProps) {
  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order status updated!");
      refetchOrders();
    },
    onError: (err: any) => {
      toast.error("Failed to update order: " + err.message);
    }
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const { data, error } = await supabase.rpc("confirm_order_delivery", {
        p_order_id: orderId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      playOrderChime();
      toast.success("Order marked as delivered! Funds moved to business wallet ");
      refetchOrders();
    },
    onError: (err: any) => {
      toast.error("Failed to confirm delivery: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Orders ({orders?.length || 0})</CardTitle>
          <CardDescription>Monitor and manage customer orders</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-12">
              <InterlockingLoader size="md" label="Loading orders..." />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tracking</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders?.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.id?.slice(0, 8).toUpperCase()}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(order.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{order.customers?.profiles?.full_name || 'Unknown'}</TableCell>
                          <TableCell>{order.businesses?.company_name}</TableCell>
                          <TableCell>₦{Number(order.total).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === 'delivered' ? 'default' :
                                order.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                            }>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono">{order.tracking_number || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select
                                value={order.status}
                                onValueChange={(val) => updateOrderStatusMutation.mutate({ orderId: order.id, status: val })}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Awaiting Payment</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="processing">Processing</SelectItem>
                                  <SelectItem value="shipped">Shipped</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="refunded">Refunded</SelectItem>
                                </SelectContent>
                              </Select>
                              {order.status === 'shipped' && (
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-green-600 hover:bg-green-700"
                                  onClick={() => confirmDeliveryMutation.mutate({ orderId: order.id })}
                                >
                                  Deliver
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {orders?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No orders found</p>
                )}
                {orders?.map((order: any) => (
                  <div key={order.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold">{order.id?.slice(0, 8).toUpperCase()}</span>
                      <Badge variant={
                        order.status === 'delivered' ? 'default' :
                          order.status === 'cancelled' ? 'destructive' :
                            'secondary'
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="text-muted-foreground">Customer:</span> {order.customers?.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Business:</span> {order.businesses?.company_name}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Tracking:</span> <span className="font-mono">{order.tracking_number || '-'}</span></p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold">₦{Number(order.total).toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Select
                        value={order.status}
                        onValueChange={(val) => updateOrderStatusMutation.mutate({ orderId: order.id, status: val })}
                      >
                        <SelectTrigger className="h-8 flex-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Awaiting Payment</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                      {order.status === 'shipped' && (
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => confirmDeliveryMutation.mutate({ orderId: order.id })}
                        >
                          Deliver
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
