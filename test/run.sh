#!/bin/bash

curl -X POST -H 'content-type: application/json' localhost:3000 --data-binary @./pipe-ldes-test-catalogue.yaml

