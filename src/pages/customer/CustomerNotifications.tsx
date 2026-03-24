import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import { 
  Bell, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  MessageSquare, 
  Package, 
  Trash2,
  MoreVertical,
  Pin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export default function CustomerNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading: loadingNotifs } = useNotifications();
  const { messages: adminMessages, isLoading: loadingAdmin } = useAdminMessages();

  const isLoading = loadingNotifs || loadingAdmin;

  const getIcon = (type: string) => {
    switch (type) {
      case "order_status":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
            <p className="mt-1 text-muted-foreground">Stay updated on your activity and platform news</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Pinned Admin Messages */}
          {adminMessages.filter(m => m.is_pinned).map((msg) => (
            <div key={msg.id} className="dashboard-card border-primary/20 bg-primary/5">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Pin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">{msg.title}</h3>
                    <Badge variant="default" className="shrink-0">Announcement</Badge>
                  </div>
                  <p className="mt-1 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Regular Notifications & Messages List */}
          <div className="dashboard-card p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 && adminMessages.filter(m => !m.is_pinned).length === 0 ? (
              <div className="text-center py-20">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No notifications yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                  We'll notify you here when there's an update on your orders or platform announcements.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Regular Admin Messages (Unpinned) */}
                {adminMessages.filter(m => !m.is_pinned).map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Info className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-foreground truncate">{msg.title}</h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* System Notifications */}
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 hover:bg-muted/30 transition-colors group relative ${!notif.read ? "bg-primary/5" : ""}`}
                    onClick={() => !notif.read && markAsRead.mutate(notif.id)}
                  >
                    <div className="flex gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? "bg-primary/10" : "bg-muted"}`}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`text-sm font-medium text-foreground truncate ${!notif.read ? "font-bold" : ""}`}>
                            {notif.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notif.read && (
                                  <DropdownMenuItem onClick={() => markAsRead.mutate(notif.id)}>
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => deleteNotification.mutate(notif.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        {notif.message && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{notif.message}</p>
                        )}
                        {!notif.read && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}