// a watch build's precompiler, kept across each change, answers as a new one
// does, and a build reading the cache answers as one that doesn't, after each
// edit of a generated app: each app's modules hand validators around, alias,
// compare and re-export them, and each edit changes a module, a setting or a
// resolution, or touches a file. ARK_INCREMENTAL=<count>[:<seed>[:<path>]],
// the path replaying one of a seed's apps [ARK_INCREMENTAL_EDITS=<n>]
// [ARK_INCREMENTAL_FAILURES=<dir>] pnpm testIncremental
import { fromHere } from "@ark/fs"
import type { TransformedModule } from "@ark/aot/internal/driver.ts"
import { hashOf } from "@ark/aot/internal/cache.ts"
import { createAsyncPrecompiler } from "@ark/aot/internal/worker.ts"
import fc from "fast-check"
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	symlinkSync,
	utimesSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
	defOf,
	isDefinable,
	morphs,
	nodeOf,
	predicates,
	sourceOf,
	tried,
	unnamedHoles,
	type Node
} from "./grammar.ts"

const [countArg, seedArg, path] = (process.env.ARK_INCREMENTAL ?? "24").split(
	":"
)
const count = Number(countArg)
const seed = seedArg === undefined ? Date.now() % 1_000_000 : Number(seedArg)
const editCount = Number(process.env.ARK_INCREMENTAL_EDITS ?? 12)
const failureDir =
	process.env.ARK_INCREMENTAL_FAILURES ??
	join(tmpdir(), "ark-incremental-failures")

// how a site derives the validator it exports
const wraps = {
	plain: (def: string) => `type(${def})`,
	pipe: (def: string) => `type(${def}).pipe(box)`,
	narrow: (def: string) => `type(${def}).narrow(isTruthy)`,
	or: (def: string) => `type(${def}).or("null")`,
	array: (def: string) => `type(${def}).array()`,
	describe: (def: string) => `type(${def}).describe("a thing")`,
	scoped: (def: string) => `scope({ T: ${def} }).export().T`,
	generic: (def: string) => `type("<t>", { a: "t" })(${def})`
}

type Wrap = keyof typeof wraps

interface Validator {
	node: Node
	wrap: Wrap
}

// how a reader imports what it reads, and what it reads
const accesses = ["named", "namespace", "barrel", "lib", "extra"] as const

const reads = {
	call: "T(d)",
	allows: "T.allows(d)",
	assert:
		"(() => { try { return T.assert(d) } catch (e) { return String(e) } })()",
	composed: "Composed(d)",
	expression: "T.expression",
	json: "JSON.stringify(T.json)"
}

interface Target {
	module: number
	index: number
	access: (typeof accesses)[number]
	read: keyof typeof reads
}

const settings = [undefined, { errors: "first" }, { optimize: "size" }] as const

interface App {
	types: Validator[][]
	readers: Target[]
	// whether each module re-exports the previous one's first validator
	aliases: boolean[]
	// whether each module declares a value comparing its first validator
	compares: boolean[]
	// whether each module defines a Type the build rejects
	broken: boolean[]
	extra: Validator | undefined
	// whether lib.ts shadows lib/index.ts, which "./lib" resolves to otherwise
	shadowed: boolean
	settings: (typeof settings)[number]
	// the order the build asks for its modules in
	order: number[]
}

type Edit =
	| { kind: "def"; module: number; index: number; validator: Validator }
	| { kind: "retarget"; reader: number; target: Target }
	| { kind: "extra"; validator: Validator | undefined }
	| { kind: "alias" | "compare" | "broken"; module: number }
	| { kind: "shadow" }
	| { kind: "settings"; settings: App["settings"] }
	| { kind: "touch"; file: number }

const validator: fc.Arbitrary<Validator> = fc.record({
	node: nodeOf([]).filter(isDefinable),
	wrap: fc.constantFrom(...(Object.keys(wraps) as Wrap[]))
})

const target = (types: number): fc.Arbitrary<Target> =>
	fc.record({
		module: fc.nat(types - 1),
		index: fc.nat(2),
		access: fc.constantFrom(...accesses),
		read: fc.constantFrom(...(Object.keys(reads) as (keyof typeof reads)[]))
	})

