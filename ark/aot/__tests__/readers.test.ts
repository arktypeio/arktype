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

	it("follows a field to reads at a key they don't name", async () => {
		attest(
			await bakedFrom({
				"/node_modules/store/index.js": `const state = {}
export const keep = holder => {
	state.held = holder
}
export const show = () => {
	const held = state.held
	for (const key in held) console.log(\`\${held[key]}\`)
	console.log(Reflect.get(held, "w").description, Object.values(held)[2].json)
	console.log(JSON.stringify({ ...held }))
}
`,
				"/main.ts": `import { type } from "arktype"
import { keep, show } from "store"

keep({ v: type("string"), w: type("number"), x: type("boolean") })
show()
`
			})
		).snap([
			"main.ts:4:11 bakes expression, json, toJSON (fields)",
			"main.ts:4:30 bakes expression, description, json, toJSON (fields)",
			"main.ts:4:49 bakes expression, json, toJSON (fields)"
		])
	})

	it("follows a field read an object literal holds", async () => {
		attest(
			await bakedFrom({
				"/node_modules/store/index.js": `const state = {}
export const keep = schema => {
	state.v = schema
}
export const show = () => {
	const wrapped = { v1: state.v }
	console.log(wrapped.v1.description)
}
`,
				"/main.ts": `import { type } from "arktype"
import { keep, show } from "store"

keep(type("string"))
show()
`
			})
		).snap(["main.ts:4:6 bakes description (fields)"])
	})

	it("follows a validator assigned to a declared binding", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

let json
json = type("string")
console.log(JSON.stringify(json))
let described
for (const key in { a: 1 }) described = { a: type("number") }[key]
console.log(described.description)
`
			})
		).snap([
			"main.ts:4:8 bakes toJSON (dataflow)",
			"main.ts:7:46 bakes description (dataflow)"
		])
	})

	it("follows a value Object.defineProperty defines to its key", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

const holder = {}
Object.defineProperty(holder, "schema", { value: type("string"), enumerable: true })
console.log(holder.schema.description)
Object.defineProperty(globalThis, "Schema", { value: type("number") })
`
			})
		).snap([
			"main.ts:4:50 bakes description (fields)",
			"main.ts:6:54 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"precompile: baking each introspection member into the validator at main.ts:6:54, because main.ts:6:1 stores it on the global object, which code outside the bundle may read. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
		])
	})

	it("bakes every member where a dependency lists its keys", async () => {
		attest(
			await bakedFrom({
				"/node_modules/keys/index.js": `export const keysOf = schema => Object.keys(schema)
export const forIn = schema => {
	for (const key in schema) console.log(key)
}
`,
				"/main.ts": `import { type } from "arktype"
import { forIn, keysOf } from "keys"

console.log(keysOf(type("string")))
forIn(type("number"))
`
			})
		).snap([
			"main.ts:4:20 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"main.ts:5:7 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"precompile: baking each introspection member into 2 validators, like the one at main.ts:4:20, because node_modules/keys/index.js:1:33 lists its keys. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
		])
	})

	it("a dependency's read at a key it doesn't name loses track without a warning", async () => {
		attest(
			await bakedFrom({
				"/node_modules/server/index.js": `const state = {}
export const register = schema => {
	state.schema = schema
}
export const list = () =>
	state.schema["~standard"].jsonSchema.input({ target: "draft-2020-12" })
export const clone = from => {
	const to = {}
	for (const k in from) to[k] = from[k]
	return to
}
`,
				"/main.ts": `import { type } from "arktype"
import { clone, list, register } from "server"

register(type("string"))
console.log(list(), clone({ a: 1 }))
`
			})
		).snap([
			"main.ts:4:10 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)"
		])
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

	it("converting an array holding it reads its expression", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

console.log(String([type("string")]), \`\${[[type("number")]]}\`)
`
			})
		).snap([
			"main.ts:3:21 bakes expression (dataflow)",
			"main.ts:3:44 bakes expression (dataflow)"
		])
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

	it("bakes every member where a TypeScript namespace exports it", async () => {
		attest(
			await bakedFrom({
				"/main.ts": `import { type } from "arktype"

namespace Schemas {
	export const User = type({ name: "string" })
}
console.log(Schemas.User.expression)
`
			})
		).snap([
			"main.ts:4:22 bakes expression, description, json, toJSON, toJsonSchema, ~standard.jsonSchema (lost)",
			"precompile: baking each introspection member into the validator at main.ts:4:22, because main.ts:4:15 exports it from a namespace. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
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
