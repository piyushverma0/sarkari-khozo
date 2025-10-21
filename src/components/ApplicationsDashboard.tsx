import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, TrendingUp, Bell, Archive, Loader2 } from "lucide-react";
import SavedApplicationCard from "./SavedApplicationCard";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Application {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  important_dates: any;
  application_status: string;
  saved_at: string;
  applied_confirmed: boolean;
}

interface DashboardStats {
  total: number;
  applied: number;
  upcoming: number;
  unread: number;
}

export function ApplicationsDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApps, setFilteredApps] = useState<Application[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    applied: 0,
    upcoming: 0,
    unread: 0,
  });
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("deadline");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    fetchStats();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications'
        },
        () => {
          fetchApplications();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applications, statusFilter, sortBy]);

  const fetchApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total applications
      const { count: total } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get applied applications
      const { count: applied } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('applied_confirmed', true);

      // Get upcoming deadlines (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: upcomingApps } = await supabase
        .from('applications')
        .select('important_dates')
        .eq('user_id', user.id);

      let upcoming = 0;
      upcomingApps?.forEach(app => {
        const dates = app.important_dates || {};
        Object.values(dates).forEach(date => {
          if (typeof date === 'string') {
            const deadlineDate = new Date(date);
            if (deadlineDate <= thirtyDaysFromNow && deadlineDate >= new Date()) {
              upcoming++;
            }
          }
        });
      });

      // Get unread notifications
      const { count: unread } = await supabase
        .from('application_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('delivery_status', 'pending');

      setStats({
        total: total || 0,
        applied: applied || 0,
        upcoming: upcoming || 0,
        unread: unread || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...applications];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.application_status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "deadline": {
          const aDate = getNextDeadline(a);
          const bDate = getNextDeadline(b);
          if (!aDate) return 1;
          if (!bDate) return -1;
          return new Date(aDate).getTime() - new Date(bDate).getTime();
        }
        case "recent":
          return new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime();
        case "alphabetical":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredApps(filtered);
  };

  const getNextDeadline = (app: Application): string | null => {
    const dates = app.important_dates || {};
    const futureDates = Object.values(dates)
      .filter((date): date is string => typeof date === 'string')
      .map(date => new Date(date))
      .filter(date => date >= new Date())
      .sort((a, b) => a.getTime() - b.getTime());

    return futureDates.length > 0 ? futureDates[0].toISOString() : null;
  };

  const toggleSelectApp = (appId: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApps(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(filteredApps.map(app => app.id)));
    }
  };

  const handleBulkArchive = async () => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ application_status: 'archived' })
        .in('id', Array.from(selectedApps));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Archived ${selectedApps.size} application(s)`,
      });

      setSelectedApps(new Set());
      fetchApplications();
    } catch (error) {
      console.error('Error archiving applications:', error);
      toast({
        title: "Error",
        description: "Failed to archive applications",
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ application_status: newStatus })
        .in('id', Array.from(selectedApps));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedApps.size} application(s)`,
      });

      setSelectedApps(new Set());
      fetchApplications();
    } catch (error) {
      console.error('Error updating applications:', error);
      toast({
        title: "Error",
        description: "Failed to update applications",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tracked</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Applied</p>
              <p className="text-2xl font-bold">{stats.applied}</p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
            </div>
            <Bell className="w-8 h-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unread Alerts</p>
              <p className="text-2xl font-bold">{stats.unread}</p>
            </div>
            <Bell className="w-8 h-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Checkbox
              checked={selectedApps.size === filteredApps.length && filteredApps.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedApps.size > 0 ? `${selectedApps.size} selected` : "Select all"}
            </span>

            {selectedApps.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkArchive}
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
                <Select onValueChange={handleBulkStatusChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Change status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discovered">Discovered</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="admit_card_released">Admit Card</SelectItem>
                    <SelectItem value="results_declared">Results</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Next Deadline</SelectItem>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="alphabetical">Alphabetically</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Applications List with Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="discovered">Discovered</TabsTrigger>
          <TabsTrigger value="applied">Applied</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="space-y-4 mt-4">
          {filteredApps.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No applications found</p>
            </Card>
          ) : (
            filteredApps.map((app) => (
              <div key={app.id} className="flex gap-3 items-start">
                <Checkbox
                  checked={selectedApps.has(app.id)}
                  onCheckedChange={() => toggleSelectApp(app.id)}
                  className="mt-6"
                />
                <div className="flex-1">
                  <SavedApplicationCard
                    id={app.id}
                    title={app.title}
                    description={app.description || ""}
                    savedAt={new Date(app.saved_at)}
                    category={app.category || ""}
                  />
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
