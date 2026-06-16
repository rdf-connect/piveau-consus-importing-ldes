FROM node:24-alpine as base
RUN apk add --no-cache bash

WORKDIR /app

ENV LDES_PORT=3000
ENV NODE_OPTIONS=--max-old-space-size=4096
# ENV DEBUG=*

# install dependencies into temp directory
# this will cache them and speed up future builds
COPY . .
RUN npm install
RUN npm run build

EXPOSE 3000

ENTRYPOINT [ "npx", "rdfc", "pipeline.ttl"]
