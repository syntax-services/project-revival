/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";

interface AdminJobsTabProps {
  jobs: any[];
  loadingJobs: boolean;
  refetchJobs: () => void;
}

export function AdminJobsTab({
  jobs,
  loadingJobs,
  refetchJobs,
}: AdminJobsTabProps) {
  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const { data, error } = await supabase.rpc("complete_service_job", {
        p_job_id: jobId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Job marked as completed! Funds transferred to business.");
      refetchJobs();
    },
    onError: (err: any) => {
      toast.error("Failed to complete job: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Jobs ({jobs?.length || 0})</CardTitle>
          <CardDescription>Monitor service requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="flex items-center justify-center py-12">
              <InterlockingLoader size="md" label="Loading jobs..." />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs?.map((job: any) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{job.description || 'Service Request'}</p>
                              <p className="text-xs text-muted-foreground">{job.id?.slice(0, 8).toUpperCase()}</p>
                            </div>
                          </TableCell>
                          <TableCell>{job.customers?.profiles?.full_name || 'Unknown'}</TableCell>
                          <TableCell>{job.businesses?.company_name}</TableCell>
                          <TableCell>
                            {job.final_price ? `₦${Number(job.final_price).toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {job.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => completeJobMutation.mutate({ jobId: job.id })}
                              >
                                Mark Complete
                              </Button>
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
                {jobs?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No jobs found</p>
                )}
                {jobs?.map((job: any) => (
                  <div key={job.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{job.description || 'Service Request'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{job.id?.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="text-muted-foreground">Customer:</span> {job.customers?.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-sm"><span className="text-muted-foreground">Business:</span> {job.businesses?.company_name}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold">
                        {job.final_price ? `₦${Number(job.final_price).toLocaleString()}` : '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                    </div>
                    {job.status === 'in_progress' && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => completeJobMutation.mutate({ jobId: job.id })}
                      >
                        Mark Complete
                      </Button>
                    )}
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