const flags = (length: number, flag = fc.boolean()) =>
	fc.array(flag, { minLength: length, maxLength: length })

const app: fc.Arbitrary<App> = fc
	.array(fc.array(validator, { minLength: 1, maxLength: 3 }), {
		minLength: 1,
		maxLength: 3
	})
	.chain(types =>
		fc.record({
			types: fc.constant(types),
			readers: fc.array(target(types.length), { minLength: 1, maxLength: 4 }),
			aliases: flags(types.length),
			compares: flags(types.length),
			// rarely, as a rejected Type fails each module reading it
			broken: flags(types.length, fc.constantFrom(false, false, false, true)),
			extra: fc.option(validator, { nil: undefined }),
			shadowed: fc.boolean(),
			settings: fc.constantFrom(...settings),
			order: fc.array(fc.nat(30), { minLength: 12, maxLength: 12 })
		})
	)

const edit = (app: App): fc.Arbitrary<Edit> => {
	const module = fc.nat(app.types.length - 1)
	return fc.oneof(
		module.chain(module =>
			fc.record({
				kind: fc.constant("def" as const),
				module: fc.constant(module),
				index: fc.nat(app.types[module].length - 1),
				validator
			})
		),
		fc.record({
			kind: fc.constant("retarget" as const),
			reader: fc.nat(app.readers.length - 1),
			target: target(app.types.length)
		}),
		fc.record({
			kind: fc.constant("extra" as const),
			validator: fc.option(validator, { nil: undefined })
		}),
		fc.record({
			kind: fc.constantFrom(
				"alias" as const,
				"compare" as const,
				"broken" as const
			),
			module
		}),
		fc.constant({ kind: "shadow" as const }),
		fc.record({
			kind: fc.constant("settings" as const),
			settings: fc.constantFrom(...settings)
		}),
		fc.record({ kind: fc.constant("touch" as const), file: fc.nat(15) })
	)
}

// an app and the edits made to it, each drawn for the app as the last left it
const edited: fc.Arbitrary<[App, Edit[]]> = app.chain(initial => {
	let chain: fc.Arbitrary<[App, Edit[]]> = fc.constant([initial, []])
	for (let i = 0; i < editCount; i++) {
		chain = chain.chain(([current, edits]) =>
			edit(current).map(next => [applied(current, next), [...edits, next]])
		)
	}
	return chain.map(([, edits]) => [initial, edits])
})

const toggled = (values: boolean[], i: number) =>
	values.map((value, j) => (j === i ? !value : value))

const applied = (app: App, edit: Edit): App => {
	switch (edit.kind) {
		case "def":
			return {
				...app,
				types: app.types.map((own, m) =>
					m === edit.module ?
						own.map((v, k) => (k === edit.index ? edit.validator : v))
					:	own
				)
			}
		case "retarget":
			return {
				...app,
				readers: app.readers.map((r, j) =>
					j === edit.reader ? edit.target : r
				)
			}
		case "extra":
			return { ...app, extra: edit.validator }
		case "alias":
			return { ...app, aliases: toggled(app.aliases, edit.module) }
		case "compare":
			return { ...app, compares: toggled(app.compares, edit.module) }
		case "broken":
			return { ...app, broken: toggled(app.broken, edit.module) }
		case "shadow":
			return { ...app, shadowed: !app.shadowed }
		case "settings":
			return { ...app, settings: edit.settings }
		case "touch":
			return app
	}
}

const functions = [
	...Object.entries({ ...morphs, ...tried, ...predicates }).map(
		([name, fn]) =>
			`const ${name} = ${unnamedHoles.has(name) ? `[${fn.toString()}][0]` : fn.toString()}`
	),
	"const emptyArray = () => []"
]

const exported = (name: string, v: Validator) =>
	`export const ${name} = ${wraps[v.wrap](sourceOf(defOf(v.node)))}`

