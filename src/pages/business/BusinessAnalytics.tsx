import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness, useBusinessStats } from "@/hooks/useBusiness";
import { useBusinessAnalytics } from "@/hooks/useAnalytics";
import { useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Briefcase,
  Star,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_COLORS = ["hsl(var(--foreground))", "hsl(var(--muted-foreground))", "hsl(var(--accent-foreground))", "hsl(var(--secondary-foreground))"];

export default function BusinessAnalytics() {
  const { data: business } = useBusiness();
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const { data: analytics, isLoading } = useBusinessAnalytics(business?.id, period);
  const { data: stats } = useBusinessStats(business?.id);

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

  const orderStatusData = analytics?.ordersByStatus
    ? Object.entries(analytics.ordersByStatus).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }))
    : [];

  const jobStatusData = analytics?.jobsByStatus
    ? Object.entries(analytics.jobsByStatus).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
      }))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="mt-1 text-muted-foreground">Track your business performance</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-card animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="dashboard-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">
                      {formatCurrency(analytics?.totalRevenue || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{analytics?.totalOrders || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{analytics?.totalJobs || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Star className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">
                      {analytics?.avgRating ? analytics.avgRating.toFixed(1) : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="dashboard-card">
              <h3 className="font-medium text-foreground mb-4">Revenue (Last 7 Days)</h3>
              {analytics?.revenueByDay && analytics.revenueByDay.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No revenue data yet
                </div>
              )}
            </div>

            {/* Status Breakdown */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="dashboard-card">
                <h3 className="font-medium text-foreground mb-4">Orders by Status</h3>
                {orderStatusData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {orderStatusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No orders yet
                  </div>
                )}
              </div>

              <div className="dashboard-card">
                <h3 className="font-medium text-foreground mb-4">Jobs by Status</h3>
                {jobStatusData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={jobStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {jobStatusData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No jobs yet
                  </div>
                )}
              </div>
            </div>

            {/* Customer Metrics */}
            <div className="dashboard-card">
              <h3 className="font-medium text-foreground mb-4">Customer Insights</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Users className="h-6 w-6 mx-auto text-foreground" />
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {analytics?.customerMetrics?.totalCustomers || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Customers</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-6 w-6 mx-auto text-foreground" />
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {analytics?.customerMetrics?.repeatCustomers || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Repeat Customers</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <BarChart3 className="h-6 w-6 mx-auto text-foreground" />
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {analytics?.conversionRate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="dashboard-card">
                <h3 className="font-medium text-foreground mb-4">Top Products</h3>
                {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-5">{index + 1}.</span>
                          <span className="text-foreground">{product.name}</span>
                        </div>
                        <Badge variant="secondary">{product.orders} orders</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No products yet</p>
                )}
              </div>

              <div className="dashboard-card">
                <h3 className="font-medium text-foreground mb-4">Top Services</h3>
                {analytics?.topServices && analytics.topServices.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-5">{index + 1}.</span>
                          <span className="text-foreground">{service.name}</span>
                        </div>
                        <Badge variant="secondary">{service.jobs} jobs</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No services yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
