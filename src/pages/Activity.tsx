import { DashboardLayout } from "@/components/DashboardLayout";
import { ActivityLeaderboard } from "@/components/ActivityLeaderboard";
import { RecentSessions } from "@/components/RecentSessions";
import { ActivityEvents } from "@/components/ActivityEvents";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { SessionManager } from "@/components/SessionManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Activity() {
  return (
    <DashboardLayout title="Activity">
      <div className="space-y-5 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">In-game time tracking and event logs</p>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="bg-secondary/60 border border-border/40">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="manage">Manage & Export</TabsTrigger>
            <TabsTrigger value="events">Event Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <ActivityLeaderboard />
          </TabsContent>

          <TabsContent value="sessions">
            <RecentSessions />
          </TabsContent>

          <TabsContent value="heatmap">
            <ActivityHeatmap />
          </TabsContent>

          <TabsContent value="manage">
            <SessionManager />
          </TabsContent>

          <TabsContent value="events">
            <ActivityEvents />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