const importOf = (app: App, r: Target): [specifier: string, name: string] => {
	if (r.access === "lib") return ["./lib", "L"]
	if (r.access === "extra" && app.extra) return ["./extra.ts", "E"]
	const m = r.module % app.types.length
	const name = `V${m}_${r.index % app.types[m].length}`
	return [r.access === "barrel" ? "./barrel.ts" : `./types${m}.ts`, name]
}

// each file, in an order that puts each module after those it imports
const filesOf = (app: App): Map<string, string> => {
	const files = new Map<string, string>()
	for (const [m, own] of app.types.entries()) {
		const aliases = m > 0 && app.aliases[m]
		files.set(
			`types${m}.ts`,
			[
				`import { scope, type } from "arktype"`,
				...(aliases ?
					[`import { V${m - 1}_0 } from "./types${m - 1}.ts"`]
				:	[]),
				...functions,
				...own.map((v, k) => exported(`V${m}_${k}`, v)),
				`export const OTHER${m} = type("string")`,
				...(aliases ? [`export const A${m} = V${m - 1}_0`] : []),
				...(app.compares[m] ?
					[`export const P${m} = Math.random() > 2 ? V${m}_0 : OTHER${m}`]
				:	[]),
				...(app.broken[m] ? [`export const B${m} = type("nope")`] : []),
				""
			].join("\n")
		)
	}
	files.set(
		"barrel.ts",
		app.types.map((_, m) => `export * from "./types${m}.ts"`).join("\n")
	)
	files.set("lib/index.ts", 'export { V0_0 as L } from "../types0.ts"\n')
	if (app.shadowed) {
		files.set(
			"lib.ts",
			'import { type } from "arktype"\n\nexport const L = type("number")\n'
		)
	}
	if (app.extra) {
		files.set(
			"extra.ts",
			[
				`import { scope, type } from "arktype"`,
				...functions,
				exported("E", app.extra),
				""
			].join("\n")
		)
	}
	for (const [j, r] of app.readers.entries()) {
		const [specifier, name] = importOf(app, r)
		files.set(
			`reader${j}.ts`,
			[
				`import { type } from "arktype"`,
				r.access === "namespace" ?
					`import * as ns from "${specifier}"\nconst T = ns.${name}`
				:	`import { ${name} as T } from "${specifier}"`,
				"const Composed = type({ a: T })",
				`export const run${j} = (d: unknown) => ${reads[r.read]}`,
				""
			].join("\n")
		)
	}
	files.set(
		"main.ts",
		[
			...app.readers.map((_, j) => `import { run${j} } from "./reader${j}.ts"`),
			`export const results = [${app.readers.map((_, j) => `run${j}(1)`).join(", ")}]`,
			""
		].join("\n")
	)
	if (app.settings)
		files.set("ark.json", JSON.stringify({ precompile: app.settings }))
	return files
}

// writes only what changed, so each other file keeps its mtime
const write = (
	dir: string,
	files: Map<string, string>,
	previous: Map<string, string>
) => {
	for (const [name, text] of files) {
		if (previous.get(name) === text) continue
		mkdirSync(dirname(join(dir, name)), { recursive: true })
		writeFileSync(join(dir, name), text)
	}
	for (const name of previous.keys())
		if (!files.has(name)) rmSync(join(dir, name))
}

// a module's answer as the bundler reads it, apart from the files it
// depends on, which follow the order modules were asked for
type Answer = string

const answerOf = (answer: unknown): Answer => {
	if (!answer) return JSON.stringify(answer ?? null)
	const { dependencies, modules, stored, ...rest } =
		answer as TransformedModule & { stored?: true }
	return JSON.stringify({
		...rest,
		modules: Object.fromEntries(
			Object.entries(modules).sort(([l], [r]) => (l < r ? -1 : 1))
		)
	})
}

type Send = ReturnType<typeof createAsyncPrecompiler>

const conditions = ["ark-ts"]

const workerIn = (dir: string): Send =>
	createAsyncPrecompiler({ precompilerOptions: { cwd: dir, conditions } })

const cacheRootOf = (dir: string) => join(dir, "node_modules", ".cache", "ark")

