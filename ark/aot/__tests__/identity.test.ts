import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { run, runCli, runPlain, writeFixture } from "./utils.ts"

// arktype returns one Type for a Scope's equal definitions, in whichever
// modules they're written, and a precompiled program compares the same

// arktype's packages resolve to their source in this repo
const source = ["ark-ts"]
const production = ["ark-ts", "production"]

const bundle = async (
	root: string,
	conditions: string[],
	opts: PrecompileUnpluginOptions = {}
) => {
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

// each module read alone, as Turbopack or Node would
const runModuleAtATime = (root: string, nodeEnv = "development") =>
	spawnSync(
		process.execPath,
		[
			"--conditions",
			"ark-ts",
			"--import",
			`data:text/javascript,import { register } from "${pathToFileURL(fromHere("..", "node.ts"))}"; register(${JSON.stringify({ allowUnsafe: true, conditions: source, cwd: root })})`,
			"main.ts"
		],
		{
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, NODE_ENV: nodeEnv }
		}
	).stdout

const tsc = fromHere(
	"..",
	"..",
	"..",
	"node_modules",
	"typescript",
	"bin",
	"tsc"
)

// as `tsc && arktype-precompile --emit` builds it
const runEmitted = (root: string) => {
	spawnSync(
		process.execPath,
		[tsc, "-p", "tsconfig.json", "--noCheck", "--noResolve"],
		{
			cwd: root
		}
	)
	runCli(root, "--emit")
	return spawnSync(
		process.execPath,
		["--conditions", "ark-ts", join(root, "out", "main.js")],
		{ encoding: "utf8" }
	).stdout
}

const definitions = {
	ChainedLeft: `type("string").array()`,
	Cycle: `type({ next: "this | null" })`,
	Described: `type("string").describe("named")`,
	Keyword: `type("string.email")`,
	Literal: `type("'claude' | 'codex' | 'acp'")`,
	Narrow: `type("string").narrow(isLong)`,
	Object: `type({ a: "string", n: "number" })`,
	OneScope: `$one.type({ z: "string" })`,
	OtherClosure: `type("string").narrow(s => s.length > 3)`,
	Pipe: `type("string").pipe(isShort)`,
	Rejecting: `type({ "+": "reject", a: "string", "b?": "number" })`,
	Picked: `type("string").narrow(picked)`,
	Scoped: `scope({ S: { z: "string" } }).export().S`,
	OtherScope: `$two.type({ z: "string" })`,
	Defaulted: `type({ d: "string = 'x'" })`,
	// equal JSON, which arktype keeps apart by how each reached its nodes
	Tuple: `type(["number", "number", "...", "number[]", "number"])`,
	Bounded: `type("number[]>=3")`,
	Union: `type("false|null|undefined|0|''")`,
	Units: `type("===", false, null, undefined, 0, "")`,
	Pruned: `type("'foo'|'bar'|string|'baz'|/.*/")`,
	String: `type("string")`,
	Keys: `type("keyof", { foo: "string" })`,
	// the string of each: one a Scope copied, read apart from arktype's own keyword
	KeysOrNull: `type(["keyof", { a: "1", "[string]": "unknown" }]).or("null")`,
	StringOrNull: `type("string|null")`,
	// each Type's own, held only by what its morph declares
	DeclaredObject: `type.schema({ declaredIn: type("string").configure({ x: { y: 1 } } as never), morphs: [isShort] } as never)`,
	DeclaredMessage: `type("string").configure({ message: () => "x" } as never).pipe(isShort)`,
	// a hole, compared as the build's runtime reads it
	RootMessage: `type("string").configure({ message: isShort } as never)`,
	Foo: `type("===", "foo")`,
	MetaObject: `type("string").configure({ x: { y: 1 } } as never)`,
	RegExpExample: `type("string").configure({ examples: [/a/] } as never)`,
	StringExample: `type("string").configure({ examples: ["a"] } as never)`
}

const moduleOf = (suffix: string, rewritten: Record<string, string> = {}) =>
	`import { scope, type } from "arktype"
import { $one, $two, isLong, isShort, picked } from "./shared.ts"
${Object.entries({ ...definitions, ...rewritten })
	.map(([name, definition]) => `export const ${name}${suffix} = ${definition}`)
	.join("\n")}
`

const fixture = (name: string, files: Record<string, string>) =>
	writeFixture(files, fromHere("temp", "identity", name))

