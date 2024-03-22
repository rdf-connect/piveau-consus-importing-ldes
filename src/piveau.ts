export type Header = {
  id: string;
  runId: string;
  startTime: string;
  name: string;
  title: string;
  version: string;
  context: string;
  transport: string;
};

export type SegmentHeader = {
  name: string;
  segmentNumber: number;
  title: string;
  processed: boolean;
};

export type SegmentEndpoint = {
  address: string;
  method: "PUT";
  protocol: "http";
};

export type Payload = {
  header: {
    dataType: "text";
    seqNumber: number;
  };
  body: {
    dataInfo: {
      catalogue: string;
    };
    dataMimeType: "application/trig";
    data: string;
  };
};

export type Descriptor = {
  header: Header;
  body: { segments: Segment[] };
};

export type Segment<C = any> = {
  header: SegmentHeader;
  body: {
    endpoint: SegmentEndpoint;
    config?: { catalogue: string } & C;
    payload?: Payload;
  };
};

export function getCurrentSegment<T>(descriptor: Descriptor): Segment<T> {
  const unprocessed = descriptor.body.segments.filter(
    (x) => !x.header.processed,
  );
  const minId = Math.min(...unprocessed.map((x) => x.header.segmentNumber));
  return unprocessed.find((x) => x.header.segmentNumber === minId)!;
}

export type Send = (item: string) => Promise<void>;
export type Callback<C> = (config: C, send: Send) => void;

export function piveauInstance<C>(descriptor: Descriptor, cb: Callback<C>) {
  const segment = getCurrentSegment<C>(descriptor);
  segment.header.processed = true;

  const nextSegment = getCurrentSegment(descriptor);
  const endpoint = nextSegment.body.endpoint;

  const send = async (item: any) => {
    const payload: Payload = {
      header: {
        seqNumber: 0,
        dataType: "text",
      },
      body: {
        dataMimeType: "application/trig",
        dataInfo: {
          catalogue: segment.body.config!.catalogue,
        },
        data: item,
      },
    };

    nextSegment.body.payload = payload;

    const resp = await fetch(endpoint.address, {
      body: JSON.stringify(descriptor),
      method: "PUT",
      headers: { "content-type": "application/json" },
    });

    if (!resp.ok) {
      throw "Response was not okay " + resp.statusText;
    }

    await resp.blob();
  };

  cb(segment.body.config!, send);
}
