import { Descriptor, getCurrentSegment, piveauInstance, Send } from "./piveau";
import { Config, enhanced_fetch, intoConfig, replicateLDES } from "ldes-client";
import * as http from "http"
import * as N3 from "n3";
import * as yaml from "js-yaml";
import { Processor, Reader, Writer } from "@rdfc/js-runner";
import { Logger } from "winston";

type GreetFunction<T> = (a: T) => void;
interface Stream<T> {
    data(func: GreetFunction<T>): void;
}

type OutArgs = {
    output: Writer,
    port: number,
    host: string,
    statusCode: number,
}

export class HTTPConsumer extends Processor<OutArgs> {
    server: http.Server;
    constructor(args: OutArgs, logger: Logger) {
        super(Object.assign({ port: 3000, host: "0.0.0.0", statusCode: 200 }, args), logger);
        this.server = http.createServer((req, res) => {
            this.logger.info("Got input");
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                this.logger.info("sending body " + body.length);
                await args.output.string(body);
                res.writeHead(args.statusCode);
                res.end()
            });
        });
    }

    async init(this: OutArgs & this): Promise<void> { }

    async transform(this: OutArgs & this): Promise<void> {
        this.server.listen(this.port, this.host, () => {
            this.logger.info(`Server running at http://${this.host}:${this.port}/`);
        });
    }

    async produce(this: OutArgs & this): Promise<void> { }
}




type Args = {
    input: Reader,
    output?: Writer,
}
export class Piveau extends Processor<Args> {
    async init(this: Args & this): Promise<void> { }

    async transform(this: Args & this): Promise<void> {
        for await (const config of this.input.strings()) {
            this.logger.info("body received " + config.length);
            const descriptor = parse_descriptor(config);
            piveauInstance<Config>(
                descriptor,
                async (x, send) => {
                    try {
                        await this.handleConfig(x, send)
                    } catch (ex) {
                        if (ex instanceof Error) {
                            console.log(ex.name, ex.message, ex.cause)
                            console.log(ex.stack);
                        } else {
                            console.log(ex);
                        }
                        throw ex;
                    }
                }
            );
        }
    }

    async handleConfig(
        this: Args & this,
        config: Partial<Config> & {
            url: string;
            ordered?: "ascending" | "descending" | "none";
            fetchConfig?: {}
        },
        send: Send,
    ) {
        config.onlyDefaultGraph = true;
        const fetch_f = enhanced_fetch({
            safe: true, concurrent: 1, retry: {
                maxRetries: 5
            },
        },
            (a, b) => {
                return fetch(a, b)
            })

        const client = replicateLDES(
            intoConfig({
                url: config.url,
                fetch: fetch_f
            }),
            config.ordered || "none",
        );

        this.logger.info("Building LDES client " + JSON.stringify(config))

        const reader = client.stream({ highWaterMark: 10 }).getReader();
        this.logger.info("Reader built")
        let el = await reader.read();
        let count = 0;
        while (el) {
            if (el.value) {
                count += 1;

                const str = new N3.Writer({
                    format: "application/N-Quads",
                }).quadsToString(el.value!.quads);

                if (this.output) {
                    await this.output.string(str);
                }
                await send(str);
            }

            if (el.done) {
                break;
            }

            el = await reader.read();
        }
    }

    async produce(this: Args & this): Promise<void> { }
}

export class ConsoleLog extends Processor<Args> {
    async init(this: Args & this): Promise<void> { }

    async transform(this: Args & this): Promise<void> {
        for await (const x of this.input.strings()) {
            const json = parse_descriptor(x);
            const seg = getCurrentSegment(json);
            console.log(seg.body.payload?.body.data);
        }
    }
    async produce(this: Args & this): Promise<void> { }
}


function parse_descriptor(input: string): Descriptor {
    try {
        return JSON.parse(input);
    } catch (ex) {
        return <Descriptor>yaml.load(input);
    }
}

