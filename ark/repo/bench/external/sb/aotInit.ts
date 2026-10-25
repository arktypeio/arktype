// gives each ahead-of-time entry of schemabenchmarks.dev an initialization
// case like ArkType's precompiled one, which returns the validators its build
// wrote: ajv's standalone code (sb/ajvStandalone.ts writes it), zod-compiler's
// and @paseri/compiler's compiled schemas. The suite times initialization only
// for libraries that build a schema at runtime, typia's factories included
// SB=<schema-benchmarks clone, after sb/ajvStandalone.ts> node sb/aotInit.ts
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const libraries = join(process.env.SB!, "schemas/libraries")
const standalone = join(libraries, "ajv/standalone")

// the suite's build leaves ajv external, and Node reads a CommonJS module's
// default export as its exports object, where a bundler reads exports.default
writeFileSync(
	join(standalone, "product.node.mjs"),
	readFileSync(join(standalone, "product.mjs"), "utf8").replace(
		/const (\w+) = (\w+Module)\.default;/g,
		"const $1 = $2.default.default ?? $2.default;"
	)
)

writeFileSync(
	join(libraries, "ajv/standalone/benchmarks.ts"),
	`import { getVersion } from "@schema-benchmarks/utils/node" with { type: "macro" };
import ts from "dedent";

import { defineBenchmarks } from "#src";

// @ts-expect-error written by arktype's bench/external/sb/ajvStandalone.ts
import validate from "./product.node.mjs";

export default defineBenchmarks({
  library: {
    name: "ajv",
    optimizeType: "precompiled",
    version: await getVersion("ajv"),
  },
  initialization: {
    run() {
      return validate;
    },
    note: "standalone",
    snippet: ts\`standaloneCode(ajv, ajv.compile(schema))\`,
  },
});
`
)

const addInitialization = (path: string, before: string, schema: string) => {
	const file = join(libraries, path)
	const source = readFileSync(file, "utf8")
	if (!source.includes(before))
		throw new Error(`${path} no longer has ${before.trim()}`)
	writeFileSync(
		file,
		source.replace(
			before,
			`  initialization: {
    run() {
      return ${schema};
    },
    snippet: ts\`${schema}\`,
  },
${before}`
		)
	)
}

addInitialization("zod-compiler/benchmarks.ts", "  validation: [", "schema")
addInitialization("@paseri/compiler/benchmarks.ts", "  parsing: {", "schema")
