import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Request {
  id: string;
  status: string;
  message: string | null;
  response: string | null;
  created_at: string;
  business: {
    company_name: string;
  } | null;
}

export default function CustomerEngagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;

      try {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customer) {
          const { data } = await supabase
            .from("requests")
            .select(`
              id,
              status,
              message,
              response,
              created_at,
              business:businesses(company_name)
            `)
            .eq("customer_id", customer.id)
            .order("created_at", { ascending: false });

          if (data) {
            setRequests(data as unknown as Request[]);
          }
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "rejected":
        return "Rejected";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Engagement</h1>
          <p className="mt-1 text-muted-foreground">
            Track your interactions with businesses
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="dashboard-card text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium text-foreground">
              No interactions yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your requests and interactions with businesses will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="dashboard-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {request.business?.company_name || "Unknown Business"}
                      </h3>
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                        {getStatusIcon(request.status)}
                        {getStatusLabel(request.status)}
                      </span>
                    </div>
                    {request.message && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {request.message}
                      </p>
                    )}
                    {request.response && (
                      <div className="mt-3 rounded-lg bg-accent p-3">
                        <p className="text-xs font-medium text-accent-foreground">
                          Response:
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {request.response}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
