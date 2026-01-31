import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Plus, Minus, Trash2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CartPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    cartItems,
    cartByBusiness,
    cartTotal,
    cartCount,
    isLoading,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const handleCheckout = (businessId: string) => {
    setOpen(false);
    navigate(`/customer/checkout?business=${businessId}`);
  };

  if (isLoading) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {cartCount > 99 ? '99+' : cartCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
            {cartCount > 0 && (
              <Badge variant="secondary">{cartCount} items</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Browse businesses and add items to get started
            </p>
            <Button 
              className="mt-4" 
              onClick={() => {
                setOpen(false);
                navigate("/customer/discover");
              }}
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-6 pb-6">
                {Object.entries(cartByBusiness).map(([businessId, { business, items, total }]) => (
                  <div key={businessId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{business?.company_name}</h4>
                      <span className="text-sm text-muted-foreground">
                        ₦{total.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {items.map((item) => {
                        const name = item.products?.name || item.services?.name || "Item";
                        const price = item.products?.price || item.services?.price_min || 0;
                        const imageUrl = item.products?.image_url || (item.services?.images?.[0] ?? null);

                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={name}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{name}</p>
                              <p className="text-sm text-muted-foreground">
                                ₦{price.toLocaleString()}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity - 1,
                                })}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity.mutate({
                                  itemId: item.id,
                                  quantity: item.quantity + 1,
                                })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFromCart.mutate(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleCheckout(businessId)}
                    >
                      Checkout from {business?.company_name}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="border-t pt-4">
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between font-medium">
                  <span>Total</span>
                  <span>₦{cartTotal.toLocaleString()}</span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => clearCart.mutate()}
                >
                  Clear Cart
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