// marks each answer the cache holds, so one a build reads from it is told
// apart from one it computes
const markStored = (dir: string) => {
	const root = cacheRootOf(dir)
	if (!existsSync(root)) return
	for (const version of readdirSync(root)) {
		for (const name of readdirSync(join(root, version))) {
			if (!name.startsWith("a-")) continue
			const path = join(root, version, name)
			const text = readFileSync(path, "utf8")
			const stored = JSON.parse(text.slice(text.indexOf("\n") + 1))
			stored.answer.transformed.stored = true
			const body = JSON.stringify(stored)
			writeFileSync(path, `${hashOf(body)}\n${body}`)
		}
	}
}

// runs with none of what earlier builds stored, which stays for later ones
const uncached = async <t>(dir: string, run: () => Promise<t>): Promise<t> => {
	const root = cacheRootOf(dir)
	const aside = `${root}-aside`
	if (existsSync(root)) renameSync(root, aside)
	try {
		return await run()
	} finally {
		rmSync(root, { recursive: true, force: true })
		if (existsSync(aside)) renameSync(aside, root)
	}
}

interface Asked {
	answers: Record<string, Answer>
	// the modules the cache answered
	hits: Set<string>
}

// each module a worker answers, in order
const ask = async (
	send: Send,
	dir: string,
	names: string[]
): Promise<Asked> => {
	const answers: Record<string, Answer> = {}
	const hits = new Set<string>()
	for (const name of names) {
		const id = join(dir, name)
		try {
			const answer = await send(["transform", readFileSync(id, "utf8"), id])
			if ((answer as { stored?: true } | undefined)?.stored) hits.add(name)
			answers[name] = answerOf(answer)
		} catch (e) {
			answers[name] = `threw ${String(e)}`
		}
	}
	return { answers, hits }
}

// a new worker's answers
const askAnew = async (dir: string, names: string[]): Promise<Asked> => {
	const send = workerIn(dir)
	try {
		return await ask(send, dir, names)
	} finally {
		await send(["close"])
	}
}

// the order the build asks for the modules in, the same for those an edit
// leaves whichever it adds or removes
const ordered = (app: App, modules: string[]) => {
	const names = [
		...app.types.map((_, m) => `types${m}.ts`),
		"barrel.ts",
		"lib/index.ts",
		"lib.ts",
		"extra.ts",
		...app.readers.map((_, j) => `reader${j}.ts`),
		"main.ts"
	]
	const result = app.order
		.map(i => names[i % names.length])
		.filter((name, i, all) => all.indexOf(name) === i)
	for (const name of names) if (!result.includes(name)) result.push(name)
	return result.filter(name => modules.includes(name))
}

let failed = 0
let edits = 0