const twins = fixture("twins", {
	"package.json": `{ "type": "module" }\n`,
	"tsconfig.json": JSON.stringify({
		compilerOptions: {
			target: "ES2022",
			module: "NodeNext",
			rewriteRelativeImportExtensions: true,
			skipLibCheck: true,
			types: [],
			rootDir: ".",
			outDir: "out"
		},
		include: ["*.ts"]
	}),
	"shared.ts": `import { scope } from "arktype"
export const isLong = (s: string) => s.length > 1
export const isShort = (s: string) => s.length < 9
// a closure over its call, which no variable holds for the build
const made = (min: number) => (s: string) => s.length > min
export const picked = made(5)
export const $one = scope({ K: "string" })
export const $two = scope({ K: "string" })
`,
	"a.ts": moduleOf("A"),
	"b.ts": moduleOf("B", {
		ChainedLeft: `type("string[]")`,
		Literal: `type("'acp' | 'codex' | 'claude'")`
	}),
	"main.ts": `import * as a from "./a.ts"
import * as b from "./b.ts"
const groups = new Map()
for (const [k, v] of [...Object.entries(a), ...Object.entries(b)])
	groups.set(v, [...(groups.get(v) ?? []), k])
console.log(JSON.stringify([...groups.values()].filter(group => group.length > 1).map(group => group.join("=")).sort()))
`
})

const partition = [
	"BoundedA=BoundedB",
	"ChainedLeftA=ChainedLeftB",
	"DefaultedA=DefaultedB",
	"DescribedA=DescribedB",
	"FooA=FooB",
	"KeysA=KeysB",
	"KeysOrNullA=KeysOrNullB",
	"KeywordA=KeywordB",
	"LiteralA=LiteralB",
	"NarrowA=NarrowB",
	"ObjectA=ObjectB",
	"OneScopeA=OneScopeB",
	"OtherScopeA=OtherScopeB",
	"PickedA=PickedB",
	"PipeA=PipeB",
	"PrunedA=PrunedB",
	"RejectingA=RejectingB",
	"RootMessageA=RootMessageB",
	"StringA=StringB",
	"StringExampleA=StringExampleB",
	"StringOrNullA=StringOrNullB",
	"TupleA=TupleB",
	"UnionA=UnionB",
	"UnitsA=UnitsB"
]

const partitionOf = (stdout: string) => JSON.parse(stdout) as string[]

