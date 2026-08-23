/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";
import { playVerificationChime, playRevokedChime } from "@/hooks/useAudioSignals";
import { usePremiumMail } from "@/hooks/usePremiumMail";

type VerificationTier = 'none' | 'basic' | 'verified' | 'premium' | 'elite';

interface AdminBusinessesTabProps {
  searchTerm: string;
  businesses: any[];
  loadingBusinesses: boolean;
  refetchBusinesses: () => void;
}

export function AdminBusinessesTab({
  searchTerm,
  businesses,
  loadingBusinesses,
  refetchBusinesses,
}: AdminBusinessesTabProps) {
  const { dispatchEmail } = usePremiumMail();

  // Verification tier update mutation
  const updateVerificationTierMutation = useMutation({
    mutationFn: async ({
      businessId,
      tier,
      email,
      fullName,
      companyName,
      userId,
      isRevocation
    }: {
      businessId: string;
      tier: VerificationTier;
      email?: string;
      fullName?: string;
      companyName?: string;
      userId?: string;
      isRevocation?: boolean;
    }) => {
      const { error } = await supabase
        .from("businesses")
        .update({
          verification_tier: tier,
          verified: tier !== 'none'
        })
        .eq("id", businessId);
      if (error) throw error;
      return { tier, email, fullName, companyName, userId, isRevocation };
    },
    onSuccess: (data) => {
      refetchBusinesses();
      if (data.isRevocation) {
        playRevokedChime();
        toast.warning(`Revoked Premium Badge for ${data.companyName || "Merchant"}. Notification sent.`);
        if (data.email) {
          dispatchEmail({
            type: "custom",
            recipientEmail: data.email,
            recipientName: data.fullName || data.companyName || "Merchant",
            recipientType: "business",
            recipientId: data.userId,
            subject: "Security Update: Marketplace Verification Status Notice",
            customTitle: "Verification Status Updated",
            customMessage: `Your merchant account (${data.companyName || "Business"}) has been updated to ${data.tier} status. If you have questions regarding this change, please contact platform administration.`
          });
        }
      } else {
        playVerificationChime();
        toast.success(`Updated verification tier to ${data.tier}! `);
      }
    },
    onError: (err: any) => {
      toast.error("Failed to update verification tier: " + err.message);
    }
  });

  // Business wallet override mutation
  const updateBusinessWalletMutation = useMutation({
    mutationFn: async ({ businessId, availableBalance }: { businessId: string; availableBalance: number }) => {
      const { error } = await supabase
        .from("business_wallets")
        .update({ available_balance: availableBalance, updated_at: new Date().toISOString() })
        .eq("business_id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Wallet balance updated successfully! ");
      refetchBusinesses();
    },
    onError: (err: any) => {
      toast.error("Failed to update wallet: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Business Verification ({businesses?.length || 0})</CardTitle>
          <CardDescription>Manage verification tiers: None → Verified → Premium</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBusinesses ? (
            <div className="flex items-center justify-center py-12">
              <InterlockingLoader size="sm" label="Loading businesses..." />
            </div>
          ) : (
            <>
              {/* Desktop Table Layout */}
              <div className="hidden md:block">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Wallet Balance</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businesses
                        ?.filter((b: any) =>
                          b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((business: any) => (
                          <TableRow key={business.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{business.company_name}</p>
                                <p className="text-xs text-muted-foreground">{business.profiles?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{business.business_type || 'goods'}</Badge>
                            </TableCell>
                            <TableCell>
                              {business.reputation_score ? (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                  <span>{business.reputation_score.toFixed(1)}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={business.location_verified ? "default" : "secondary"}>
                                {business.location_verified ? "Verified" : "Not Verified"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-foreground">
                              ₦{Number(business.business_wallets?.[0]?.available_balance || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <ReputationBadge tier={business.verification_tier || 'none'} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={business.verification_tier || 'none'}
                                  onValueChange={(value: VerificationTier) =>
                                    updateVerificationTierMutation.mutate({
                                      businessId: business.id,
                                      tier: value,
                                      email: business.profiles?.email,
                                      fullName: business.profiles?.full_name,
                                      companyName: business.company_name,
                                      userId: business.user_id,
                                      isRevocation: value !== 'premium' && business.verification_tier === 'premium'
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const currentBal = business.business_wallets?.[0]?.available_balance || 0;
                                    const newVal = prompt(`Override wallet balance for ${business.company_name} (Current: ₦${currentBal.toLocaleString()}):`);
                                    if (newVal !== null) {
                                      const parsedVal = parseFloat(newVal);
                                      if (!isNaN(parsedVal) && parsedVal >= 0) {
                                        updateBusinessWalletMutation.mutate({ businessId: business.id, availableBalance: parsedVal });
                                      } else {
                                        toast.error("Please enter a valid non-negative number.");
                                      }
                                    }
                                  }}
                                  className="h-8 text-xs border-primary/20 hover:bg-primary/5 shrink-0 font-semibold"
                                >
                                  Override 
                                </Button>

                                {business.verification_tier === 'premium' && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs font-bold px-3 shrink-0 h-8"
                                    onClick={() => {
                                      if (confirm(`Are you absolutely sure you want to revoke the Premium Badge for ${business.company_name}? This will demote them to basic verified, play a safety alert chime, and send a security warning email.`)) {
                                        updateVerificationTierMutation.mutate({
                                          businessId: business.id,
                                          tier: 'verified',
                                          email: business.profiles?.email,
                                          fullName: business.profiles?.full_name,
                                          companyName: business.company_name,
                                          userId: business.user_id,
                                          isRevocation: true
                                        });
                                      }
                                    }}
                                    disabled={updateVerificationTierMutation.isPending}
                                  >
                                    Revoke
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

              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {businesses
                  ?.filter((b: any) =>
                    b.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((business: any) => (
                    <div
                      key={business.id}
                      className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{business.company_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{business.profiles?.email}</p>
                        </div>
                        <ReputationBadge tier={business.verification_tier || 'none'} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{business.business_type || 'goods'}</Badge>
                        {business.reputation_score ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {business.reputation_score.toFixed(1)}
                          </Badge>
                        ) : null}
                        <Badge variant={business.location_verified ? "default" : "secondary"} className="text-xs">
                          {business.location_verified ? (
                            <><MapPin className="h-3 w-3 mr-1" />Verified</>
                          ) : (
                            "Not Verified"
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-background/60 border border-border/30">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-primary/70" />
                          <span className="text-xs text-muted-foreground">Wallet Balance</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-foreground">
                          ₦{Number(business.business_wallets?.[0]?.available_balance || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Change Tier</span>
                        <Select
                          value={business.verification_tier || 'none'}
                          onValueChange={(value: VerificationTier) =>
                            updateVerificationTierMutation.mutate({
                              businessId: business.id,
                              tier: value,
                              email: business.profiles?.email,
                              fullName: business.profiles?.full_name,
                              companyName: business.company_name,
                              userId: business.user_id,
                              isRevocation: value !== 'premium' && business.verification_tier === 'premium'
                            })
                          }
                        >
                          <SelectTrigger className="w-full h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const currentBal = business.business_wallets?.[0]?.available_balance || 0;
                            const newVal = prompt(`Override wallet balance for ${business.company_name} (Current: ₦${currentBal.toLocaleString()}):`);
                            if (newVal !== null) {
                              const parsedVal = parseFloat(newVal);
                              if (!isNaN(parsedVal) && parsedVal >= 0) {
                                updateBusinessWalletMutation.mutate({ businessId: business.id, availableBalance: parsedVal });
                              } else {
                                toast.error("Please enter a valid non-negative number.");
                              }
                            }
                          }}
                          className="h-8 text-xs border-primary/20 hover:bg-primary/5 font-semibold flex-1 min-w-[120px]"
                        >
                          Override 
                        </Button>

                        {business.verification_tier === 'premium' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs font-bold px-3 h-8 flex-1 min-w-[100px]"
                            onClick={() => {
                              if (confirm(`Are you absolutely sure you want to revoke the Premium Badge for ${business.company_name}? This will demote them to basic verified, play a safety alert chime, and send a security warning email.`)) {
                                updateVerificationTierMutation.mutate({
                                  businessId: business.id,
                                  tier: 'verified',
                                  email: business.profiles?.email,
                                  fullName: business.profiles?.full_name,
                                  companyName: business.company_name,
                                  userId: business.user_id,
                                  isRevocation: true
                                });
                              }
                            }}
                            disabled={updateVerificationTierMutation.isPending}
                          >
                            Revoke Premium
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
