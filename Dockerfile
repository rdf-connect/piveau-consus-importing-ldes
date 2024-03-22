FROM node:21-alpine as base

WORKDIR /app

ENV LDES_PORT=3000
RUN npm install -g @ajuvercr/js-runner

# install dependencies into temp directory
# this will cache them and speed up future builds
COPY . .
RUN npm install
RUN npm run build

EXPOSE 3000

ENTRYPOINT [ "npx", "js-runner", "pipeline.ttl"]
