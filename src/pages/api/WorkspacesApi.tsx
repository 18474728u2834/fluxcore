import { ApiShell, CodeBlock, EndpointBadge } from "./ApiLayout";

const ENDPOINT = "https://zulnuayumxsdbivigvfe.supabase.co/functions/v1/public-workspaces";

const curlExample = `curl "${ENDPOINT}"`;

const responseExample = `{
  "workspaces": [
    {
      "id": "uuid",
      "name": "Example Group",
      "roblox_group_id": "1234567",
      "verified_official": true,
      "premium": true
    }
  ]
}`;

export default function WorkspacesApi() {
  return (
    <ApiShell>
      <section className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Public Workspaces</div>
        <h1 className="text-4xl font-bold tracking-tight">Public workspace directory</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          A small, non-sensitive list of workspaces on Fluxcore. Verified workspaces are returned first, then premium, then most recent. No auth required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Endpoint</h2>
        <EndpointBadge method="GET" url={ENDPOINT} />
        <p className="text-sm text-muted-foreground">Cached for 5 minutes. Returns up to 30 workspaces.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Example</h2>
        <CodeBlock code={curlExample} lang="cURL" />
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight">Response</h2>
        <CodeBlock code={responseExample} lang="JSON" />
      </section>
    </ApiShell>
  );
}
