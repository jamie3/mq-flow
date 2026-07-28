# mq-flow

A static, front-end-only visualization tool for IBM MQ topology — queue managers, queues, topics, and
subscriptions — exported from MQ Explorer. No backend, no database: the app reads a flat JSON/CSV file
and renders an interactive node-and-edge diagram with [React Flow](https://reactflow.dev/) (`@xyflow/react`).

Built with **Vite + React + TypeScript**, styled with **Tailwind CSS**, laid out automatically with
**dagre**, and able to parse CSV exports with **PapaParse**.

## Features

- **Queue managers as groups** — queues, topics, and subscriptions are nested inside their owning
  queue manager.
- **Relationship edges**, color-coded and labelled:
  - alias queue → base queue
  - remote queue → target queue on another queue manager
  - parent topic → child topic
  - subscription → topic it subscribes to
  - subscription → destination queue it delivers to
  - sender channel → target queue manager
- **Click any node** to inspect its attributes (type, topic string, max/current depth, description, …)
  in the side panel.
- **Load your own export** at runtime (JSON or CSV) — nothing is uploaded anywhere; parsing happens
  entirely in the browser.
- **Auto-layout** via dagre, plus pan/zoom, a minimap, and fit-to-view.

## Getting started

This project uses **[pnpm](https://pnpm.io/)** as its package manager (pinned via the
`packageManager` field, so [Corepack](https://nodejs.org/api/corepack.html) will select the right
version automatically — run `corepack enable` once if it isn't already).

```bash
pnpm install
pnpm dev
```

Open the printed URL. The app loads bundled sample data on start; use **Load export…** to open your
own MQ Explorer export.

## Data format

The canonical format is a single JSON file — see
[`public/sample-data/mq-topology.json`](public/sample-data/mq-topology.json) for a complete example
and [`src/types/mq.ts`](src/types/mq.ts) for the full schema. In short:

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

### CSV exports

MQ Explorer's own CSV exports are also accepted. Column headers are matched case- and
space-insensitively against a set of common aliases (`QMgr`, `RQMNAME`, `MAXDEPTH`, `TOPICSTR`, …),
and the object kind (queue / topic / subscription / channel) is inferred from an explicit type column
or from which fields are present. If your export uses different headers, extend `COLUMN_ALIASES` in
[`src/lib/parseMqExport.ts`](src/lib/parseMqExport.ts).

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
src/lib/parseMqExport.ts               JSON + CSV parsing into the data model
src/lib/buildGraph.ts                  Data model → React Flow nodes/edges + dagre layout
src/components/                        Toolbar, Sidebar, TopologyView, and custom nodes
```
