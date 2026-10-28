import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile } from "@ark/aot/unplugin"
import { build, type Plugin } from "esbuild"
import { join } from "node:path"
import { run, writeFixture } from "./utils.ts"

const conditions = ["ark-ts"]

// each input's issues as code, path, data and expected, and their messages but
// for what the value was, which only arktype writes; or what it's morphed to
const observe = `const observed: Record<string, unknown[]> = {}
const observe = (name: string, T: (data: unknown) => unknown, ...inputs: unknown[]) => {
	observed[name] = inputs.map(data => {
		const out = T(data)
		return (
			out instanceof type.errors ?
				[
					out.issues.map(({ code, path, data, expected }) => ({ code, path, data, expected })),
					out.issues.map(issue => issue.message.replace(/ \\(was [^]*\\)$/, "")).join("\\n")
				]
			: Array.isArray(out) && "index" in out ?
				[...out, out.index, (out as RegExpExecArray).groups]
			: out
		)
	})
}`

const root = writeFixture(
	{
		"types.ts": `import { type } from "arktype"

const readJson = (s: string): unknown => JSON.parse(s)
const decode = (s: string) => atob(s)

export const Parsed = type("string").pipe.try(readJson)
export const Refused = type("string").pipe.try(s => {
	if (s !== "ok") throw s
	return s
})
export const Reported = type("string").pipe.try((s, ctx) =>
	s.length ? s : ctx.error("non-empty")
)
export const Payload = type({
	payload: type("string.base64").pipe.try(decode).to("string > 0"),
	"json?": type("string").pipe.try(readJson)
})
export const Either = type("number").or(type("string").pipe.try(readJson))
export const Version = type("x/^v([0-9]+)$/")
export const Versioned = type({ v: "x/^v([0-9]+)$/" }).or("number")
// declared without a name, which a nested expression prints as fn
const isPositive = [(n: number) => n > 0][0]
export const Nested = type({ values: type("number").narrow(isPositive).array() })
export const Json = type("string.json")
export const Keyed = type({ "first-name": "string", 0: "number" })
`,
		"scoped.ts": `import { scope } from "arktype"

const isEven = (n: number) => n % 2 === 0

export const $ = scope({
	even: ["number", ":", isEven],
	evens: () => $.type("even[]")
})
// a program that never resolves the thunk
export const Pair = $.type({ first: "even", rest: "even[]" })

const $posts = scope({
	topic: ["string", ":", (s: string) => s.length > 0],
	Post: { body: "string", "replies?": () => $posts.type("Post[]") }
})
// annotated, as its inferred type is cyclic
export const Post: (data: unknown) => unknown = $posts.export().Post
`,
		"held.ts": `import { type } from "arktype"
import { config } from "./config.ts"

const Password = type("string > 0").narrow(s => s !== "x")
const fields = { current: Password, next: Password }
const labels = { message: config.message }

export const Change = type(fields)
export const Named = type({ ...fields, name: "string" }).configure(config)
export const Id = type("string.uuid").configure({ ...labels, expected: "an id" })
`,
		"config.ts": `export const message = (ctx: { propString: string; expected: string }) =>
	\`\${ctx.propString || "it"} must \${ctx.expected}\`
export const config = { message }
`,
		"main.ts": `import { type } from "arktype"
import { Either, Json, Keyed, Nested, Parsed, Payload, Refused, Reported, Version, Versioned } from "./types.ts"
import { Pair, Post } from "./scoped.ts"
import { Change, Id, Named } from "./held.ts"

${observe}

observe("Parsed", Parsed, '{"a":1}', "{", 5)
observe("Refused", Refused, "ok", "no")
observe("Reported", Reported, "a", "")
observe("Payload", Payload, { payload: "YQ==", json: "1" }, { payload: "", json: "{" }, { payload: "!" }, {})
observe("Either", Either, 1, "[1]", "{")
observe("Version", Version, "v12", "x")
observe("Versioned", Versioned, { v: "v3" }, { v: "3" }, 2)
observe("Pair", Pair, { first: 2, rest: [] }, { first: 1, rest: [3] })
observe("Post", Post, { body: "a", replies: [{ body: "b" }] }, { body: "a", replies: [{ body: 1 }] })
observe("Change", Change, { current: "a", next: "b" }, { current: "x", next: "" })
observe("Named", Named, { current: "a", next: "b", name: "n" }, { current: "x", next: "", name: 1 })
observe("Id", Id, "123e4567-e89b-12d3-a456-426614174000", "nope")
observed.Nested = [Nested.expression, Nested.description]
observe("Json", Json, "{", "[]")
observe("Keyed", Keyed, { "first-name": 1, 0: 0 })
console.log(JSON.stringify(observed))
`
	},
	fromHere("temp", "bundled")
)

type Observed = Record<string, unknown[]>

const bundled = async (plugins: Plugin[]): Promise<[Observed, string]> => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins
	})
	const js = outputFiles[0].text
	return [JSON.parse(run(js)), js]
}

