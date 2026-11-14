// writes ajv's standalone code for schemabenchmarks.dev's product schema into
// its ajv entry (libraries/ajv/standalone/product.mjs), with the download test
// entry that calls it (download/standalone.ts), so the suite sizes ajv as
// precompiled the way it sizes ArkType: the same schema and options as its
// download/index.ts, compiled ahead of time. ajv-keywords' instanceof is a
// compile-time function standalone code can't emit, so it's the equivalent
// code keyword. The runtime helpers ajv's ESM output still requires are
// imported, so a bundler includes them
// SB=<schema-benchmarks clone, installed> node sb/ajvStandalone.ts
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

const entry = join(process.env.SB!, "schemas/libraries/ajv")
const source = readFileSync(join(entry, "download/index.ts"), "utf8")
const replacements: [string, string][] = [
	[
		`import { Ajv, type JSONSchemaType } from "ajv";`,
		`import { Ajv, type JSONSchemaType } from "ajv";
import { _, Name } from "ajv/dist/compile/codegen/index.js";
import standaloneCode from "ajv/dist/standalone/index.js";`
	],
	[`import addKeywords from "ajv-keywords";\n`, ""],
	[
		"const ajv = new Ajv();",
		'const ajv = new Ajv({ code: { source: true, esm: true, formats: _`require("ajv-formats/dist/formats").fullFormats` } });'
	],
	[
		`addKeywords(ajv, ["instanceof"]);`,
		`ajv.addKeyword({ keyword: "instanceof", schemaType: "string", code: cxt => cxt.fail(_\`!(\${cxt.data} instanceof \${new Name(cxt.schema)})\`) });`
	],
	[
		"ajv.validate(productSchema, {});",
		"export default standaloneCode.default(ajv, ajv.compile(productSchema));"
	]
]
let generator = source
for (const [from, to] of replacements) {
	if (!generator.includes(from))
		throw new Error(`ajv's download entry no longer has ${from}`)
	generator = generator.replace(from, to)
}
const generatorPath = join(entry, "standaloneGenerator.ts")
writeFileSync(generatorPath, generator)
const { default: code }: { default: string } = await import(
	pathToFileURL(generatorPath).href
)
rmSync(generatorPath)

const imports: string[] = []
const esm = code.replace(
	/const (\w+) = require\("([^"]+)"\)\.default;/g,
	(_, name: string, specifier: string) => {
		imports.push(`import * as ${name}Module from "${specifier}.js";`)
		return `const ${name} = ${name}Module.default;`
	}
)
mkdirSync(join(entry, "standalone"), { recursive: true })
writeFileSync(
	join(entry, "standalone/product.mjs"),
	`${imports.join("\n")}\n${esm}`
)
writeFileSync(
	join(entry, "download/standalone.ts"),
	`// @ts-expect-error written by arktype's bench/external/sb/ajvStandalone.ts
import validate from "../standalone/product.mjs";

validate({});
`
)
