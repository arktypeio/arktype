import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompilePluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { writeFixture } from "./utils.ts"

const conditions = ["ark-ts", "production"]

// what a program logs, its main.ts bundled for production with no member set,
// run from file (a module of its own may import the bundle at ./out/main.js)
const logged = async (
	name: string,
	files: Record<string, string>,
	file = "out/main.js",
	opts?: PrecompilePluginOptions
): Promise<string> => {
	const dir = writeFixture(
		{ "package.json": '{ "type": "module" }', ...files },
		fromHere("temp", "libraries", name)
	)
	await build({
		entryPoints: [join(dir, "main.ts")],
		outfile: join(dir, "out", "main.js"),
		bundle: true,
		platform: "node",
		format: "esm",
		// a CommonJS dependency's require
		banner: {
			js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
		},
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ conditions, cwd: dir, ...opts })]
	})
	const { stdout, stderr } = spawnSync(process.execPath, [join(dir, file)], {
		encoding: "utf8"
	})
	return stdout || stderr
}

// the same, whether the build reads the bundle whole or a module at a time
const loggedEither = async (
	name: string,
	files: Record<string, string>
): Promise<string> => {
	const whole = await logged(name, files)
	attest(
		await logged(`${name}-unscanned`, files, undefined, { prune: false })
	).equals(whole)
	return whole
}

