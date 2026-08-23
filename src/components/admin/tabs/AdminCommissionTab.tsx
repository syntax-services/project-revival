/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AdminCommissionTabProps {
  products: any[];
  refetchProducts: () => void;
}

function ProductCommissionCard({ product, onUpdate, onDelete, onToggleImageVerified, isLoading }: any) {
  const [commission, setCommission] = useState(product.commission_percent || 10);
  const [isRare, setIsRare] = useState(product.is_rare || false);

  const hasChanges = commission !== product.commission_percent || isRare !== product.is_rare;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        {/* Product Image preview */}
        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/40 shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground">No Image</span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{product.name}</p>
            {product.is_rare && <Badge variant="destructive">Rare</Badge>}
            {product.image_verified === false ? (
              <Badge variant="destructive" className="scale-90 font-bold uppercase tracking-wider text-[8px] px-1.5 py-0.25">Rejected</Badge>
            ) : (
              <Badge className="scale-90 font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-[8px] px-1.5 py-0.25 text-white">Approved</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {product.businesses?.company_name} • ₦{Number(product.price || 0).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {product.image_verified === false ? (
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 h-8 text-[11px] font-semibold"
            onClick={() => onToggleImageVerified(true)}
            disabled={isLoading}
          >
            Approve Image
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive h-8 text-[11px] font-semibold"
            onClick={() => onToggleImageVerified(false)}
            disabled={isLoading}
          >
            Reject Image
          </Button>
        )}
        <Input
          type="number"
          min={1}
          max={20}
          value={commission}
          onChange={(e) => setCommission(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-14 h-8 text-center text-sm"
        />
        <span className="text-xs">%</span>
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={isRare}
            onChange={(e) => setIsRare(e.target.checked)}
            className="rounded"
          />
          Rare
        </label>
        <Button size="sm" onClick={() => onUpdate(commission, isRare)} disabled={isLoading || !hasChanges}>
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={isLoading}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 rounded-xl"
          title="Delete Product Listing"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </Button>
      </div>
    </div>
  );
}

export function AdminCommissionTab({
  products,
  refetchProducts,
}: AdminCommissionTabProps) {
  // Update product commission mutation
  const updateCommissionMutation = useMutation({
    mutationFn: async ({ productId, commission, isRare }: { productId: string; commission: number; isRare: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({
          commission_percent: commission,
          is_rare: isRare
        })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product settings updated!");
      refetchProducts();
    },
    onError: (err: any) => {
      toast.error("Failed to update commission: " + err.message);
    }
  });

  // Toggle product image verification
  const toggleProductImageVerificationMutation = useMutation({
    mutationFn: async ({ productId, verified }: { productId: string; verified: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ image_verified: verified })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.verified ? "Product image approved! " : "Product image rejected/hidden. ");
      refetchProducts();
    },
    onError: (err: any) => {
      toast.error("Failed to update image verification: " + err.message);
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted successfully! ");
      refetchProducts();
    },
    onError: (err: any) => {
      toast.error("Failed to delete product: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Product Commission ({products?.length || 0})</CardTitle>
          <CardDescription>Set commission rates (1-20%)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {products?.map((product: any) => (
                <ProductCommissionCard
                  key={product.id}
                  product={product}
                  onUpdate={(commission: number, isRare: boolean) =>
                    updateCommissionMutation.mutate({
                      productId: product.id,
                      commission,
                      isRare
                    })
                  }
                  onToggleImageVerified={(verified: boolean) =>
                    toggleProductImageVerificationMutation.mutate({
                      productId: product.id,
                      verified
                    })
                  }
                  onDelete={() => {
                    if (confirm(`Are you sure you want to delete product "${product.name}"? This cannot be undone.`)) {
                      deleteProductMutation.mutate(product.id);
                    }
                  }}
                  isLoading={updateCommissionMutation.isPending || deleteProductMutation.isPending || toggleProductImageVerificationMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
