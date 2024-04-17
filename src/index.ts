import { Stream } from "@ajuvercr/js-runner";
import { Descriptor, getCurrentSegment, piveauInstance, Send } from "./piveau";
import { Config, intoConfig, replicateLDES } from "ldes-client";
import * as N3 from "n3";
import * as yaml from "js-yaml";

/**
 * @param piveau HTTP piveau reader
 */
export function piveau(piveau: Stream<string>) {
  piveau.data((config) => {
    const descriptor = parse_descriptor(config);
    piveauInstance<Config>(
      descriptor,
      async (
        config: Partial<Config> & {
          url: string;
          ordered?: "ascending" | "descending" | "none";
        },
        send: Send,
      ) => {
        config.onlyDefaultGraph = true;
        const client = replicateLDES(
          intoConfig(config),
          undefined,
          undefined,
          config.ordered || "none",
        );

        const reader = client.stream({ highWaterMark: 10 }).getReader();
        let el = await reader.read();
        let count = 0;
        while (el) {
          if (el.value) {
            count += 1;

            const str = new N3.Writer({
              format: "application/trig",
            }).quadsToString(el.value!.quads);

            await send(str);
          }

          if (el.done) {
            break;
          }

          el = await reader.read();
        }
      },
    );
  });
  return () => {
    console.log("Starting piveau");
  };
}

function parse_descriptor(input: string): Descriptor {
  try {
    return JSON.parse(input);
  } catch (ex) {
    return <Descriptor>yaml.load(input);
  }
}

export function consoleLog(stream: Stream<string>) {
  stream.data((x) => {
    const json = parse_descriptor(x);
    const seg = getCurrentSegment(json);
    console.log(seg.body.payload?.body.data);
  });
}
