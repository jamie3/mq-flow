# mq-flow

A static, front-end-only visualization tool for IBM MQ topology — queue managers, queues, topics, and
subscriptions — exported from MQ Explorer. No backend, no database: the app reads a flat JSON/CSV file
and renders an interactive node-and-edge diagram with [React Flow](https://reactflow.dev/) (`@xyflow/react`).

Built with **Vite + React + TypeScript**, styled with **Tailwind CSS**, laid out automatically with
**dagre**, and able to parse CSV exports with **PapaParse**.

## Features

- **CSV import wizard** — “Load export…” walks you through naming a queue manager and picking one or
  more MQ Explorer CSV exports. Each file's object type (queues, topics, subscriptions, channels) is
  detected automatically from its column headers.
- **Persists to local storage** — imported data is saved in the browser and reloaded on next visit.
  Re-importing a queue manager of the same name prompts to replace it (its whole object tree is
  rebuilt).
- **Explore tree** — a collapsible, **searchable** tree of queue managers → object groups → objects →
  properties, with a jump-to-flow link on every object.
- **Filter the overview** — a search box filters the graph by name or **any field/property** (every
  whitespace-separated term must match), plus per-type toggles (queues / topics / subscriptions /
  channels) to tame large maps. The view re-fits to the matches, and a counter shows how many objects
  are visible. The filter (search text and toggles) is remembered across navigation and reloads.
- **Side menu** listing each object category (Queue Managers, Queues, Topics, Subscriptions,
  Channels) with live counts.
- **Searchable list pages** — click a category to browse its objects and filter them as you type.
- **Per-object relationship explorer** — click any object to open a focused flow centered on it.
  Adjust how many relationship hops to show (depth 1–3), and click a neighbouring node to re-center
  the flow on it and walk the graph.
- **Overview page** — the whole topology at once, with queue managers as group containers holding
  their queues, topics, and subscriptions.
- **Relationship edges**, color-coded and labelled:
  - alias queue → base queue
  - remote queue → target queue on another queue manager
  - parent topic → child topic
  - subscription → topic it subscribes to
  - subscription → destination queue it delivers to
  - sender channel → target queue manager
- **Click any node** to inspect its attributes (type, topic string, current depth, description, …)
  in the side panel.
- **Everything stays in the browser** — CSV parsing and storage are entirely client-side; nothing is
  uploaded anywhere.
- **Auto-layout** via dagre, plus pan/zoom, a minimap, and fit-to-view.

## Pages & navigation

The app is a small single-page app with client-side routing:

| Route | Page |
| --- | --- |
| `/` | Overview — the full topology graph |
| `/explore` | Tree of queue managers, their objects, and properties |
| `/list/:category` | Searchable list of objects in a category |
| `/object/:kind/:queueManager/:name` | Focused relationship flow for a single object |

> **Note for static hosting:** because these are real client-side routes, deep links need the host
> to fall back to `index.html`. The bundled `nginx.conf` already does this (`try_files … /index.html`);
> configure an equivalent rewrite if you serve `dist/` some other way.

## Getting started

This project uses **[pnpm](https://pnpm.io/)** as its package manager (pinned via the
`packageManager` field, so [Corepack](https://nodejs.org/api/corepack.html) will select the right
version automatically — run `corepack enable` once if it isn't already).

```bash
pnpm install
pnpm dev
```

Open the printed URL. If you've imported before, your saved topology loads automatically; otherwise a
bundled sample is shown. Use **Load export…** to import your own MQ Explorer CSV files.

## Importing MQ Explorer CSV files

Click **Load export…** to open the import wizard:

1. **Name the queue manager.** Everything you import in this session lands under this name.
2. **Pick the CSV files.** Select one or more MQ Explorer exports (queues, topics, subscriptions,
   channels — in any combination). Each file's object type is detected from its header row and shown
   with a badge and row count.
3. **Import.** The objects are built into a model, saved to your browser's local storage, and the app
   jumps to the Explore tree. If a queue manager of the same name already exists, you're asked whether
   to replace it — replacing removes its current objects and rebuilds the tree from the new files.

Detection keys off the identifying column in each file's header row:

| File contains | Detected as |
| --- | --- |
| a `Subscription name` column | Subscriptions |
| a `Channel name` column | Channels |
| a `Queue name` column | Queues |
| a `Topic name` column | Topics |

The exact MQ Explorer column names are mapped to the model in
[`src/lib/importCsv.ts`](src/lib/importCsv.ts) (e.g. alias queues take their target from `Base object`,
remote queues from `Remote queue` / `Remote queue manager`, subscriptions from `Destination name`).
Every non-empty column is also kept verbatim as a property, visible on the Explore tree and the details
panel. If your MQ Explorer version uses different headers, adjust the mapping there.

### Channel connectivity

MQ Explorer's channel export doesn't name the partner queue manager, so it's inferred (see
`inferChannelTargetQm` in [`src/lib/graphModel.ts`](src/lib/graphModel.ts)) from, in order: an explicit
target, the `SOURCE.TO.TARGET` naming convention, a transmission queue named after the target queue
manager, or any known queue-manager name appearing as a dotted segment of the channel name. Only queue
managers you've actually imported are matched, and only outbound channel types (sender/server/
cluster-sender) draw an edge — so a sender/receiver pair between two queue managers produces one edge,
not two. The inferred partner is shown as a “Connects to (inferred)” property in the Explore tree. Import
both ends of a link (each queue manager) to see the channel edge between them.

Imported data lives entirely in your browser (local storage under the key `mq-flow:topology`) — nothing
is uploaded. Clearing site data resets the app to the bundled sample.

## JSON format

The sample data and the in-memory model use a single JSON shape — see
[`public/sample-data/mq-topology.json`](public/sample-data/mq-topology.json) for a complete example
and [`src/types/mq.ts`](src/types/mq.ts) for the full schema:

```jsonc
{
  "queueManagers": [{ "name": "QM1", "description": "…" }],
  "queues": [
    { "name": "ORDERS.ALIAS", "queueManager": "QM1", "queueType": "alias", "targetQueue": "ORDERS.IN" }
  ],
  "topics": [{ "name": "ORDERS.TOPIC", "queueManager": "QM1", "topicString": "orders/#" }],
  "subscriptions": [
    { "name": "AUDIT.SUB", "queueManager": "QM1", "topicName": "ORDERS.TOPIC", "destinationQueue": "AUDIT.SUB.QUEUE" }
  ],
  "channels": [{ "name": "QM1.TO.QM2", "queueManager": "QM1", "targetQueueManager": "QM2" }]
}
```

## Building for static hosting

```bash
pnpm build
```

The `dist/` folder is fully static and can be served from any file host (S3, GitHub Pages, nginx,
etc.) with no server-side component.

## Running in Docker

A multi-stage `Dockerfile` builds the static bundle with pnpm and serves it with nginx.

```bash
# Build and run directly
docker build -t mq-flow .
docker run --rm -p 8080:80 mq-flow

# …or with Docker Compose
docker compose up --build
```

Then open <http://localhost:8080>.

To visualize your own topology in the container, either rebuild after replacing
`public/sample-data/mq-topology.json`, or mount your export over it:

```bash
docker run --rm -p 8080:80 \
  -v "$PWD/my-export.json:/usr/share/nginx/html/sample-data/mq-topology.json:ro" \
  mq-flow
```

## Project structure

```
public/sample-data/mq-topology.json   Sample export used on first load
src/types/mq.ts                        Topology data model (queues/topics/subscriptions/…)
src/lib/importCsv.ts                   MQ Explorer CSV detection + column mapping
src/lib/parseMqExport.ts               JSON parsing (sample data) into the data model
src/lib/graphModel.ts                  Data model → normalized objects + relationships (shared)
src/lib/buildFullGraph.ts              Grouped overview layout (dagre per queue manager)
src/lib/buildFocusedGraph.ts           Neighbourhood layout for a single object's flow
src/lib/categories.ts                  Object categories + route helpers
src/lib/filterTopology.ts              Full-text + by-kind topology filtering (Overview & Explore)
src/state/TopologyContext.tsx          Shared topology state, local-storage persistence, import
src/components/ImportModal.tsx         CSV import wizard
src/components/                        Layout, SideMenu, TopBar, FlowCanvas, Sidebar, nodes, …
src/pages/                             OverviewPage, ExplorePage, ListPage, ObjectFlowPage
src/App.tsx                            Router
```
