import http from "http";

const PORT = process.env.PORT || 8080;

let requestCount = 0;

function handler(req, res) {
    requestCount += 1;
    console.log(`[${requestCount}] ${req.method} ${req.url}`);
    let body = "";
    req.on("data", (chunk) => {
        body += chunk.toString();
    });
    req.on("end", () => {
        console.log(`[${requestCount}] body: ${
            JSON.parse(body).body.segments[1].body.payload.body.data.slice(0, 100)
        }...`);
        res.writeHead(200);
        res.end();
    });
}

const server = http.createServer(handler);

server.listen(PORT, () => {
    console.log(`Test server listening on port ${PORT}`);
});
