const fs = require('fs');
const path = 'src/pages/business/BusinessBoost.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update imports if needed
if (!content.includes('useState')) {
  content = content.replace('import React from "react";', 'import React, { useState } from "react";');
}

// 1. Add state for selected plan inside BusinessBoost component
const componentStart = 'export default function BusinessBoost() {';
if (!content.includes('const [selectedPlan, setSelectedPlan] =')) {
  content = content.replace(componentStart, componentStart + '\n  const [selectedPlan, setSelectedPlan] = React.useState<"weekend"|"weekly"|"monthly">("weekend");');
}

// 2. Define pricing dictionary
const plansConst = 
  const plans = {
    weekend: { price: 1500, days: 3, label: "Weekend Boost" },
    weekly: { price: 3500, days: 7, label: "Weekly Boost" },
    monthly: { price: 10000, days: 30, label: "Monthly Boost" }
  };
;
if (!content.includes('const plans = {')) {
  content = content.replace('const handleBoosterPayment = async () => {', plansConst + '\n  const handleBoosterPayment = async () => {');
}

// 3. Update the handleBoosterPayment logic to use selectedPlan
content = content.replace('total: boosterPrice,', 'total: plans[selectedPlan].price,');
content = content.replace('amount: boosterPrice,', 'amount: plans[selectedPlan].price,');
content = content.replace('price: boosterPrice,', 'price: plans[selectedPlan].price,');
content = content.replace('productId: "booster-30d",', 'productId: \ooster-\d\,');
content = content.replace('name: "Visibility Booster (30 Days)",', 'name: \Visibility Booster (\)\,');

// 4. Update activateBoost logic
content = content.replace('expiresAt.setDate(expiresAt.getDate() + 30);', 'expiresAt.setDate(expiresAt.getDate() + plans[selectedPlan].days);');
content = content.replace('amount_paid: boosterPrice,', 'amount_paid: plans[selectedPlan].price,');

// 5. Replace the single pricing UI with a selection UI
const oldPricingUI =               {/* Dynamic Pricing Display */}
              <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Booster Fee</p>
                  <p className="text-2xl font-extrabold text-foreground mt-1.5">
                    ,{boosterPrice.toLocaleString()}
                    <span className="text-xs font-semibold text-muted-foreground"> / month</span>
                  </p>
                </div>
                
                <Button 
                  onClick={handleBoosterPayment}
                  disabled={loadingPayment}
                  className="rounded-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold text-xs px-5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                >
                  {loadingPayment ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-white" />
                      Initializing...
                    </>
                  ) : (
                    "Boost Now"
                  )}
                </Button>
              </div>;

const newPricingUI =               {/* Plan Selection */}
              <div className="border-t border-border/20 pt-4 space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Select Plan</p>
                
                <div className="grid gap-2">
                  {[
                    { id: "weekend", label: "Weekend Boost", price: 1500, duration: "3 Days" },
                    { id: "weekly", label: "Weekly Boost", price: 3500, duration: "7 Days" },
                    { id: "monthly", label: "Monthly Boost", price: 10000, duration: "30 Days" }
                  ].map(plan => (
                    <div 
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id as any)}
                      className={\lex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer \\}
                    >
                      <div>
                        <p className={\ont-bold text-sm \\}>
                          {plan.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{plan.duration}</p>
                      </div>
                      <p className="text-sm font-extrabold text-foreground">
                        ?{plan.price.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={handleBoosterPayment}
                    disabled={loadingPayment}
                    className="w-full rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white font-bold text-sm py-5 shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                  >
                    {loadingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                        Processing...
                      </>
                    ) : (
                      \Activate \ (?\)\
                    )}
                  </Button>
                </div>
              </div>;

content = content.replace(oldPricingUI, newPricingUI);

fs.writeFileSync(path, content);
console.log("Updated BusinessBoost");
