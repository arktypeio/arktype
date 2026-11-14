// arktype's entry (../index.ts, ../benchmarks.ts) as the precompiler builds it: generate.ts compiles
// this module like zod-compiler's, so its Types are precompiled validators. The schema is ../index.ts
// verbatim; each string format is written out, as a build reads only a literal definition.
import { type } from "arktype";

export function getArkTypeSchema() {
  const image = type({
    id: "number",
    created: "Date",
    title: "1<=string<=100",
    type: "'jpg'|'png'",
    size: "number",
    url: "string.url",
  });
  const rating = type({
    id: "number",
    stars: "1<=number<=5",
    title: "1<=string<=100",
    text: "1<=string<=1000",
    images: image.array(),
  });
  return type({
    id: "number",
    created: "Date",
    title: "1<=string<=100",
    brand: "1<=string<=30",
    description: "1<=string<=500",
    price: "1<=number<=10000",
    discount: "1<=number<=100|null",
    quantity: "0<=number<=10",
    tags: "(1<=string<=30)[]",
    images: image.array(),
    ratings: rating.array(),
  });
}

export const isErrors = (result: unknown) => result instanceof type.errors;

export const stringAllows = {
  "date-time": () => type("string.date.iso").allows,
  email: () => type("string.email").allows,
  url: () => type("string.url").allows,
  uuid: () => type("string.uuid").allows,
  ipv4: () => type("string.ip.v4").allows,
  ipv6: () => type("string.ip.v6").allows,
};
