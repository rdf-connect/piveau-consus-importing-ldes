# piveau-consus-importing-ldes

A [piveau-consus](https://gitlab.com/piveau/consus) importer of LDESs

It uses the LDES client and connects it to an express-based server that speaks the piveau/consus protocol. A docker configuration has been provided.

It will also only emit the latest version of object on the first replication, as well as in sync-runs.

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
          "title": "Importing LD Event Stream",
          "processed": false
        },
        "body": {
          "endpoint": {
            "address": http://next.endpoint.address.com/pipe,
            "method": "PUT",
            "protocol": "http"
          },
          "config": { # TODO: extend config with other LDES client parameters?
            "address": https://ldes.source.com/catalog,
            "catalogue": "dane-gov-pl"
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
            "address": http://piveau-consus-exporting-hub/pipe,
            "method": "PUT",
            "protocol": "http"
          }
        }
      }
    ]
  }
}
```

We will respond with a `202 Accepted` when successful. 

The pipe descriptor contains a header and a body.
The body contains a list of segments. The first thing we have to do is to find the segment that is related to us. In our case it will always be the first one, but logically we should select the one that has the lowest segmentNumber and is not processed already (`processed: false`). 

The config part of our segment contains the config of the LDES client.

Whenever the LDES Client emits an object, we need to use a copy of this descriptor, set processed of your segement to true and send it to the next segment, which again is the segment that has the lowest segmentNumber and is not already processed. In addition, we need to embedd our event into the pipe descriptor (which is indicated in the pipe header with ‘transport: payload’. No other transport is currently defined). The payload is included in the body of the next segment:
 
```json
{
  "header": {
    "id": "e106e79b-ad9a-4c9c-ade7-b49c58ff53fb",
    "runId": "08501a2a-4245-4804-8e1a-9303b49f6277",
    "startTime": "2024-03-21T12:00:00",
    "name": "ldes-source1",
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
          "title": "Importing LD Event Sstream",
          "processed": true
        },
        "body": {
          "endpoint": {
            "address": http://next.endpoint.address.com/pipe,
            "mehtod": "PUT",
            "protocol": "http"
          },
          "config": {
            "address": https://ldes.source.com/catalog,
            "catalogue": "ldes-source1-catalogue"
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
            "address": http://piveau-consus-exporting-hub/pipe,
            "mehtod": "PUT",
            "protocol": "http"
          },
          "payload": {
            "header": {
              "dataType": "text",
              "seqNumber": 0
            },
            "body": {
              "dataInfo": {
                "catalogue": "ldes-source1-catalogue",
                "total": 5346
              },
              "dataMimeType": "application/rdf+xml",
              "data": "“<rdf:RDF…”"
            }
          }
        }
      }
    ]
  }
}
```

The `dataInfo` object must contain any useful information. By convention we always put there at least the catalogue name. This is important for the final exporter to know to which catalogue this dataset (event) belongs. This information is not part of the pipe spec and just transported from the beginning (importing) config object to the last segement via the `dataInfo` object of the payload. Both objects are not further defined by the pipe schema.

 
