import { DashboardLayout } from "@/components/DashboardLayout";
import { ActivityLeaderboard } from "@/components/ActivityLeaderboard";
import { RecentSessions } from "@/components/RecentSessions";
import { ActivityEvents } from "@/components/ActivityEvents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Activity() {
  return (
    <DashboardLayout title="Activity">
      <div className="space-y-5 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">In-game time tracking and admin logs</p>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="bg-secondary/60 border border-border/40">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="admin-logs">Admin Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <ActivityLeaderboard />
          </TabsContent>

          <TabsContent value="sessions">
            <RecentSessions />
          </TabsContent>

          <TabsContent value="admin-logs">
            <ActivityEvents />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
