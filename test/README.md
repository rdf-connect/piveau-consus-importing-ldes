# Test README

This directory is used for debugging with the same environment on both sides.

The docker compose contains a container with the piveau ldes client, and an http request logger.

Start the docker compose
```sh
bash ./start.sh
```

Start the pipeline (POST either json or yaml file).
```sh
bash ./run.sh
```

I added `ENV DEBUG=*` in the Dockerfile, this enables debug logging.
I also made the dependencies more strict in versioning (we are reworking versions and maybe the state on npm is dodgy).
The piveau config now contains `"ordered": "none"`, just to emit members faster.
` 

