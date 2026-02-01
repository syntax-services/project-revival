import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Star, ShoppingCart, Crown } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price?: number | null;
  business_id: string;
  is_featured?: boolean;
  is_rare?: boolean;
  in_stock?: boolean;
  business?: {
    id: string;
    company_name: string;
    reputation_score?: number | null;
    verification_tier?: string;
  };
}

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Sort featured products first
  const sortedProducts = [...products].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return 0;
  });

  const handleAddToCart = async (product: Product) => {
    if (!product.in_stock) {
      toast.error("This product is out of stock");
      return;
    }
    
    addToCart.mutate({
      productId: product.id,
      businessId: product.business_id,
      quantity: 1,
    });
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 font-medium">No products found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedProducts.map((product) => (
        <Card
          key={product.id}
          className={`overflow-hidden hover:shadow-lg transition-shadow ${
            product.is_featured ? "ring-2 ring-yellow-500/50" : ""
          }`}
        >
          {/* Product Image */}
          <div
            className="relative h-40 bg-gradient-to-br from-muted to-muted/50 cursor-pointer"
            onClick={() => navigate(`/business/${product.business_id}`)}
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {product.is_featured && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              {product.is_rare && (
                <Badge variant="destructive">Rare</Badge>
              )}
            </div>

            {/* Out of Stock */}
            {!product.in_stock && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Badge variant="secondary">Out of Stock</Badge>
              </div>
            )}
          </div>

          <CardContent className="p-4">
            {/* Product Info */}
            <h3 className="font-medium text-foreground line-clamp-1">{product.name}</h3>
            
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {product.description}
              </p>
            )}

            {/* Price */}
            {product.price && (
              <p className="text-lg font-bold mt-2">₦{product.price.toLocaleString()}</p>
            )}

            {/* Business Info */}
            {product.business && (
              <div className="mt-2 flex items-center gap-2">
                <p
                  className="text-sm text-muted-foreground hover:underline cursor-pointer"
                  onClick={() => navigate(`/business/${product.business_id}`)}
                >
                  {product.business.company_name}
                </p>
                {product.business.reputation_score && product.business.reputation_score > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-foreground text-foreground" />
                    <span className="text-xs">{product.business.reputation_score.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Add to Cart */}
            <Button
              className="w-full mt-3"
              size="sm"
              onClick={() => handleAddToCart(product)}
              disabled={!product.in_stock || addToCart.isPending}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add to Cart
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
