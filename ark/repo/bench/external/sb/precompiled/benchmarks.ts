import { getVersion } from "@schema-benchmarks/utils/node" with { type: "macro" };
import ts from "dedent";

import type { StringBenchmarkConfig } from "#src";
import { assertNotReached, defineBenchmarks } from "#src";

import { getArkTypeSchema, isErrors, stringAllows } from "./compiled/index.mjs";

const createStringBenchmark = (format: keyof typeof stringAllows): StringBenchmarkConfig => ({
  create() {
    return stringAllows[format]();
  },
  snippet: ts`type("string.${format}")`,
});

const schema = getArkTypeSchema();

export default defineBenchmarks({
  library: {
    name: "arktype (precompiled)",
    optimizeType: "precompiled",
    version: await getVersion("arktype"),
  },
  // created as its module loaded, as a compiled library's arm reads its compiled schema
  initialization: {
    run() {
      return schema;
    },
    snippet: ts`schema`,
  },
  validation: {
    run(data) {
      return schema.allows(data);
    },
    snippet: ts`schema.allows(data)`,
  },
  parsing: {
    allErrors: {
      run(data) {
        return schema(data);
      },
      validateResult: (result) => !isErrors(result),
      getData: (result) => (isErrors(result) ? undefined : result),
      snippet: ts`schema(data)`,
    },
  },
  standard: {
    allErrors: { schema },
  },
  string: {
    "date-time": createStringBenchmark("date-time"),
    email: createStringBenchmark("email"),
    url: createStringBenchmark("url"),
    uuid: createStringBenchmark("uuid"),
    ipv4: createStringBenchmark("ipv4"),
    ipv6: createStringBenchmark("ipv6"),
  },
  stack: {
    throw: (data) => {
      schema.assert(data);
      assertNotReached();
    },
    snippet: ts`schema.assert(data)`,
  },
});
