import { Stream, Writer } from "@ajuvercr/js-runner";

/**
 * @param piveau HTTP piveau reader
 * @param writer JSON object that configures this piveau thing
 * @param reader Response writer for this piveau thing
 */
export function piveau(piveau: Stream<string>, writer: Writer<string>, reader: Stream<string>) {
  piveau.data(config => {
    const descriptor = JSON.parse(config);

  });
}