contextualize(() => {
	let arktype: Observed
	let standalone: Observed

	before(async () => {
		;[arktype] = await bundled([])
		let js: string
		;[standalone, js] = await bundled([precompile.esbuild({ conditions })])
		// no Type is left to arktype
		attest(js.includes("tryPipe")).equals(false)
	})

	const observed = (name: string) => {
		attest(standalone[name]).equals(arktype[name])
		return attest(standalone[name])
	}

	it("pipe.try's morph returning or throwing an Error", () => {
		observed("Parsed").snap([
			{ a: 1 },
			[
				[
					{
						code: "predicate",
						path: [],
						data: "{",
						expected: "valid according to readJson"
					}
				],
				"must be valid according to readJson"
			],
			[
				[{ code: "domain", path: [], data: 5, expected: "a string" }],
				"must be a string"
			]
		])
	})

	it("pipe.try's morph raising with ctx.error", () => {
		observed("Reported").snap([
			"a",
			[
				[{ code: "predicate", path: [], data: "", expected: "non-empty" }],
				"must be non-empty"
			]
		])
	})

	it("pipe.try's morph throwing a non-Error", () => {
		observed("Refused").snap([
			"ok",
			[
				[
					{
						code: "predicate",
						path: [],
						data: "no",
						expected: "valid according to an anonymous predicate"
					}
				],
				"must be valid according to an anonymous predicate"
			]
		])
	})

	it("pipe.try in an object, piped to a Type", () => {
		observed("Payload").snap([
			{ payload: "a", json: 1 },
			[
				[
					{
						code: "minLength",
						path: ["payload"],
						data: "",
						expected: "non-empty"
					},
					{
						code: "predicate",
						path: ["json"],
						data: "{",
						expected: "valid according to readJson"
					}
				],
				"payload must be non-empty\njson must be valid according to readJson"
			],
			[
				[
					{
						code: "pattern",
						path: ["payload"],
						data: "!",
						expected: "base64-encoded"
					}
				],
				"payload must be base64-encoded"
			],
			[
				[
					{
						code: "required",
						path: ["payload"],
						data: {},
						expected: "a string"
					}
				],
				"payload must be a string"
			]
		])
	})

	it("a keyword's issue writes the SyntaxError it caught", () => {
		attest(standalone.Json).equals(arktype.Json)
		attest(standalone.Json[0]).snap([
			[{ code: "predicate", path: [], data: "{", expected: "a JSON string" }],
			"must be a JSON string (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2))"
		])
	})

	// arktype's message starts with "value at", as any does whose path starts
	// with a bracket
	it("a key that isn't an identifier is bracketed", () => {
		const issuesOf = (observed: Observed) => (observed.Keyed[0] as unknown[])[0]
		attest(issuesOf(standalone)).equals(issuesOf(arktype))
		attest(standalone.Keyed[0]).snap([
			[{ code: "domain", path: ["first-name"], data: 1, expected: "a string" }],
			'["first-name"] must be a string'
		])
	})

	it("a missing key expects its value's brief", () => {
		attest(standalone.Payload[3]).equals(arktype.Payload[3])
		attest(standalone.Payload[3]).snap([
			[{ code: "required", path: ["payload"], data: {}, expected: "a string" }],
			"payload must be a string"
		])
	})

	it("pipe.try in a union", () => {
		observed("Either").snap([
			1,
			[1],
			[
				[
					{
						code: "predicate",
						path: [],
						data: "{",
						expected: "valid according to readJson"
					}
				],
				"must be valid according to readJson"
			]
		])
	})

	it("an anonymous predicate nested in an expression", () => {
		observed("Nested").snap([
			"{ values: (number & fn)[] }",
			"{ values: (number & fn)[] }"
		])
	})

	it("an x/ literal", () => {
		observed("Version").snap([
			["v12", "12", 0, null],
			[
				[
					{
						code: "pattern",
						path: [],
						data: "x",
						expected: "matched by ^v([0-9]+)$"
					}
				],
				"must be matched by ^v([0-9]+)$"
			]
		])
	})

	it("a Scope with a thunk, holding a function", () => {
		observed("Pair").snap([
			{ first: 2, rest: [] },
			[
				[
					{
						code: "predicate",
						path: ["first"],
						data: 1,
						expected: "valid according to isEven"
					},
					{
						code: "predicate",
						path: ["rest", 0],
						data: 3,
						expected: "valid according to isEven"
					}
				],
				"first must be valid according to isEven\nrest[0] must be valid according to isEven"
			]
		])
	})

	it("a Scope with a thunk in a recursive alias, holding a function", () => {
		observed("Post").snap([
			{ body: "a", replies: [{ body: "b" }] },
			[
				[
					{
						code: "domain",
						path: ["replies", 0, "body"],
						data: 1,
						expected: "a string"
					}
				],
				"replies[0].body must be a string"
			]
		])
	})

	it("holes read through an object const", () => {
		observed("Change").snap([
			{ current: "a", next: "b" },
			[
				[
					{
						code: "predicate",
						path: ["current"],
						data: "x",
						expected: "valid according to an anonymous predicate"
					},
					{ code: "minLength", path: ["next"], data: "", expected: "non-empty" }
				],
				"current must be valid according to an anonymous predicate\nnext must be non-empty"
			]
		])
		observed("Named").snap([
			{ current: "a", next: "b", name: "n" },
			[
				[
					{
						code: "predicate",
						path: ["current"],
						data: "x",
						expected: "valid according to an anonymous predicate"
					},
					{
						code: "minLength",
						path: ["next"],
						data: "",
						expected: "non-empty"
					},
					{ code: "domain", path: ["name"], data: 1, expected: "a string" }
				],
				"current must be valid according to an anonymous predicate\nnext must be non-empty\nname must be a string"
			]
		])
		observed("Id").snap([
			"123e4567-e89b-12d3-a456-426614174000",
			[
				[{ code: "pattern", path: [], data: "nope", expected: "an id" }],
				"it must an id"
			]
		])
	})

	it("an x/ literal in an object in a union", () => {
		observed("Versioned").snap([
			{ v: ["v3", "3"] },
			[
				[
					{
						code: "pattern",
						path: ["v"],
						data: "3",
						expected: "matched by ^v([0-9]+)$"
					}
				],
				"v must be matched by ^v([0-9]+)$"
			],
			2
		])
	})
})
