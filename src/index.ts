import { Stream } from "@ajuvercr/js-runner";
import { getCurrentSegment, piveauInstance, Send } from "./piveau";
import { Config, intoConfig, replicateLDES } from "ldes-client";
import * as N3 from "n3";

/**
 * @param piveau HTTP piveau reader
 */
export function piveau(piveau: Stream<string>) {
  piveau.data((config) => {
    const descriptor = JSON.parse(config);
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

export function consoleLog(stream: Stream<string>) {
  stream.data((x) => {
    const json = JSON.parse(x);
    const seg = getCurrentSegment(json);
    console.log(seg.body.payload?.body.data);
  });
}
