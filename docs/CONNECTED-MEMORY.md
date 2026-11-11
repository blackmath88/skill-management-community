# Optional connected memory

Standalone mode is fully useful: committed selected documents plus the Observatory artifact.
Connected mode adds the existing Knowledge Lab host's preserved revisions and retrieval. It is a separate onboarding action, not installed by this template.

## Host-side onboarding

1. Review which repo/ref/manifest and audience may be ingested. Confirm access and retention expectations.
2. On the authorised Knowledge Lab host, inspect the installed commit, its CLI help and current source configuration. Back up its ledger before modifying deployment configuration.
3. Merge an entry shaped like the example below into its existing source list; do not replace other entries.
4. Clone/register the selected repository through the host's documented process and run an explicit selected sync.
5. Verify source discovery → search → evidence → history → bounded context against a known source edit. Check exact commit identity and retry behaviour.
6. Revoke a synthetic test grant and verify retrieval closes as expected before relying on private-source enforcement.

```json
{
  "schema": "knowledge-lab.memory-sources/v1",
  "sources": [{
    "repository": "YOUR-OWNER/YOUR-REPO",
    "requested_ref": "origin/main",
    "manifest_path": ".observstory/knowledge.json"
  }]
}
```

Use the actual default branch in requested_ref. The source manifest selects documents; this host configuration selects repositories. Private access grants are separate from both.

As inspected on 2026-11-11, Knowledge Lab main contains the scaffold and durable Project Memory. Deterministic source search/MCP and selected-sync text-index refresh are in open PRs #18 and #19, respectively; #19 is stacked on #18. A reported linuc deployment at a8b9bf836ff4815bafe191de8358529ee815439a does not make those features merged into main or prove another host has them.

Consult the installed version's docs/DEPLOY-DETERMINISTIC-SERVICE.md when using that branch. Do not blindly install main and assume it includes the deployed branch. Semantic LightRAG inference is not required for the template and is a separate opt-in.

No hosted ChatGPT/Claude connector, public MCP endpoint, BuildRadar registration or Weavr mission is created here. Exported handoff/context packets remain a usable fallback.
