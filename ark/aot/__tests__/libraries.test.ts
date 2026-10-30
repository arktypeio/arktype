import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile } from "@ark/aot/unplugin"
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
	file = "out/main.js"
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
		plugins: [precompile.esbuild({ conditions, cwd: dir })]
	})
	const { stdout, stderr } = spawnSync(process.execPath, [join(dir, file)], {
		encoding: "utf8"
	})
	return stdout || stderr
}

contextualize(function (this: Mocha.Suite) {
	this.timeout(120_000)

	it("MCP's tools/list has a tool's input JSON Schema", async () => {
		const out = await logged("mcp", {
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
		const out = await logged("elysia", {
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
		const out = await logged("ai", {
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
		const out = await logged("orpc", {
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
