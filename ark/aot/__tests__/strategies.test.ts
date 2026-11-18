import { attest, contextualize } from "@ark/attest"
import { Precompiler, renderDiagnostic, type PrecompileOptions } from "@ark/aot"
import { check } from "@ark/aot/internal/check.ts"
import type { PrecompilePluginOptions } from "@ark/aot/internal/driver.ts"
import { scanProgram } from "@ark/aot/internal/scan.ts"
import { withSettingsFile } from "@ark/aot/internal/settings.ts"
import { strategyOfSpecifier } from "@ark/aot/internal/strategies.ts"
import {
	precompile as plugin,
	type PrecompileUnpluginOptions
} from "@ark/aot/unplugin"
import { fromHere } from "@ark/fs"
import { build } from "esbuild"
import { join, posix } from "node:path"
import { memoryHost, precompile, run, runCli, writeFixture } from "./utils.ts"

// a Type on a hot path, and one composing it that validates a form
const composed = `import { type } from "arktype"

export const Money = type({ amount: "number > 0", currency: "string == 3" })
export const Order = type({ id: "string", total: Money })
`

// what a unit is written for: a build for speed writes one function that
// allows data and another that says what fails, and one for size a function
// that does both
const formOf = (code: string) =>
	/\btApply: \w+\[1]/.test(code) ? "speed"
	: /\btApply: \w+\[0]/.test(code) ? "size"
	: undefined

// the strategy naming a module, where it's other than the build's own
const namedBy = (specifier: string) => strategyOfSpecifier(specifier) || "own"

// each unit checking Money's `amount` or Order's `id`: what it's written for,
// and the strategy naming its module. Order's checks Money's key too where it
// holds Money's checks, rather than calling Money's unit
const unitsOf = (source: string, opts: PrecompileOptions) => {
	const { modules } = precompile(source, {}, opts)
	return Object.keys(modules).flatMap(specifier => {
		const form = formOf(modules[specifier])
		const keys = ["id", "amount"].filter(key =>
			new RegExp(`\\b${key}\\b`).test(modules[specifier])
		)
		return form && keys.length ?
				`${keys.join(" and ")} for ${form}, named by ${namedBy(specifier)}`
			:	[]
	})
}

// what chose how each of main.ts's definitions is written, as --check prints it
const chosenIn = (source: string, opts: PrecompileOptions) =>
	precompile(source, {}, opts).sites.map(site => site.strategy)

const problemsOf = (source: string, opts?: PrecompileOptions) =>
	precompile(source, {}, opts).diagnostics.map(renderDiagnostic)

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts", "production"]

// a production bundle of main.ts: what it warns of, and its code
const bundled = async (root: string, opts: PrecompileUnpluginOptions = {}) => {
	const { outputFiles, warnings } = await build({
		entryPoints: [join(root, "main.ts")],
		absWorkingDir: root,
		bundle: true,
		write: false,
		format: "esm",
		conditions,
		logLevel: "silent",
		plugins: [plugin.esbuild({ conditions, ...opts })]
	})
	return [warnings.map(({ text }) => text), outputFiles![0].text] as const
}

// a server's hot path beside a form's schemas, which compose its Types
const app = {
	"src/server/money.ts": `import { type } from "arktype"

export const Money = type({ amount: "number > 0", currency: "string == 3" })
`,
	"src/forms/order.ts": `import { type } from "arktype"
import { Money } from "../server/money.ts"

export const Order = type({ id: "string", total: Money })
`,
	"main.ts": `import { Money } from "./src/server/money.ts"
import { Order } from "./src/forms/order.ts"

const total = { amount: 5, currency: "USD" }
console.log(JSON.stringify([
	Money(total),
	String(Money({ amount: 0, currency: "USD" })),
	Order({ id: "a", total }),
	String(Order({ id: 1, total: { amount: 5, currency: "US" } }))
]))
`
}

// as a production build writes each message
const appOutput = `[{"amount":5,"currency":"USD"},"amount must be positive",{"id":"a","total":{"amount":5,"currency":"USD"}},"id must be a string\\ntotal.currency must be exactly length 3"]
`