const check = async ([initial, appEdits]: [App, Edit[]]): Promise<boolean> => {
	const dir = realpathSync.native(
		mkdtempSync(join(tmpdir(), "ark-incremental-"))
	)
	mkdirSync(join(dir, "node_modules"))
	symlinkSync(
		fromHere("..", "..", "type"),
		join(dir, "node_modules", "arktype")
	)
	writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }))
	let app = initial
	let files = filesOf(app)
	write(dir, files, new Map())
	let kept: Send | undefined
	// the kept worker's last answers, and a new one's asked in dependency order
	let previous: Record<string, Answer> = {}
	let previousUnimported: Record<string, Answer> = {}
	// what the build that stored each answer evaluated before it, by the
	// module, its text and the settings
	const storers: Record<string, string[]> = {}
	const storerOf = (name: string) =>
		`${name}\0${files.get(name)}\0${files.get("ark.json")}`
	try {
		for (let step = 0; step <= appEdits.length; step++) {
			if (step) {
				const next = appEdits[step - 1]
				app = applied(app, next)
				const nextFiles = filesOf(app)
				write(dir, nextFiles, files)
				files = nextFiles
				if (next.kind === "touch") {
					const names = [...files.keys()]
					const touched = join(dir, names[next.file % names.length])
					const at = new Date(Date.now() + 1000 * step)
					utimesSync(touched, at, at)
				}
				edits++
			}
			const modules = [...files.keys()].filter(name => name.endsWith(".ts"))
			const order = ordered(app, modules)
			// as a watch build asks after a change
			const keptAnswers = await uncached(dir, async () => {
				if (kept && (await kept(["reset"]))) {
					await kept(["close"])
					kept = undefined
				}
				kept ??= workerIn(dir)
				return (await ask(kept, dir, order)).answers
			})
			const fresh = await uncached(dir, () => askAnew(dir, order))
			// what every build so far stored, as a later build reads it
			markStored(dir)
			const cached = await askAnew(dir, order)
			const unimported = (await uncached(dir, () => askAnew(dir, modules)))
				.answers
			const mismatches: Record<string, Record<string, Answer>> = {}
			const evaluated = order.filter(name => !cached.hits.has(name))
			let unasked: Asked | undefined
			for (const name of order) {
				const answers: Record<string, Answer> = {}
				// one the cache answered is the answer of the build that stored
				// it, which evaluated what it did before it; another is evaluated
				// after the modules the cache didn't answer, as no other build is
				if (cached.answers[name] !== fresh.answers[name]) {
					const reference =
						cached.hits.has(name) ?
							(
								await uncached(dir, () =>
									askAnew(dir, [...storers[storerOf(name)], name])
								)
							).answers[name]
						:	(unasked ??= await uncached(dir, () => askAnew(dir, evaluated)))
								.answers[name]
					if (cached.answers[name] !== reference) {
						answers.fresh = fresh.answers[name]
						answers[cached.hits.has(name) ? "stored" : "unasked"] = reference
						answers.cached = cached.answers[name]
					}
				}
				// a kept module may hold its answer from before a change to a
				// module importing it, as one evaluated before it may decide what it
				// answers, while it answers alike alone
				const keepsAnswer =
					keptAnswers[name] === previous[name] &&
					unimported[name] === previousUnimported[name]
				if (keptAnswers[name] !== fresh.answers[name] && !keepsAnswer) {
					answers.kept = keptAnswers[name]
					answers.fresh = fresh.answers[name]
				}
				if (Object.keys(answers).length) mismatches[name] = answers
			}
			if (Object.keys(mismatches).length) {
				const kept = join(failureDir, `${seed}-${Date.now()}`)
				cpSync(dir, join(kept, "app"), {
					recursive: true,
					filter: path => !path.includes("node_modules")
				})
				writeFileSync(
					join(kept, "edits.json"),
					JSON.stringify(
						appEdits.slice(0, step),
						(_, v) => (typeof v === "bigint" ? `${v}n` : v),
						"\t"
					)
				)
				writeFileSync(join(kept, "order.json"), JSON.stringify(order))
				for (const [name, answers] of Object.entries(mismatches)) {
					for (const [reference, answer] of Object.entries(answers))
						writeFileSync(join(kept, `${name}.${reference}.json`), answer)
				}
				console.error(
					`\nMISMATCH after edit ${step} (${Object.entries(mismatches)
						.map(
							([name, answers]) =>
								`${name}: ${Object.keys(answers).join(" vs ")}`
						)
						.join(", ")}): kept in ${kept}`
				)
				failed++
				return false
			}
			for (const [i, name] of evaluated.entries())
				storers[storerOf(name)] = evaluated.slice(0, i)
			previous = keptAnswers
			previousUnimported = unimported
		}
		return true
	} finally {
		await kept?.(["close"])
		rmSync(dir, { recursive: true, force: true })
	}
}

const started = Date.now()
const result = await fc.check(fc.asyncProperty(edited, check), {
	numRuns: count,
	seed,
	endOnFailure: true,
	...(path && { path })
})
console.log(
	`${result.numRuns} apps, ${edits} edits from seed ${seed} in ${Math.round((Date.now() - started) / 1000)}s`
)
if (result.failed) {
	if (!failed) console.error(result.errorInstance ?? result.error)
	console.error(
		`replay with ARK_INCREMENTAL=1:${seed}:${result.counterexamplePath}`
	)
	process.exit(1)
}
