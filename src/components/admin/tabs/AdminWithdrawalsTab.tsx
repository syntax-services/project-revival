/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAllWithdrawals, useProcessWithdrawal } from "@/hooks/useBusinessEarnings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";

export function AdminWithdrawalsTab() {
  const { data: withdrawals, isLoading: loadingWithdrawals } = useAllWithdrawals();
  const processWithdrawal = useProcessWithdrawal();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests ({withdrawals?.length || 0})</CardTitle>
          <CardDescription>Process business withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingWithdrawals ? (
            <InterlockingLoader size="sm" label="Loading withdrawals..." />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals?.map((w: any) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {w.businesses?.company_name || w.profiles?.full_name || 'User'}
                                <Badge variant="outline" className="ml-2 text-[10px] uppercase">
                                  {w.withdrawal_type || 'business'}
                                </Badge>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {w.businesses?.profiles?.email || w.profiles?.email || 'N/A'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">₦{Number(w.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{w.bank_name}</p>
                              <p className="text-muted-foreground">{w.account_number}</p>
                              <p className="text-muted-foreground">{w.account_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              w.status === 'completed' ? 'default' :
                                w.status === 'rejected' ? 'destructive' :
                                  'secondary'
                            }>
                              {w.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(w.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {w.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => processWithdrawal.mutate({
                                    withdrawalId: w.id,
                                    status: 'completed',
                                  })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => processWithdrawal.mutate({
                                    withdrawalId: w.id,
                                    status: 'rejected',
                                    adminNotes: 'Rejected by admin',
                                  })}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {(!withdrawals || withdrawals.length === 0) ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No withdrawal requests yet</p>
                ) : (
                  withdrawals.map((w: any) => (
                    <div key={w.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">
                            {w.businesses?.company_name || w.profiles?.full_name || 'User'}
                            <Badge variant="outline" className="ml-1.5 text-[9px] uppercase">
                              {w.withdrawal_type || 'business'}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {w.businesses?.profiles?.email || w.profiles?.email || 'N/A'}
                          </p>
                        </div>
                        <Badge variant={
                          w.status === 'completed' ? 'default' :
                            w.status === 'rejected' ? 'destructive' : 'secondary'
                        } className="text-[10px] shrink-0">
                          {w.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xl font-bold text-primary">₦{Number(w.amount).toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</span>
                      </div>
                      <div className="bg-background/50 rounded-xl p-2.5 text-xs space-y-0.5">
                        <p className="font-medium">{w.bank_name}</p>
                        <p className="text-muted-foreground">{w.account_number}</p>
                        <p className="text-muted-foreground">{w.account_name}</p>
                      </div>
                      {w.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 h-9 text-xs font-bold"
                            onClick={() => processWithdrawal.mutate({
                              withdrawalId: w.id,
                              status: 'completed',
                            })}
                          >
                             Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 h-9 text-xs font-bold"
                            onClick={() => processWithdrawal.mutate({
                              withdrawalId: w.id,
                              status: 'rejected',
                              adminNotes: 'Rejected by admin',
                            })}
                          >
                             Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
