-- lovable-cron-fallback-reviewed: 96 runs/day; standby database must stay within 15 minutes of live for outage failover
select cron.unschedule('standby-replication') where exists (select 1 from cron.job where jobname='standby-replication');
select cron.schedule('standby-replication', '*/15 * * * *', $$select public.cron_invoke_edge('standby-replicate', '{}'::jsonb);$$);