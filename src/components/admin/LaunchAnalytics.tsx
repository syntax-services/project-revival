import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { TrendingUp, Users, ShoppingBag, Zap, Award } from "lucide-react";

const userData = [
  { name: 'Mon', users: 45, businesses: 12 },
  { name: 'Tue', users: 52, businesses: 15 },
  { name: 'Wed', users: 48, businesses: 18 },
  { name: 'Thu', users: 61, businesses: 22 },
  { name: 'Fri', users: 75, businesses: 28 },
  { name: 'Sat', users: 89, businesses: 32 },
  { name: 'Sun', users: 110, businesses: 40 },
];

const revenueData = [
  { name: 'Week 1', total: 45000 },
  { name: 'Week 2', total: 120000 },
  { name: 'Week 3', total: 85000 },
  { name: 'Week 4', total: 240000 },
];

export function LaunchAnalytics() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Launch Velocity</CardTitle>
            <Zap className="w-4 h-4 text-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">94.2%</div>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +12.4% from yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Acquisition</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">1,248</div>
            <div className="flex gap-2 mt-2">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[70%]"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Gross Volume</CardTitle>
            <Award className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{'\u20A6'}4.2M</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Platform-wide orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Burn Rate</CardTitle>
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">0.42%</div>
            <p className="text-xs text-green-500 font-bold mt-1">Healthy efficiency</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 shadow-2xl border-2 border-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full"></div>
              Growth Projection
            </CardTitle>
            <CardDescription>Daily user vs business conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBiz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="businesses" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorBiz)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-2xl border-2 border-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
              Revenue Streaks
            </CardTitle>
            <CardDescription>Weekly transaction volume benchmarks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,0,0,0.02)'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 3 ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