contextualize(function (this: Mocha.Suite) {
	this.timeout(120_000)

	it("MCP's tools/list has a tool's input JSON Schema", async () => {
		const out = await loggedEither("mcp", {
			"main.ts": `import { Client } from "@modelcontextprotocol/client"
import { InMemoryTransport, McpServer } from "@modelcontextprotocol/server"
import { type } from "arktype"

const server = new McpServer({ name: "greeter", version: "1.0.0" })
server.registerTool(
	"greet",
	{ inputSchema: type({ name: "string" }) },
	({ name }) => ({ content: [{ type: "text", text: \`Hello, \${name}!\` }] })
)
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
const client = new Client({ name: "test", version: "1.0.0" })
await server.connect(serverTransport)
await client.connect(clientTransport)
const { tools } = await client.listTools()
console.log(JSON.stringify(tools[0].inputSchema))
await client.close()
`
		})
		attest(out)
			.snap(`{"type":"object","properties":{"name":{"type":"string"}},"required":["name"],"$schema":"https://json-schema.org/draft/2020-12/schema"}
`)
	})

	it("Elysia's OpenAPI document has a route's body JSON Schema", async () => {
		const out = await loggedEither("elysia", {
			"main.ts": `import { openapi } from "@elysiajs/openapi"
import { type } from "arktype"
import { Elysia } from "elysia"

const app = new Elysia()
	.use(openapi())
	.post("/users", ({ body }) => body, { body: type({ name: "string" }) })
const res = await app.handle(new Request("http://localhost/openapi/json"))
const spec = await res.json()
console.log(JSON.stringify(spec.paths["/users"].post.requestBody.content["application/json"].schema))
`
		})
		attest(out)
			.snap(`{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"type":"string"}},"required":["name"]}
`)
	})

	it("the AI SDK passes a tool's input JSON Schema to the model", async () => {
		const out = await loggedEither("ai", {
			"main.ts": `import { generateText, tool } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { type } from "arktype"

const weather = tool({
	inputSchema: type({ city: "string" }),
	execute: async ({ city }) => city
})
const model = new MockLanguageModelV4({
	doGenerate: async (options: any) => {
		console.log(JSON.stringify(options.tools[0].inputSchema))
		return {
			content: [],
			finishReason: { unified: "stop", raw: "stop" },
			usage: {
				inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
				outputTokens: { total: 0, text: 0, reasoning: 0 }
			},
			warnings: []
		} as any
	}
})
await generateText({ model, tools: { weather }, prompt: "weather?" })
`
		})
		attest(out)
			.snap(`{"$schema":"http://json-schema.org/draft-07/schema#","type":"object","properties":{"city":{"type":"string"}},"required":["city"],"additionalProperties":false}
`)
	})

	it("oRPC's OpenAPI document has a procedure's input JSON Schema", async () => {
		const out = await loggedEither("orpc", {
			"main.ts": `import { experimental_ArkTypeToJsonSchemaConverter } from "@orpc/arktype"
import { OpenAPIGenerator } from "@orpc/openapi"
import { os } from "@orpc/server"
import { type } from "arktype"

const createUser = os
	.route({ method: "POST", path: "/users" })
	.input(type({ name: "string" }))
	.handler(({ input }) => input)
const generator = new OpenAPIGenerator({
	schemaConverters: [new experimental_ArkTypeToJsonSchemaConverter()]
})
const spec: any = await generator.generate({ createUser })
console.log(JSON.stringify(spec.paths["/users"].post.requestBody.content["application/json"].schema))
`
		})
		attest(out)
			.snap(`{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"type":"string"}},"required":["name"]}
`)
	})

	it("a module bakes what it reads of a validator it imports, in a build reading one module at a time", async () => {
		const out = await logged(
			"importers",
			{
				"schemas.ts": `import { type } from "arktype"

export const User = type({ name: "string" })
`,
				"schema.ts": `import { User } from "./schemas.ts"

export const schema = User.toJsonSchema()
`,
				"described.ts": `import { read } from "reader"
import { User } from "./schemas.ts"

export const described = read(User, "description")
`,
				"node_modules/reader/package.json":
					'{ "name": "reader", "type": "module", "exports": "./index.js" }',
				"node_modules/reader/index.js":
					"export const read = (schema, key) => schema[key]\n",
				"main.ts": `import { described } from "./described.ts"
import { schema } from "./schema.ts"

console.log(JSON.stringify(schema))
console.log(described)
`
			},
			"out/main.js",
			{ prune: false }
		)
		attest(out)
			.snap(`{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"type":"string"}},"required":["name"]}
{ name: a string }
`)
	})

	it("a module loading another whole bakes each member into each validator it exports", async () => {
		const out = await logged(
			"wholes",
			{
				"schemas.ts": `import { type } from "arktype"

export const User = type({ name: "string" })
`,
				"lazy.ts": `import { type } from "arktype"

export const Item = type({ id: "number" })
`,
				"node_modules/reader/package.json":
					'{ "name": "reader", "type": "module", "exports": "./index.js" }',
				"node_modules/reader/index.js":
					"export const read = (schemas, name, key) => schemas[name][key]\n",
				"main.ts": `import { read } from "reader"
import * as schemas from "./schemas.ts"

console.log(read(schemas, "User", "description"))
console.log(read(await import("./lazy.ts"), "Item", "expression"))
`
			},
			"out/main.js",
			{ prune: false }
		)
		attest(out).snap(`{ name: a string }
{ id: number }
`)
	})

	it("an entry's export bakes nothing, so a read outside the bundle throws", async () => {
		const out = await logged(
			"entry",
			{
				"main.ts": `import { type } from "arktype"

export const User = type({ name: "string" })
`,
				"reader.js": `import { User } from "./out/main.js"

console.log(User({ name: "Ada" }).name)
for (const member of ["expression", "toJsonSchema"]) {
	try {
		User[member]
	} catch (e) {
		console.log(e.message)
	}
}
try {
	User["~standard"].jsonSchema
} catch (e) {
	console.log(e.message)
}
`
			},
			"reader.js"
		)
		attest(out).snap(`Ada
expression isn't baked into this validator, as the build saw no code read it. Set members["expression"] true in the precompile options.
toJsonSchema isn't baked into this validator, as the build saw no code read it. Set members["toJsonSchema"] true in the precompile options.
~standard.jsonSchema isn't baked into this validator, as the build saw no code read it. Set members["~standard.jsonSchema"] true in the precompile options.
`)
	})
})