contextualize(() => {
	it("arktype returns one Type for a Scope's equal definitions", () => {
		attest(partitionOf(runPlain(twins))).equals(partition)
	})

	it("a production build compares the same", async () => {
		attest(partitionOf(run(await bundle(twins, production)))).equals(partition)
	})

	it("a production size build compares the same", async () => {
		attest(
			partitionOf(run(await bundle(twins, production, { preset: "smallest" })))
		).equals(partition)
	})

	it("a build reading each module alone compares the same", async () => {
		attest(partitionOf(run(await bundle(twins, source)))).equals(partition)
		attest(partitionOf(runModuleAtATime(twins))).equals(partition)
		attest(partitionOf(runModuleAtATime(twins, "production"))).equals(partition)
		attest(partitionOf(runEmitted(twins))).equals(partition)
	}).timeout(60_000)

	it("a build creating Types with arktype compares the same", async () => {
		attest(
			partitionOf(run(await bundle(twins, source, { runtime: "arktype" })))
		).equals(partition)
	})

	it("what one module reads is on what the other created first", async () => {
		const root = fixture("members", {
			"first.ts": `import { type } from "arktype"
export const First = type({ a: "string" })
`,
			"second.ts": `import { type } from "arktype"
export const Second = type({ a: "string" })
export const expression = Second.expression
`,
			"main.ts": `import { First } from "./first.ts"
import { Second, expression } from "./second.ts"
console.log(First === Second, First.expression === expression, First.description)
`
		})
		const plain = runPlain(root)
		attest(plain).equals("true true { a: a string }\n")
		attest(run(await bundle(root, production))).equals(plain)
		attest(run(await bundle(root, source))).equals(plain)
		attest(runModuleAtATime(root)).equals(plain)
	}).timeout(60_000)

	it("a Type no export holds is one with its equal, however it's compared", async () => {
		const definitions = {
			Holding: `type("string").narrow(isLong)`,
			HoldingElements: `type("string").narrow(isLong).array()`,
			Piped: `type(["string", "=>", double])`,
			Plain: `type("string[]")`,
			PlainObject: `type({ a: "string" })`,
			// a keyword holding a morph, whose meta holds an object
			Keyword: `type("string.numeric.parse")`,
			KeywordValue: `type({ a: "string.numeric.parse" })`,
			KeywordElements: `type("string.numeric.parse[]")`,
			Described: `type("string.numeric.parse").describe("parsed")`
		}
		const names = Object.keys(definitions)
		const declared = (suffix: string, exports: string) =>
			Object.entries(definitions)
				.map(
					([name, definition]) =>
						`${exports}const ${name}${suffix} = ${definition}`
				)
				.join("\n")
		const shared = `export const double = (d: any) => (typeof d === "number" ? d * 2 : d)
export const isLong = (s: string) => s.length > 1
`
		const root = fixture("unexported", {
			"package.json": `{ "type": "module" }\n`,
			"tsconfig.json": JSON.stringify({
				compilerOptions: {
					target: "ES2022",
					module: "NodeNext",
					rewriteRelativeImportExtensions: true,
					skipLibCheck: true,
					types: [],
					rootDir: ".",
					outDir: "out"
				},
				include: ["*.ts"]
			}),
			"shared.ts": shared,
			"other.ts": `import { type } from "arktype"
import { double, isLong } from "./shared.ts"
${declared("Other", "export ")}
`,
			"compared.ts": `import { type } from "arktype"
import { double, isLong } from "./shared.ts"
import { ${names.map(name => `${name}Other`).join(", ")} } from "./other.ts"
${declared("", "")}
console.log(${names.map(name => `${name} === ${name}Other`).join(", ")})
`,
			"switched.ts": `import { type } from "arktype"
import { double, isLong } from "./shared.ts"
import { ${names.map(name => `${name}Other`).join(", ")} } from "./other.ts"
${declared("", "")}
const isCase = (read: unknown, t: unknown) => {
	switch (read) {
		case t:
			return true
	}
	return false
}
const inSwitch = (read: unknown) => {
	switch (read) {
${names.map(name => `		case ${name}:`).join("\n")}
			return true
	}
	return false
}
console.log(${names.map(name => `inSwitch(${name}Other)`).join(", ")}, isCase(1, 1))
`,
			"held.ts": `import { type } from "arktype"
import { double, isLong } from "./shared.ts"
import { ${names.map(name => `${name}Other`).join(", ")} } from "./other.ts"
${declared("", "")}
const held = new Set<unknown>([${names.join(", ")}])
console.log(${names.map(name => `held.has(${name}Other)`).join(", ")})
`,
			"read.ts": `import { type } from "arktype"
import { double, isLong } from "./shared.ts"
import { ${names.map(name => `${name}Other`).join(", ")} } from "./other.ts"
${declared("", "")}
const describe = (t: { description: string }) => t.description
console.log(${names.map(name => `describe(${name})`).join(", ")})
console.log(${names.map(name => `${name} === ${name}Other`).join(", ")})
`,
			"main.ts": `import "./compared.ts"
import "./switched.ts"
import "./held.ts"
import "./read.ts"
`
		})
		const plain = runPlain(root)
		attest(plain.includes("false")).equals(false)
		attest(run(await bundle(root, production))).equals(plain)
		attest(run(await bundle(root, production, { prune: false }))).equals(plain)
		attest(
			run(await bundle(root, production, { preset: "smallest", prune: false }))
		).equals(plain)
		attest(runModuleAtATime(root)).equals(plain)
		attest(runModuleAtATime(root, "production")).equals(plain)
		attest(runEmitted(root)).equals(plain)
	}).timeout(120_000)

	it("a Type is one with its equal however each module's smallest writes it", async () => {
		const definition = `type("number[] | 'a' | null")`
		const root = fixture("writtenApart", {
			"package.json": `{ "type": "module" }\n`,
			"other.ts": `import { type } from "arktype"
export const Other = ${definition}
`,
			// holds enough that checkers repay their runtime, where the other doesn't
			"main.ts": `import { type } from "arktype"
import { Other } from "./other.ts"
const T0 = type("string")
${Array.from(
	{ length: 8 },
	(_, i) =>
		`const T${i + 1} = type({ id: "string", left: T${i}.array(), right: T${i}.array() })`
).join("\n")}
console.log(${definition} === Other, T8.allows({}))
`
		})
		attest(runPlain(root)).equals("true false\n")
		attest(
			run(await bundle(root, production, { preset: "smallest", prune: false }))
		).equals("true false\n")
	}).timeout(120_000)

	it("an object a Type's meta holds keeps it from its equal, as a keyword's doesn't", async () => {
		const definitions = {
			Keyword: `type("string.date").describe("a date")`,
			Named: `type("string").configure({ jsonSchema: {} } as never)`
		}
		const root = fixture("metaObjects", {
			"package.json": `{ "type": "module" }\n`,
			"other.ts": `import { type } from "arktype"
export const KeywordOther = ${definitions.Keyword}
export const NamedOther = ${definitions.Named}
`,
			"main.ts": `import { type } from "arktype"
import { KeywordOther, NamedOther } from "./other.ts"
console.log(${definitions.Keyword} === KeywordOther, ${definitions.Named} === NamedOther)
`
		})
		attest(runPlain(root)).equals("true false\n")
		attest(run(await bundle(root, production))).equals("true false\n")
		attest(run(await bundle(root, production, { prune: false }))).equals(
			"true false\n"
		)
		attest(runModuleAtATime(root)).equals("true false\n")
		attest(runModuleAtATime(root, "production")).equals("true false\n")
	}).timeout(120_000)

	it("a build reading each module alone compares a function's scope otherwise, and a keyword reached two ways as arktype does", async () => {
		const root = fixture("readAlone", {
			"shared.ts": `import { scope } from "arktype"

const make = () => scope({ A: "string[]" })
export const $ = make()
`,
			"other.ts": `import { $ } from "./shared.ts"

export const Scoped = $.type({ x: "A" })
`,
			"main.ts": `import { type } from "arktype"
import { Scoped } from "./other.ts"
import { $ } from "./shared.ts"

console.log($.type({ x: "A" }) === Scoped, type("unknown") === type.pipe())
`
		})
		attest(runPlain(root)).equals("true false\n")
		attest(run(await bundle(root, production))).equals("true false\n")
		attest(run(await bundle(root, source))).equals("false false\n")
		attest(runModuleAtATime(root)).equals("false false\n")
	})

	it("each run of a module creates its own functions, so its own Types", async () => {
		const root = fixture("queried", {
			"m.ts": `import { type } from "arktype"

const check = (s: string) => s.length > 2

export const Narrow = type("string").narrow(check)
export const Plain = type({ a: "string" })
`,
			"main.ts": `import { Narrow, Plain } from "./m.ts?v=1"
import { Narrow as NarrowAgain, Plain as PlainAgain } from "./m.ts?v=2"
console.log(Narrow === NarrowAgain, Plain === PlainAgain)
`
		})
		const plain = runPlain(root)
		attest(plain).equals("false true\n")
		attest(run(await bundle(root, production))).equals(plain)
		attest(run(await bundle(root, production, { preset: "smallest" }))).equals(
			plain
		)
		attest(run(await bundle(root, source))).equals(plain)
		attest(runModuleAtATime(root)).equals(plain)
	}).timeout(60_000)

	it("a chunk imported again holds one validator where no run can differ", async () => {
		const root = fixture("reloaded", {
			"package.json": `{ "type": "module" }\n`,
			"m.ts": `import { type } from "arktype"

const check = (s: string) => s.length > 2

export const Narrow = type("string").narrow(check)
`,
			"other.ts": `import { Narrow } from "./m.ts"

export const Other = Narrow
`
		})
		await build({
			entryPoints: [join(root, "m.ts"), join(root, "other.ts")],
			bundle: true,
			splitting: true,
			outdir: join(root, "out"),
			chunkNames: "[name]",
			format: "esm",
			conditions: production,
			logLevel: "silent",
			plugins: [precompile.esbuild({ cwd: root, conditions: production })]
		})
		const runs = `const first = await import("./out/m.js?first")
const second = await import("./out/m.js?second")
console.log(first.Narrow === second.Narrow)
`
		attest(
			spawnSync(process.execPath, ["--input-type=module", "-e", runs], {
				cwd: root,
				encoding: "utf8"
			}).stdout
		).equals("true\n")
	})

	it("a production build pays only for what two modules create", async () => {
		const root = fixture("apart", {
			"a.ts": `import { type } from "arktype"
export const A = type({ a: "string" })
export const SameA = type({ a: "string" })
`,
			"b.ts": `import { type } from "arktype"
export const B = type({ b: "string" })
`,
			"main.ts": `import { A, SameA } from "./a.ts"
import { B } from "./b.ts"
console.log(A === SameA, A({ a: "" }), B({ b: "" }))
`
		})
		const js = await bundle(root, production)
		attest(run(js)).equals(runPlain(root))
		attest(js.includes("tablesByKey")).equals(false)
	})

	describe("compared beside one another module creates", () => {
		// main's Type is its own, which the build may write with less than the
		// one a.ts exports
		const compares = (name: string, read: string) =>
			it(name, async () => {
				const root = fixture(`compared-${name.replace(/\W+/g, "-")}`, {
					"a.ts": `import { type } from "arktype"\nexport const A = type({ a: "string" })\n`,
					"main.ts": `import { type } from "arktype"\nimport { A } from "./a.ts"\nconst B = type({ a: "string" })\nconsole.log(${read})\n`
				})
				const plain = runPlain(root)
				attest(plain.startsWith("true")).equals(true)
				attest(run(await bundle(root, production))).equals(plain)
				attest(
					run(await bundle(root, production, { preset: "smallest" }))
				).equals(plain)
				attest(runModuleAtATime(root)).equals(plain)
				attest(runModuleAtATime(root, "production")).equals(plain)
			}).timeout(60_000)

		compares("by Object.is", "Object.is(A, B)")
		compares("by ===", "A === B")
		compares("by !==", "!(B !== A)")
		compares(
			"by a switch",
			"(() => { switch (B) { case A: return true } return false })()"
		)
		compares("in a function it's passed to", "((x, y) => x === y)(A, B)")
		compares("by its assert", "A.assert === B.assert")
		compares(
			"by an assert held to compare later",
			"(f => f === A.assert)(B.assert)"
		)
		compares("by its ~standard", `A["~standard"] === B["~standard"]`)
		compares("where its module reads more of it", "A === B, B.expression")
	})

	describe("where no read compares them", () => {
		const twoModules = (main: string, a = `type({ a: "string" })`) =>
			fixture(`unread-${main.replace(/\W+/g, "-").slice(0, 40)}`, {
				"a.ts": `import { type } from "arktype"\nexport const A = ${a}\n`,
				"b.ts": `import { type } from "arktype"\nexport const B = ${a}\n`,
				"main.ts": `import { A } from "./a.ts"\nimport { B } from "./b.ts"\n${main}\n`
			})
		const reads = (name: string, main: string, interns: boolean) =>
			it(name, async () => {
				const root = twoModules(main)
				for (const opts of [{}, { preset: "smallest" as const }]) {
					const js = await bundle(root, production, opts)
					attest(js.includes("tablesByKey")).equals(interns)
					attest(run(js)).equals(runPlain(root))
				}
			})

		reads(
			"creates each where they're only called",
			`console.log(A({ a: "" }), B({ a: "" }))`,
			false
		)
		reads(
			"interns them where they're compared",
			`console.log(A === B, A({ a: "" }))`,
			true
		)
		reads(
			"interns them where what they hold could be",
			`console.log(A.allows === B.allows, A({ a: "" }))`,
			true
		)
		reads(
			"interns them where a method is read to be called elsewhere",
			`console.log(A.assert === B.assert, A({ a: "" }))`,
			true
		)
		reads(
			"interns them where they're handed off",
			`const seen = new Set([A]); console.log(seen.has(B))`,
			true
		)

		it("interns one holding a callback, which creating it twice could run twice", async () => {
			const root = fixture("unread-callback", {
				"shared.ts": `export const isLong = (s: string) => s.length > 1\n`,
				"a.ts": `import { type } from "arktype"\nimport { isLong } from "./shared.ts"\nexport const A = type("string").narrow(isLong)\n`,
				"b.ts": `import { type } from "arktype"\nimport { isLong } from "./shared.ts"\nexport const B = type("string").narrow(isLong)\n`,
				"main.ts": `import { A } from "./a.ts"\nimport { B } from "./b.ts"\nconsole.log(A("ab"), B("abc"))\n`
			})
			const js = await bundle(root, production)
			attest(js.includes("tablesByKey")).equals(true)
			attest(run(js)).equals(runPlain(root))
		})
	})
})