const unitKind = /^(?:intersection|create|apply)/

// each module the build wrote that a bundle holds: the strategy naming it, and
// the unit it declares, or the validators of the units it holds
const writtenIn = (js: string) =>
	[
		...js.matchAll(/^\/\/ arktype:(~arktype\/(?:(?:speed|size)\/)?(.+))$/gm)
	].map(
		([, specifier, name]) =>
			`${namedBy(specifier)}: ${unitKind.exec(name)?.[0] ?? "validators"}`
	)

// what a scan of a program read whole says of it
const scanned = async (
	files: Record<string, string>,
	opts: PrecompileOptions
) => {
	const precompiler = new Precompiler(memoryHost(files), { cwd: "/", ...opts })
	const program = await scanProgram("test", [{ id: "/main.ts" }], {
		resolve: async (specifier, importer) => {
			const id = posix.join(posix.dirname(importer), specifier)
			return id in files ? id : undefined
		},
		readFile: id => files[id],
		isTransformed: () => true,
		idOf: id => id,
		cwd: "/"
	})
	if (typeof program === "string") throw new Error(program)
	return precompiler.scan(program)
}

contextualize(function (this: Mocha.Suite) {
	// a bundle or the CLI loads arktype and the precompiler in a worker
	this.timeout(60_000)

	describe("schemas", () => {
		it("writes each definition as the strategy its key names does", () => {
			attest(
				unitsOf(composed, { schemas: { "/main.ts#Order": "smallest" } })
			).snap([
				"amount for speed, named by own",
				"id and amount for size, named by size"
			])
			attest(
				unitsOf(composed, {
					optimize: "size",
					schemas: { "/main.ts#Money": "fastest" }
				})
			).snap([
				"amount for speed, named by speed",
				"id and amount for size, named by own"
			])
		})

		it("writes what no key matches as the build's own options say", () => {
			const unset = precompile(composed)
			const unmatched = precompile(
				composed,
				{},
				{
					strategies: { hot: { optimize: "speed" } },
					schemas: { "/forms/**": "smallest", "/other.ts#Money": "hot" }
				}
			)
			attest(unmatched.code === unset.code).equals(true)
			attest(unmatched.modules).equals(unset.modules)
		})

		it("writes a definition as a strategy the options define", () => {
			attest(
				unitsOf(composed, {
					strategies: { cold: { optimize: "size" } },
					schemas: { "/main.ts": "cold" }
				})
			).snap(["amount for size, named by size", "id for size, named by size"])
		})

		it("writes what a definition composes as its own strategy does, whatever that's written as", () => {
			// Money's checks twice: for size in its own validator, for speed in Order's
			attest(
				unitsOf(composed, {
					optimize: "size",
					schemas: { "/main.ts#Order": "fastest" }
				})
			).snap([
				"amount for size, named by own",
				"amount for speed, named by speed",
				"id for speed, named by speed"
			])
		})

		it("names a declaration by its own name, its export's, or default", () => {
			const source = `import { type } from "arktype"

const Local = type({ a: "string" })
const Renamed = type({ b: "string" })
export { Renamed as Public }
export default type({ c: "string" })
export const held = { inner: type({ d: "string" }) }
`
			attest(
				chosenIn(source, {
					schemas: {
						"/main.ts#Local": "smallest",
						"/main.ts#Public": "smallest",
						"/main.ts#default": "smallest",
						"/main.ts#held": "smallest"
					}
				})
			).snap([
				'smallest by schemas["/main.ts#Local"]',
				'smallest by schemas["/main.ts#Public"]',
				'smallest by schemas["/main.ts#default"]',
				'smallest by schemas["/main.ts#held"]'
			])
		})

		it("chooses by the key naming most of a definition's path", () => {
			const chosenBy = (schemas: Record<string, string>) =>
				chosenIn(composed, { schemas })[0]
			// a path over a glob, however they're listed
			attest(chosenBy({ "/main.ts": "smallest", "/**": "fastest" })).snap(
				'smallest by schemas["/main.ts"]'
			)
			// the glob naming more of the path before its first wildcard
			attest(chosenBy({ "/**": "fastest", "/ma*": "smallest" })).snap(
				'smallest by schemas["/ma*"]'
			)
			// a declaration over its module
			attest(
				chosenBy({ "/main.ts": "fastest", "/main.ts#Money": "smallest" })
			).snap('smallest by schemas["/main.ts#Money"]')
		})

		it("fails where two keys as specific choose otherwise", () => {
			attest(
				problemsOf(composed, {
					schemas: { "/*.ts": "smallest", "/*ain.ts": "fastest" }
				})
			).snap([
				'/main.ts:3:22  schemas["/*.ts"] and schemas["/*ain.ts"] both match /main.ts, as "smallest" and "fastest", and neither names more of its path\n  A key naming a declaration chooses over one naming its module, a path over a glob, and of two globs the one with more of the path before its first wildcard. Name the module in a key of its own, or write more of its path in one of them.'
			])
			// two naming one strategy's options choose alike
			attest(
				problemsOf(composed, {
					strategies: { cold: { optimize: "size" } },
					schemas: { "/*.ts": "smallest", "/*ain.ts": "cold" }
				})
			).equals([])
		})

		it("fails where a key names a declaration that defines nothing", () => {
			attest(
				problemsOf(`${composed}export const limit = 5\n`, {
					schemas: {
						"/main.ts#Mony": "fastest",
						"/main.ts#limit": "fastest",
						// a glob names it in whichever of its modules declares it
						"/**#Absent": "fastest"
					}
				})
			).snap([
				'/main.ts:1:1  schemas["/main.ts#Mony"] names Mony, which declares no definition here. Did you mean "/main.ts#Money"?\n  A key names a declaration at its module\'s top level, as "src/money.ts#Money" does `export const Money = type(...)`, by its own name or the one it\'s exported under.',
				'/main.ts:1:1  schemas["/main.ts#limit"] names limit, which declares no definition here\n  A key names a declaration at its module\'s top level, as "src/money.ts#Money" does `export const Money = type(...)`, by its own name or the one it\'s exported under.'
			])
		})

		it("fails where a key names a definition left to arktype", () => {
			attest(
				problemsOf(
					`import { type } from "arktype"

// @ark-runtime
export const Shaped = type({ a: "string" })
export const Other = type({ b: "string" })
`,
					{ schemas: { "/main.ts#Shaped": "fastest", "/main.ts": "smallest" } }
				)
			).snap([
				"/main.ts:4:23  schemas[\"/main.ts#Shaped\"] chooses a strategy for a definition // @ark-runtime leaves to arktype, which the build doesn't write\n  Remove one of them: a strategy is how the build writes a validator, and an island's Type is created by arktype as the program runs."
			])
		})

		it("names the strategy a key misspells", () => {
			attest(() =>
				precompile(composed, {}, { schemas: { "/main.ts": "fastset" } })
			).throws.snap(
				'Error: schemas["/main.ts"] names the strategy "fastset", which isn\'t one. Did you mean "fastest"? A strategy is "fastest" or "smallest", or one strategies defines.'
			)
			attest(() =>
				precompile(
					composed,
					{},
					{
						strategies: { hot: { optimize: "speed" } },
						schemas: { "/main.ts": "warm" }
					}
				)
			).throws.snap(
				'Error: schemas["/main.ts"] names the strategy "warm", which isn\'t one. A strategy is "fastest" or "smallest", or one strategies defines, here "hot".'
			)
		})

		it("refuses a strategy named as one every build has", () => {
			attest(() =>
				precompile(
					composed,
					{},
					{ strategies: { smallest: { optimize: "speed" } } }
				)
			).throws.snap(
				'Error: strategies defines "smallest", which every build has as { optimize: "size" }. Give yours another name.'
			)
		})

		it("refuses a key naming no module, or nothing after its #", () => {
			attest(() =>
				precompile(composed, {}, { schemas: { "#Money": "fastest" } })
			).throws.snap(
				'Error: schemas["#Money"] must name a module, as "src/money.ts" or "src/server/**", and may name one of its declarations after a #, as "src/money.ts#Money".'
			)
			attest(() =>
				precompile(composed, {}, { schemas: { "/main.ts#": "fastest" } })
			).throws.snap(
				'Error: schemas["/main.ts#"] must name a module, as "src/money.ts" or "src/server/**", and may name one of its declarations after a #, as "src/money.ts#Money".'
			)
		})

		it("is no option of a build running on arktype", () => {
			attest(() =>
				precompile(
					composed,
					{},
					{ runtime: "arktype", schemas: { "/main.ts": "fastest" } }
				)
			).throws.snap(
				'Error: schemas chooses what a standalone build writes, which runtime: "arktype" doesn\'t. Remove runtime: "arktype" to precompile, or remove schemas.'
			)
		})
	})

	describe("markers", () => {
		const marked = `import { type } from "arktype"

// @ark-strategy smallest
export const Money = type({ amount: "number > 0", currency: "string == 3" })
export const Order = type({ id: "string", total: Money })
`

		it("writes the definition a marker leads as the strategy it names", () => {
			attest(unitsOf(marked, {})).snap([
				"amount for size, named by size",
				"amount for speed, named by own",
				"id for speed, named by own"
			])
			attest(chosenIn(marked, {})).snap([
				"smallest by // @ark-strategy smallest",
				'optimize: "speed"'
			])
		})

		it("chooses over a key naming its module, and under one naming its declaration", () => {
			attest(chosenIn(marked, { schemas: { "/main.ts": "fastest" } })).snap([
				"smallest by // @ark-strategy smallest",
				'fastest by schemas["/main.ts"]'
			])
			attest(
				chosenIn(marked, { schemas: { "/main.ts#Money": "fastest" } })
			).snap(['fastest by schemas["/main.ts#Money"]', 'optimize: "speed"'])
		})

		it("fails where one names no strategy, or leads no definition", () => {
			attest(
				problemsOf(`import { type } from "arktype"

// @ark-strategy smalest
export const A = type({ a: "string" })
// @ark-strategy
export const B = type({ b: "string" })
// @ark-strategy fastest
export const limit = 5
// @ark-strategy fastest
`)
			).snap([
				'/main.ts:3:1  `// @ark-strategy smalest` names the strategy "smalest", which isn\'t one. Did you mean "smallest"? A strategy is "fastest" or "smallest", or one strategies defines.',
				'/main.ts:5:1  `// @ark-strategy` names the strategy "", which isn\'t one. A strategy is "fastest" or "smallest", or one strategies defines.',
				"/main.ts:7:1  `// @ark-strategy` marks no definition\n  Write `// @ark-strategy <name>` on the line before a statement holding a definition, as before `export const Money = type(...)`.",
				"/main.ts:9:1  `// @ark-strategy` marks no definition\n  Write `// @ark-strategy <name>` on the line before a statement holding a definition, as before `export const Money = type(...)`."
			])
		})
	})

	describe("equal Types", () => {
		const equals = `import { type } from "arktype"

export const Hot = type({ amount: "number > 0", currency: "string == 3" })
export const Cold = type({ amount: "number > 0", currency: "string == 3" })
`

		it("are written once in a module, as the fastest of their strategies", () => {
			const opts = { schemas: { "/main.ts#Cold": "smallest" } }
			attest(unitsOf(equals, opts)).snap(["amount for speed, named by own"])
			attest(chosenIn(equals, opts)).snap([
				'optimize: "speed"',
				'smallest by schemas["/main.ts#Cold"], written for speed as another definition of its Type is'
			])
		})

		it("are one validator across modules written otherwise", async () => {
			const root = writeFixture(
				{
					"hot.ts": `import { type } from "arktype"\n\nexport const Hot = type({ amount: "number > 0" })\n`,
					"cold.ts": `import { type } from "arktype"\n\nexport const Cold = type({ amount: "number > 0" })\n`,
					"main.ts": `import { Cold } from "./cold.ts"\nimport { Hot } from "./hot.ts"\n\nconsole.log(Hot === Cold, Hot({ amount: 1 }), String(Cold({ amount: 0 })))\n`
				},
				fromHere("temp", "strategies", "equal")
			)
			for (const opts of [
				{ schemas: { "cold.ts": "smallest" } },
				{ preset: "smallest", schemas: { "hot.ts": "fastest" } },
				{ schemas: { "cold.ts": "smallest" }, prune: false }
			] satisfies PrecompileUnpluginOptions[]) {
				const [, js] = await bundled(root, opts)
				attest(run(js)).equals("true { amount: 1 } amount must be positive\n")
			}
		})
	})

	describe("bundles", () => {
		const root = writeFixture(app, fromHere("temp", "strategies", "app"))

		it("validate alike under each strategy, and under both", async () => {
			for (const opts of [
				{},
				{ preset: "smallest" },
				{ schemas: { "src/forms/**": "smallest" } },
				{ preset: "smallest", schemas: { "src/server/**": "fastest" } },
				{
					preset: "smallest",
					schemas: { "src/server/money.ts#Money": "fastest" },
					prune: false
				}
			] satisfies PrecompileUnpluginOptions[]) {
				const [warnings, js] = await bundled(root, opts)
				attest(warnings).equals([])
				attest(run(js)).equals(appOutput)
			}
		})

		it("link the units its own options write for size, beside those a key compiles", async () => {
			const [, js] = await bundled(root, {
				preset: "smallest",
				schemas: { "src/server/**": "fastest" }
			})
			attest(writtenIn(js)).snap([
				"speed: intersection",
				"speed: intersection",
				"speed: intersection",
				"speed: create",
				"own: validators"
			])
		})

		it("declare in one function the units its own options compile, beside those a key writes for size", async () => {
			const [, js] = await bundled(root, {
				schemas: { "src/forms/**": "smallest" }
			})
			attest(writtenIn(js)).snap([
				"own: validators",
				"size: intersection",
				"size: intersection",
				"size: intersection",
				"size: intersection",
				"size: create"
			])
		})
	})

	describe("validators larger than arktype", () => {
		// two modules of 48 Types of 48 keys, each a range no other is: compiled,
		// either outweighs arktype
		const ranges = (name: string, from: number) =>
			`import { type } from "arktype"\n\n${Array.from(
				{ length: 48 },
				(_, i) =>
					`const ${name}${i} = type({ ${Array.from({ length: 48 }, (_, j) => `${name}${j}: "number < ${from + i * 48 + j}"`).join(", ")} })`
			).join(
				"\n"
			)}\n\nconsole.log(${Array.from({ length: 48 }, (_, i) => `${name}${i}({})`).join(", ")})\n`
		const files = {
			"/hot.ts": ranges("hot", 1),
			"/cold.ts": ranges("cold", 1 + 48 * 48),
			"/main.ts": `import "./hot.ts"\nimport "./cold.ts"\n`
		}
		const timesOf = async (opts: PrecompileOptions) =>
			(await scanned(files, opts)).timesArktype?.toFixed(1)

		it("weighs only those no key or marker chose a strategy for", async () => {
			attest(await timesOf({})).snap("3.0")
			// those of cold.ts: as each module wrote them where one function
			// declares hot.ts's too, and as that function does where it doesn't
			attest(await timesOf({ schemas: { "hot.ts": "fastest" } })).snap("1.9")
			attest(await timesOf({ schemas: { "hot.ts": "smallest" } })).snap("1.5")
			attest(
				await timesOf({
					schemas: { "hot.ts": "fastest", "cold.ts": "smallest" }
				})
			).equals(undefined)
		})

		it("writes those for size where a browser loads the bundle, and what a key compiles as it says", async () => {
			const root = writeFixture(
				Object.fromEntries(
					Object.entries(files).map(([path, source]) => [path.slice(1), source])
				),
				fromHere("temp", "strategies", "larger")
			)
			const schemas = { "hot.ts": "fastest" }
			const [warnings, js] = await bundled(root, { schemas })
			attest(warnings).snap([
				'precompile: compiled to check fastest, this bundle\'s validators would be about 1.9 times the size of arktype, which they replace, so the build wrote them as calls to checkers they share, as optimize: "size" does. Set optimize: "size", or preset: "smallest" to also create each as its module loads, to build so without this warning and without reading the bundle twice, or optimize: "speed" to compile them.'
			])
			const [setWarnings, setJs] = await bundled(root, {
				optimize: "size",
				optimizeErrors: "speed",
				schemas
			})
			attest(setWarnings).equals([])
			attest(js === setJs).equals(true)
			attest([
				...new Set(writtenIn(js).map(written => written.split(":")[0]))
			]).snap(["speed", "own"])
		})
	})

	describe("settings", () => {
		it("reads a key in ark.json from its directory, and a call's from cwd", () => {
			const root = writeFixture({
				"ark.json": JSON.stringify({
					precompile: {
						strategies: { cold: { optimize: "size" } },
						schemas: {
							"./src/forms/**": "cold",
							"src/server/money.ts#Money": "fastest"
						}
					}
				})
			})
			const read = (opts: PrecompilePluginOptions) => {
				const { strategies, schemas } =
					withSettingsFile<PrecompilePluginOptions>({
						cwd: root,
						...opts
					})
				return { strategies, schemas }
			}
			attest(read({})).snap({
				strategies: { cold: { optimize: "size" } },
				schemas: {
					"src/forms/**": "cold",
					"src/server/money.ts#Money": "fastest"
				}
			})
			// a call's key over the file's, though each writes its path otherwise
			attest(
				read({
					strategies: { hot: { optimize: "speed" } },
					schemas: { "src/forms/**": "hot", [join(root, "lib")]: "cold" }
				})
			).snap({
				strategies: { cold: { optimize: "size" }, hot: { optimize: "speed" } },
				schemas: {
					"src/forms/**": "hot",
					"src/server/money.ts#Money": "fastest",
					lib: "cold"
				}
			})
		})

		it("fails where a key matches no file, naming the nearest", () => {
			const root = writeFixture(app)
			const failing = (schemas: Record<string, string>) =>
				runCli(root, "--check", "--schemas", JSON.stringify(schemas))
					.stderr.split("\n")[0]
					.replace(root, "<root>")
			attest(failing({ "src/sever/**": "fastest" })).snap(
				'schemas["src/sever/**"] matches no file from <root>, so it would choose for nothing. Did you mean "src/server/**"?'
			)
			attest(failing({ "src/server/mony.ts#Money": "fastest" })).snap(
				'schemas["src/server/mony.ts#Money"] matches no file from <root>, so it would choose for nothing. Did you mean "src/server/money.ts#Money"?'
			)
			attest(failing({ "lib/**": "fastest" })).snap(
				'schemas["lib/**"] matches no file from <root>, so it would choose for nothing.'
			)
		})
	})

	describe("--check", () => {
		it("says what each definition is written with, and what chose it", () => {
			const root = writeFixture(app)
			attest(
				check([], {
					cwd: root,
					preset: "smallest",
					// a directory, as each module it holds
					schemas: { "src/server": "fastest" }
				}).lines
			).snap([
				'src/forms/order.ts:4:22  accepted  optimize: "size"',
				'src/server/money.ts:3:22  accepted  fastest by schemas["src/server"]',
				"2 sites in 3 files: 2 accepted (100.0%)"
			])
		})

		it("says nothing of them where nothing chooses", () => {
			const root = writeFixture(app)
			attest(check([], { cwd: root, preset: "smallest" }).lines).snap([
				"src/forms/order.ts:4:22  accepted",
				"src/server/money.ts:3:22  accepted",
				"2 sites in 3 files: 2 accepted (100.0%)"
			])
		})

		it("fails a key whose files define nothing", () => {
			const root = writeFixture({
				...app,
				"src/util/limits.ts": "export const limit = 5\n"
			})
			const report = check([], {
				cwd: root,
				schemas: { "src/util/**": "fastest", "src/server/**": "fastest" }
			})
			attest(report.lines.filter(line => line.startsWith("schemas"))).snap([
				'schemas["src/util/**"] matches src/util/limits.ts, which holds no definition, so it chooses for nothing. Name the modules that define the Types it\'s for, or remove it.'
			])
			attest(report.errors).equals(1)
			// a file it wasn't given may define one
			attest(
				check(["src/server"], {
					cwd: root,
					schemas: { "src/forms/**": "smallest" }
				}).errors
			).equals(0)
		})
	})
})
