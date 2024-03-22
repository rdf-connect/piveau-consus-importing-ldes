# piveau-consus-importing-ldes
 
A [piveau-consus](https://gitlab.com/piveau/consus) importer of LDESs

The importer starts an LDES client and pushes each event to the next piveau segment. A docker configuration has been provided.

## Install

**Locally**
```bash
npm Install
npm run build
npx js-runner pipeline.ttl
```

**Docker**
```bash
docker build -t piveau .
# You can specify the port with -e LDES_PORT=3001
docker run --publish 3000:3000 piveau 
```


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


 
