import { attest, contextualize } from "@ark/attest"
import { Precompiler, type PrecompileOptions } from "@ark/aot"
import { scanProgram } from "@ark/aot/internal/scan.ts"
import { posix } from "node:path"
import { memoryHost } from "./utils.ts"

// what a production build bakes into each validator of a program from
// /main.ts, its dependencies in /node_modules/<name>/index.js
const bakedFrom = async (
	files: Record<string, string>,
	opts?: PrecompileOptions
) => {
	const precompiler = new Precompiler(memoryHost(files), { cwd: "/", ...opts })
	const scanned = await scanProgram("test", [{ id: "/main.ts" }], {
		resolve: async (specifier, importer) => {
			const id =
				specifier.startsWith(".") ?
					posix.join(posix.dirname(importer), specifier)
				:	`/node_modules/${specifier}/index.js`
			return id in files ? id : undefined
		},
		readFile: id => files[id],
		isTransformed: id => !id.startsWith("/node_modules/"),
		idOf: id => id,
		cwd: "/"
	})
	if (typeof scanned === "string") return scanned
	const usage = precompiler.scan(scanned)
	if (!usage.baked) return usage.unpruned
	// then the warning, where it lost track of a validator
	return usage.lost ? [...usage.baked, usage.lost] : usage.baked
}

const mcp = `export class McpServer {
	_tools = {}
	registerTool(name, config, cb) {
		const { inputSchema } = config
		this._tools[name] = { inputSchema, cb }
	}
	list() {
		return Object.entries(this._tools).map(([name, tool]) => ({
			name,
			inputSchema: toJsonSchema(tool.inputSchema)
		}))
	}
}

const toJsonSchema = schema => {
	const std = schema["~standard"]
	if (std.jsonSchema) return std.jsonSchema.input({ target: "draft-2020-12" })
	throw new Error("no JSON Schema")
}
`

const validate = `export const validate = (schema, data) =>
	schema["~standard"].validate(data)
`

contextualize(function (this: Mocha.Suite) {
	this.timeout(60_000)

	it("follows a field a dependency stores it at to the read", async () => {
		attest(
			await bakedFrom({
				"/node_modules/mcp/index.js": mcp,
				"/main.ts": `import { type } from "arktype"
import { McpServer } from "mcp"

const server = new McpServer()
server.registerTool("greet", { inputSchema: type({ name: "string" }) }, () => {})
console.log(server.list())
`
			})
		).snap(["main.ts:5:45 bakes ~standard.jsonSchema (fields)"])
	})

	it("bakes nothing where its readers only validate", async () => {
		attest(
			await bakedFrom({
				"/node_modules/validate/index.js": validate,
				"/main.ts": `import { type } from "arktype"
import { validate } from "validate"

console.log(validate(type("string"), "a"))
`
			})
		).snap(["main.ts:4:22 bakes nothing (dataflow)"])
	})

	it("follows a vendor check to the branch arktype takes", async () => {
		attest(
			await bakedFrom({
				"/node_modules/convert/index.js": `export const convert = schema => {
	const std = schema["~standard"]
	if (std.vendor === "arktype") return schema.toJsonSchema()
	return std.jsonSchema.input({ target: "draft-07" })
}
`,
				"/main.ts": `import { type } from "arktype"
import { convert } from "convert"

console.log(convert(type("string")))
`
			})
		).snap(["main.ts:4:21 bakes toJsonSchema (dataflow)"])
	})

	it("a template and JSON.stringify read expression and toJSON", async () => {
		attest(
			await bakedFrom({
				"/node_modules/log/index.js": `export const log = schema =>
	console.log(\`\${schema}\`, JSON.stringify({ schema }))
`,
				"/main.ts": `import { type } from "arktype"
import { log } from "log"

log(type("string"))
`
			})
		).snap(["main.ts:4:5 bakes expression, toJSON (dataflow)"])
	})

	it("bakes every member where it's read at a computed key", async () => {
		attest(
			await bakedFrom({
				"/node_modules/read/index.js": `export const read = (schema, key) => schema[key]
`,
				"/main.ts": `import { type } from "arktype"
import { read } from "read"

console.log(read(type("string"), process.argv[2]))
`
			})
		).snap([
			"main.ts:4:18 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"precompile: baking each introspection member into the validator at main.ts:4:18, because node_modules/read/index.js:1:38 reads it at a computed key. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
		])
	})

	it("bakes every member where a Map holds it", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

const types = new Map([["T", type("string")]])
console.log(types.size)
`
			})
		).snap([
			"main.ts:3:30 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"precompile: baking each introspection member into the validator at main.ts:3:30, because main.ts:3:23 stores it at a key the build can't name. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
		])
	})

	it("bakes every member where the global object holds it", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

globalThis.T = type("string")
`
			})
		).snap([
			"main.ts:3:16 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"precompile: baking each introspection member into the validator at main.ts:3:16, because main.ts:3:1 stores it on the global object, which code outside the bundle may read. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
		])
	})

	it("an entry's export bakes nothing, as code outside the bundle reads it", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

export const T = type("string")
`
			})
		).snap([
			"main.ts:3:18 bakes nothing (dataflow; main.ts exports T, which code outside the bundle may read)"
		])
	})

	it("a module's export bakes what its importers read", async () => {
		attest(
			await bakedFrom({
				"/node_modules/describe/index.js": `export const describe = schema => schema.description
`,
				"/user.ts": `import { type } from "arktype"

export const User = type({ name: "string" })
`,
				"/main.ts": `import { describe } from "describe"
import { User } from "./user.ts"

console.log(describe(User))
`
			})
		).snap(["user.ts:3:21 bakes description (dataflow)"])
	})

	it("decides only the members members leaves unset", async () => {
		attest(
			await bakedFrom(
				{
					"/node_modules/read/index.js": `export const read = schema => [
	schema.toJsonSchema(),
	schema.description,
	schema.expression
]
`,
					"/main.ts": `import { type } from "arktype"
import { read } from "read"

console.log(read(type("string")))
`
				},
				{ members: { toJsonSchema: false, expression: true } }
			)
		).snap(["main.ts:4:18 bakes description (dataflow)"])
	})
})
