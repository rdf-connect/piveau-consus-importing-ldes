# piveau-consus-importing-ldes
 
AThis is a [Piveau-Consus](https://doc.piveau.eu/consus/) importer plugin built with the RDF-Connect framework. It integrates into the Consus data import pipeline, allowing to harvest the change event data published in the form of Linked Data Event Streams (LDES) and forward them through multi-stage processing pipelines.

The importer starts an LDES client and pushes each event to the next piveau segment. A docker configuration is provided.

## Install

**Locally**
```bash
npm Install
npm run build
npx rdfc pipeline.ttl
```

**Docker**
```bash
docker build -t piveau .
# You can specify the port with -e LDES_PORT=3001
docker run --publish 3000:3000 piveau 
```

## Plugin Architecture

### How It Works as a Consus Plugin

The plugin operates as a **segment processor** within a Consus pipeline. When Consus initiates a pipeline run, it sends a descriptor containing multiple segments. This plugin processes one segment and passes the descriptor to the next segment:

1. **Receives** a Consus descriptor with configuration and routing information
2. **Initializes** an LDES client with the provided endpoint URL
3. **Streams** each RDF entity from the LDES source
4. **Converts** quads to N-Quads format
5. **Forwards** each entity to the next Consus segment via HTTP PUT

## Talking to Consus

We provide a PUT endpoint accepting `application/json`:


```http
PUT http://example.com/pipe
Content-Type: application/json
```

```json
{
  "header": {
    "id": "e106e79b-ad9a-4c9c-ade7-b49c58ff53fb",
    "runId": "08501a2a-4245-4804-8e1a-9303b49f6277",
    "startTime": "2024-03-21T12:00:00",
    "name": "ldes-source",
    "title": "Harvester – LDES source",
    "version": "2.0.0",
    "context": "DEU",
    "transport": "payload"
  },
  "body": {
    "segments": [
      {
        "header": {
          "name": "piveau-consus-importing-ldes",
          "segmentNumber": 1,
          "title": "Importing LDES",
          "processed": false
        },
        "body": {
          "endpoint": {
            "address": "http://next.endpoint.address.com/pipe",
            "method": "PUT",
            "protocol": "http"
          },
          "config": { 
            "url": "https://www.pieter.pm/dcat/sweden/feed.ttl",
            "catalogue": "dane-gov-pl",
            "stateFile": "/tmp/test.json",
            "ordered": "ascending"
          }
        }
      },
      {
        "header": {
          "name": "piveau-consus-exporting-hub",
          "segmentNumber": 2,
          "title": "Exporting hub",
          "processed": false
        },
        "body": {
          "endpoint": {
            "address": "http://piveau-consus-exporting-hub/pipe",
            "method": "PUT",
            "protocol": "http"
          }
        }
      }
    ]
  }
}
```

**LDES Options**
```json
{
  "url": "required string the the ldes endpoint",
  "ordered": "ascending, descending or none, defaults to none (only works if the ldes has a specified timestamp path)",
  "stateFile": "location of the state file (default to undefined, do not keep state)"
}
```

### Core Components

#### `Piveau` Processor
The main plugin class that handles LDES ingestion:
- Reads descriptors from Consus containing LDES configuration
- Establishes a connection to the LDES endpoint
- Streams RDF events from the LDES source
- Converts RDF quads to N-Quads serialization
- Sends each entity to the downstream Consus segment
- Implements retry logic and error handling

**Configuration Parameters:**
- `url` (required): The LDES endpoint URL to harvest from
- `catalogue`: The catalogue identifier for metadata tracking
- `ordered`: Sort order for LDES events (`ascending`, `descending`, or `none`)
- `stateFile`: Optional path to persist synchronization state between runs
- `fetchConfig`: HTTP client configuration (retry, concurrency, etc.)

#### `HTTPConsumer` Processor
An optional HTTP server processor that accepts incoming Consus descriptors:
- Listens on a configurable port (default: 3000)
- Accepts `application/json` PUT requests
- Writes received descriptors to an output stream
- Enables integration as a Consus pipeline endpoint

### Data Flow

```
Consus Control Plane
        ↓
    [Descriptor with LDES config]
        ↓
   HTTP PUT to /pipe
        ↓
   HTTPConsumer (listens)
        ↓
   Piveau Processor
        ├─ Connect to LDES endpoint
        ├─ Stream RDF entities
        └─ Convert to N-Quads
        ↓
   Send to next Consus segment
        ↓
   [Next segment processes metadata]
```

### Integration with Piveau-Consus Platform

**As a Harvester Plugin:**
- Positioned as the first or intermediate segment in a pipeline
- Receives LDES endpoint configuration from Consus
- Harvests metadata without manual data export/import
- Supports stateful imports to only fetch new/updated records

**Typical Pipeline Structure:**
```
External LDES Source
        ↓
piveau-consus-importing-ldes (this plugin)
        ↓
Data Validation/Transformation
        ↓
piveau-consus-exporting-hub (or similar)
        ↓
Piveau Catalogue
```

### RDF Processing Details

The plugin handles RDF processing through:

- **LDES Client**: Uses the `ldes-client` library to stream RDF events from compliant LDES endpoints
- **N3.js**: Converts RDF quads between formats
- **N-Quads Output**: Serializes all quads to N-Quads format for transport through Consus pipelines
- **Quad Streaming**: Processes entities individually to handle large LDES sources efficiently

### State Management

When `stateFile` is configured, the plugin maintains synchronization state:
- Tracks which LDES members have been processed
- Resumes from the last known position on restart
- Prevents duplicate harvesting of unchanged records
- Stored in JSON format at the specified file path

### Error Handling

The plugin includes robust error handling:
- HTTP retry logic for transient failures (configurable max retries)
- Graceful error logging with cause chain
- Processing continues after individual entity errors
- Connection pooling with configurable concurrency

### Development Setup

To modify or extend this plugin:

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run pipeline locally with test data
npx rdfc pipeline.ttl
```

The TypeScript sources are in `src/`, compiled to `lib/`. The plugin exports `Piveau` and `HTTPConsumer` classes that conform to the RDF-Connect `Processor` interface.

### Testing

A test HTTP server is provided to simulate Consus endpoints during development:

```bash
# Run test server (responds with 200 OK, logs requests)
node test/test-http-server.js

# Or via Docker
cd test/http-server
docker build -t test-http-server -f Dockerfile ../../
docker run -p 8080:8080 test-http-server
```

The server logs all incoming requests and their body content, useful for debugging descriptor format and payload validation.
