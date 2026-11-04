import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import { run, runPlain, writeFixture } from "./utils.ts"

// json and a JSON Schema repeat a Type at each reference, so one reused at each
// level would multiply what a build bakes where it can't see what reads them

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

const bundle = async (root: string, opts: PrecompileUnpluginOptions = {}) => {
	const { outputFiles } = await build({
		entryPoints: [join(root, "main.ts")],
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [precompile.esbuild({ cwd: root, conditions, ...opts })]
	})
	return outputFiles![0].text
}

const appOf = (
	leaf: string,
	levels: number,
	body = ""
) => `import { type } from "arktype"
const isShort = (s: string) => s.length < 9
const D0 = ${leaf}
${Array.from(
	{ length: levels },
	(_, i) => `const D${i + 1} = type({ k0: D${i}, k1: D${i}, k2: D${i} })`
).join("\n")}
const holder = globalThis as any
holder.Lost = D${levels}
const T = holder.Lost
${body}
`

const closedLeaf = `type({ leaf: "string", n: "number", list: "string[]" })`
const narrowedLeaf = `type({ s: type("string").narrow(isShort), closed: { a: "string", b: "number" } })`

contextualize(function (this: Mocha.Suite) {
	this.timeout(120_000)

	const fixture = (name: string, app: string) =>
		writeFixture({ "main.ts": app }, fromHere("temp", "dataParts", name))

	it("bakes what's repeated once, however many levels reuse it", async () => {
		const [shallow, deep] = await Promise.all(
			[3, 7].map(levels =>
				bundle(fixture(`levels${levels}`, appOf(closedLeaf, levels)))
			)
		)
		attest(shallow.includes('"leaf"')).equals(true)
		attest(deep.split('"leaf"').length).equals(shallow.split('"leaf"').length)
		// what each level adds is its own, as 3 ** 7 leaves would take megabytes
		attest(deep.length - shallow.length < 8000).equals(true)
	})

	it("reads each member as arktype writes it", async () => {
		const root = fixture(
			"members",
			appOf(
				closedLeaf,
				3,
				`console.log(JSON.stringify([
	T.json,
	T.toJSON(),
	T.toJsonSchema(),
	...["draft-2020-12", "draft-07", "openapi-3.0"].flatMap(target => [
		T.toJsonSchema({ target }),
		T["~standard"].jsonSchema.input({ target }),
		T["~standard"].jsonSchema.output({ target })
	])
]))`
			)
		)
		const plain = runPlain(root)
		attest(plain.length > 1000).equals(true)
		attest(run(await bundle(root))).equals(plain)
		attest(run(await bundle(root, { preset: "smallest" }))).equals(plain)
		attest(run(await bundle(root, { prune: false }))).equals(plain)
	})

	it("gives each read of a JSON Schema objects of its own", async () => {
		const root = fixture(
			"unaliased",
			appOf(
				closedLeaf,
				2,
				`const one = T.toJsonSchema()
const two = T.toJsonSchema()
const { k0, k1 } = one.properties
console.log(
	one !== two,
	k0 !== k1,
	k0.properties !== k1.properties,
	k0.properties.k0 !== k0.properties.k1,
	k0.properties.k0 !== two.properties.k0.properties.k0
)
k0.properties.k0.type = "written"
k0.required.push("written")
console.log(
	k1.properties.k0.type,
	k0.properties.k1.type,
	k1.required.length,
	T.toJsonSchema().properties.k0.properties.k0.type
)`
			)
		)
		const plain = runPlain(root)
		attest(plain).equals("true true true true true\nobject object 3 object\n")
		attest(run(await bundle(root))).equals(plain)
	})

	it("holds in json what it references once, as arktype does", async () => {
		const root = fixture(
			"json",
			appOf(
				closedLeaf,
				2,
				`const [k0, k1] = T.json.required
console.log(k0.value === k1.value, k0.value.required[0].value === k1.value.required[1].value)`
			)
		)
		attest(runPlain(root)).equals("true true\n")
		attest(run(await bundle(root))).equals("true true\n")
	})

	it("writes json reading a narrow's name beside its validator", async () => {
		const root = fixture(
			"narrowedJson",
			appOf(
				narrowedLeaf,
				2,
				`console.log(JSON.stringify(T.json), JSON.stringify(T.toJSON()) === JSON.stringify(T.json), T.expression, T.description)`
			)
		)
		const js = await bundle(root)
		attest(run(js)).equals(runPlain(root))
		// what reads its name is written once
		attest(js.split("baseNameOf(").length < 12).equals(true)
	})

	it("replays a fallback as arktype runs it, each call's objects its own", async () => {
		const root = fixture(
			"replay",
			appOf(
				narrowedLeaf,
				2,
				`const held = []
const written = T.toJsonSchema({
	fallback: ctx => {
		held.push(ctx)
		ctx.base.calls = held.length
		return { ...ctx.base, code: ctx.code }
	}
})
const { k0, k1 } = written.properties
console.log(JSON.stringify(written))
console.log(held.length, JSON.stringify(held.map(({ base }) => base)))
console.log(k0 !== k1, k0.properties.k0 !== k0.properties.k1, k0.properties.k0.properties.closed !== k0.properties.k1.properties.closed)
for (const target of ["draft-07", "openapi-3.0"]) console.log(JSON.stringify(T.toJsonSchema({ target, fallback: ctx => ctx.base })))`
			)
		)
		const js = await bundle(root)
		attest(run(js)).equals(runPlain(root))
		// what no fallback reads is a part of the replays too
		attest(js.split('"type": "number"').length).equals(2)
	})

	it("bakes nothing of a target no read needs", async () => {
		const root = fixture(
			"target",
			`import { type } from "arktype"
const Pair = type(["string", "number"])
const T = type({ a: Pair, b: Pair, c: { d: Pair, e: Pair } })
console.log(JSON.stringify(T.toJsonSchema()))
`
		)
		const js = await bundle(root)
		attest(run(js)).equals(runPlain(root))
		attest(js.includes('"prefixItems"')).equals(true)
		attest(js.includes('"additionalItems"')).equals(false)
	})
})
