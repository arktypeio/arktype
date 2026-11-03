import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { AnswerCache, emptySnapshot, hashOf } from "@ark/aot/internal/cache.ts"
import {
	createKeyedPrecompiler,
	type TransformedModule
} from "@ark/aot/internal/driver.ts"
import {
	createAsyncPrecompiler,
	type BundlerResolve
} from "@ark/aot/internal/worker.ts"
import { precompile } from "@ark/aot/unplugin"
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { threadId } from "node:worker_threads"
import {
	build as viteBuild,
	defaultClientConditions,
	type Plugin as VitePlugin,
	type Rolldown
} from "vite"
import { inFreshProcess, packageFiles, writeFixture } from "./utils.ts"

const conditions = ["ark-ts"]

const cacheRootOf = (dir: string) => join(dir, "node_modules", ".cache", "ark")

// the stored answers, in the directory the current code writes
const entriesOf = (dir: string): string[] => {
	const root = cacheRootOf(dir)
	if (!existsSync(root)) return []
	return readdirSync(root).flatMap(version =>
		readdirSync(join(root, version))
			.filter(name => name.startsWith("a-"))
			.map(name => join(root, version, name))
	)
}

// each entry's name and when it was written, which a store changes
const writtenOf = (dir: string): string[] =>
	entriesOf(dir).map(path => `${path}@${statSync(path).mtimeMs}`)

// rewrites each stored answer as a valid entry, so one the cache gives is told
// apart from one the precompiler writes, naming another snapshot if given
const forge = (dir: string, snapshot?: string) => {
	for (const path of entriesOf(dir)) {
		const text = readFileSync(path, "utf8")
		const stored = JSON.parse(text.slice(text.indexOf("\n") + 1))
		const answer = stored.answer.transformed ?? stored.answer.keyed
		if (!answer) continue
		answer.code = "forged"
		if (snapshot !== undefined) stored.snapshot = snapshot
		const body = JSON.stringify(stored)
		writeFileSync(path, `${hashOf(body)}\n${body}`)
	}
}

// marks the code of each module a stored scan wrote, so a build the cache
// answers is told apart from one that scans again, which writes no mark, or
// fails once a mark it gave differs from what it writes
const forgeScan = (dir: string): number => {
	let marked = 0
	for (const path of entriesOf(dir)) {
		const text = readFileSync(path, "utf8")
		const stored = JSON.parse(text.slice(text.indexOf("\n") + 1))
		const modules: Record<string, { answer: { code?: string } | null }> =
			stored.answer?.modules ?? {}
		for (const { answer } of Object.values(modules)) {
			if (!answer?.code) continue
			answer.code += `\n${forgedLine}\n`
			marked++
		}
		const body = JSON.stringify(stored)
		writeFileSync(path, `${hashOf(body)}\n${body}`)
	}
	return marked
}

const forgedLine = 'console.log("forged")'

const forgedIn = (code: string) => code.split(forgedLine).length - 1

const isWhole = (path: string) => {
	const text = readFileSync(path, "utf8")
	const start = text.indexOf("\n") + 1
	return text.slice(0, start - 1) === hashOf(text.slice(start))
}

// a module as a plugin ahead gives it to be transformed, unlike its file, or
// as another plugin writes it, which the build only checks
type Given = [
	file: string,
	source: string,
	mappings?: string | undefined,
	kind?: "checkUnwritten"
]

// what a build's worker answers for each file, in order
const transformedIn = async (
	dir: string,
	files: (string | Given)[],
	opts: object = {},
	resolve?: BundlerResolve
): Promise<(TransformedModule | undefined)[]> => {
	const send = createAsyncPrecompiler({
		precompilerOptions: { cwd: dir, conditions, ...opts }
	})
	const answers: (TransformedModule | undefined)[] = []
	for (const file of files) {
		const [name, source, mappings, kind = "transform"] =
			typeof file === "string" ? [file] : file
		const id = join(dir, name)
		answers.push(
			(await send(
				[kind, source ?? readFileSync(id, "utf8"), id, mappings],
				resolve
			)) as TransformedModule | undefined
		)
	}
	await send(["close"])
	return answers
}

const codeIn = async (dir: string, file = "main.ts", opts: object = {}) =>
	(await transformedIn(dir, [file], opts))[0]?.code

// as a build with nothing stored answers, which one reading the cache must
const uncachedIn = (...args: Parameters<typeof transformedIn>) => {
	rmSync(cacheRootOf(args[0]), { recursive: true, force: true })
	return transformedIn(...args)
}

// answers as the bundler receives them, which JSON drops undefined keys of
const json = (answers: unknown) => JSON.stringify(answers)

// what a build answers for main.ts, which must be what one with nothing
// stored answers
const answersAnew = async (dir: string, opts: object = {}) => {
	const cached = json(await transformedIn(dir, ["main.ts"], opts))
	attest(cached.includes("forged")).equals(false)
	attest(cached).equals(json(await uncachedIn(dir, ["main.ts"], opts)))
}

type Send = ReturnType<typeof createAsyncPrecompiler>

// what --emit asks of a worker: the program, read whole, then each module
const emitting = async (send: Send, dir: string, files: string[]) => {
	const modules = Object.fromEntries(
		files.map(file => {
			const id = join(dir, file)
			return [id, { source: readFileSync(id, "utf8") }]
		})
	)
	await send(["program", { modules }])
	const answers: unknown[] = []
	for (const id in modules)
		answers.push(await send(["transform", modules[id].source, id]))
	return json(answers)
}

const emittedIn = async (dir: string, files: string[]) => {
	const send = createAsyncPrecompiler({
		precompilerOptions: { cwd: dir, conditions, inline: true }
	})
	const answers = await emitting(send, dir, files)
	await send(["close"])
	return answers
}

// a site reading a Type off a holder another module of the program, which it
// doesn't import, may come to write
const heldElsewhere = {
	"holder.ts":
		'import { type } from "arktype"\n\nexport const H1 = { a: type("string") }\nexport const Tb1 = type("number")\n',
	"main.ts":
		'import { type } from "arktype"\nimport { H1 } from "./holder.ts"\n\nexport const T = type({ x: H1.a })\n',
	"writer.ts":
		'import { H1, Tb1 } from "./holder.ts"\n\nconsole.log(H1.a, Tb1)\n'
}

const heldFiles = Object.keys(heldElsewhere)

const writeElsewhere = (dir: string) =>
	appendFileSync(join(dir, "writer.ts"), "H1.a = Tb1\n")

const writtenElsewhere = "`H1` is written at writer.ts:4:1"

const errorsIn = async (dir: string, files: string[]) =>
	(await transformedIn(dir, files)).map(answer =>
		answer?.errors.map(error => error.split("\n")[0])
	)

const shaped = (domain: string) =>
	`export const shape = { a: "${domain}" } as const\n`

const shapeReader = (specifier: string) =>
	`import { type } from "arktype"\nimport { shape } from "${specifier}"\n\nexport const T = type(shape)\n`

const typed = (domain: string) =>
	`import { type } from "arktype"\n\nexport const Typed = type({ a: "${domain}" })\n`

const typedReader =
	'import { type } from "arktype"\nimport { Typed } from "./typed.ts"\n\nexport const T = type({ typed: Typed })\n'

// a module as plugin-typescript gives it, without its blank lines, with the
// map from each line it gives to the line of its file
const transpiledOf = (file: string, source: string): Given => {
	const lines = source.split("\n")
	const kept = lines.flatMap((line, i) => (line ? [i] : []))
	return [
		file,
		`${kept.map(i => lines[i]).join("\n")}\n`,
		kept.map((line, i) => `AA${"ACEG"[line - (kept[i - 1] ?? 0)]}A`).join(";")
	]
}

const versionOf = (dir: string): string =>
	JSON.parse(readFileSync(fromHere("..", "..", dir, "package.json"), "utf8"))
		.version

const fakePackage = (name: string, version: string, dir?: string) =>
	packageFiles(
		name,
		{ "index.js": "export const type = () => {}\n" },
		{ version },
		dir
	)

// arktype's packages as the precompiler's own versions, and a copy of
// arktype of another version, which a module in sub/ reaches
const copies = {
	...fakePackage("arktype", versionOf("type")),
	...fakePackage("@ark/schema", versionOf("schema")),
	...fakePackage("@ark/util", versionOf("util")),
	...fakePackage("arktype", "2.1.0", "sub/node_modules/arktype"),
	"a.ts": 'import { type } from "arktype"\n\nexport const A = type("string")\n',
	"sub/b.ts":
		'import { type } from "arktype"\n\nexport const B = type("number")\n'
}

const secondCopy = "arktype resolves to more than one copy"

const hasSecondCopy = (errors: string[] | undefined) =>
	!!errors?.some(error => error.includes(secondCopy))

// a module whose Scope the build replaces with a stand-in, which a site
// another module refuses reads
const replaced = {
	"scope.ts": 'import { scope } from "arktype"\n\nexport const $ = scope({})\n',
	"main.ts": `import { $ } from "./scope.ts"
const unit = { toJSON: () => ({ tag: "u" }) }
export const T = $.type({ k: $.type.unit(unit) }).or({ k: "'b'", v: "number" })
`
}

const replacedMessage = "which the build replaced"

contextualize(function (this: Mocha.Suite) {
	this.timeout(120_000)

	describe("worker", () => {
		it("answers what an earlier build stored while nothing it read changed", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			attest(await codeIn(dir)).satisfies(/^import/)
			attest(entriesOf(dir).length).equals(1)
			forge(dir)
			attest(await codeIn(dir)).equals("forged")
		})

		it("misses once the module changes", async () => {
			const dir = writeFixture({ "main.ts": shapeReader("./shape.ts") })
			writeFileSync(join(dir, "shape.ts"), shaped("string"))
			await codeIn(dir)
			forge(dir)
			writeFileSync(
				join(dir, "main.ts"),
				`${shapeReader("./shape.ts")}export const U = type("number")\n`
			)
			await answersAnew(dir)
		})

		it("misses once a module it imports changes", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			await codeIn(dir)
			forge(dir)
			writeFileSync(join(dir, "shape.ts"), shaped("number"))
			await answersAnew(dir)
			await codeIn(dir)
			forge(dir)
			rmSync(join(dir, "shape.ts"))
			await answersAnew(dir)
		})

		it("misses once an import resolves to a new file", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape"),
				"shape/index.ts": shaped("string")
			})
			await codeIn(dir)
			forge(dir)
			writeFileSync(join(dir, "shape.ts"), shaped("number"))
			await answersAnew(dir)
		})

		it("misses once a tsconfig.json governs it", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("number")
			})
			await codeIn(dir)
			forge(dir)
			writeFileSync(join(dir, "tsconfig.json"), "{}")
			await answersAnew(dir)
		})

		it("misses once its settings change", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			await codeIn(dir)
			forge(dir)
			writeFileSync(
				join(dir, "ark.json"),
				JSON.stringify({ precompile: { errors: "first" } })
			)
			await answersAnew(dir)
		})

		it("misses under other options", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			await codeIn(dir)
			forge(dir)
			const other = json(
				await transformedIn(dir, ["main.ts"], { errors: "first" })
			)
			attest(await codeIn(dir)).equals("forged")
			attest(other).equals(
				json(await uncachedIn(dir, ["main.ts"], { errors: "first" }))
			)
		})

		it("misses where --emit leaves dependencies to Node", async () => {
			const dir = writeFixture({
				"main.ts": `import { type } from "arktype"\nimport { Length } from "schemas"\n\nexport const T = type({ name: Length })\n`,
				...packageFiles(
					"schemas",
					{
						"index.js": `import { type } from "arktype"\n\nexport const Length = type("string <= 50")\n`
					},
					{ ark: { aot: true } }
				)
			})
			await codeIn(dir)
			forge(dir)
			// as --emit asks, refusing the site a bundler's build precompiles
			const send = createAsyncPrecompiler({
				precompilerOptions: { cwd: dir, conditions },
				leavesDependencies: true
			})
			const id = join(dir, "main.ts")
			const emitted = (await send([
				"transform",
				readFileSync(id, "utf8"),
				id
			])) as TransformedModule | undefined
			await send(["close"])
			attest(emitted?.errors.map(error => error.split("\n")[0])).snap([
				"main.ts:4:18  type({ name: Length }) can't be precompiled yet"
			])
		})

		it("never reads what another version of the code wrote", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			await codeIn(dir)
			forge(dir)
			const root = cacheRootOf(dir)
			const [version] = readdirSync(root)
			renameSync(join(root, version), join(root, hashOf("other")))
			attest(await codeIn(dir)).satisfies(/^import/)
			attest(readdirSync(root)).equals([version])
		})

		it("removes nothing in its directory it didn't write", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string"),
				"node_modules/.cache/ark/kept/file.txt": "kept"
			})
			await codeIn(dir)
			attest(readdirSync(cacheRootOf(dir)).includes("kept")).equals(true)
		})

		it("misses where an entry names a snapshot it couldn't have written", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			await codeIn(dir)
			const version = dirname(entriesOf(dir)[0])
			// a valid snapshot stating nothing, outside the cache, which s-../../
			// reaches from its directory
			const body = JSON.stringify(emptySnapshot(undefined))
			writeFileSync(join(dir, "outside.json"), `${hashOf(body)}\n${body}`)
			const outside = `../../${relative(version, join(dir, "outside"))}`
			// one a key every object has, toString, held before it was read
			for (const [snapshot, domain] of [
				["toString", "number"],
				[outside, "boolean"]
			]) {
				forge(dir, snapshot)
				writeFileSync(join(dir, "shape.ts"), shaped(domain))
				await answersAnew(dir)
			}
		})

		it("writes no file a link left in its place reaches", async () => {
			const dir = writeFixture({ "target.txt": "kept" })
			const cache = new AnswerCache(dir)
			const key = hashOf("key")
			symlinkSync(
				join(dir, "target.txt"),
				join(cache.dir, `a-${key}.json.${process.pid}-${threadId}.tmp`)
			)
			cache.set(key, "answer", hashOf("snapshot"))
			attest(readFileSync(join(dir, "target.txt"), "utf8")).equals("kept")
		})

		it("answers a module a plugin ahead transpiled", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			const transpiled = transpiledOf("main.ts", shapeReader("./shape.ts"))
			const [answer] = await transformedIn(dir, [transpiled])
			attest(answer?.code).satisfies(/^import/)
			forge(dir)
			attest((await transformedIn(dir, [transpiled]))[0]?.code).equals("forged")
		})

		it("misses once a plugin ahead gives a module it imports otherwise", async () => {
			const dir = writeFixture({
				"main.ts": typedReader,
				"typed.ts": typed("string")
			})
			const givenAs = (domain: string) => [
				transpiledOf("typed.ts", typed(domain)),
				"main.ts"
			]
			const asString = await transformedIn(dir, givenAs("string"))
			const asNumber = json(await transformedIn(dir, givenAs("number")))
			attest(asNumber === json(asString)).equals(false)
			attest(asNumber).equals(json(await uncachedIn(dir, givenAs("number"))))
		})

		it("misses once another plugin writes a module it imports otherwise", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./Shape.svelte"),
				"Shape.svelte": "<script>\n</script>\n"
			})
			// as Svelte compiles a component exporting its shape
			const writtenAs = (domain: string): (string | Given)[] => [
				[
					"Shape.svelte",
					`import "arktype"\n\nexport const shape = { a: "${domain}" }\n`,
					undefined,
					"checkUnwritten"
				],
				"main.ts"
			]
			const asString = await transformedIn(dir, writtenAs("string"))
			const asNumber = json(await transformedIn(dir, writtenAs("number")))
			attest(asNumber === json(asString)).equals(false)
			attest(asNumber).equals(json(await uncachedIn(dir, writtenAs("number"))))
		})

		it("misses for a module the build gave otherwise before", async () => {
			const dir = writeFixture({
				"main.ts": typedReader,
				"typed.ts": typed("string")
			})
			const givenAs = (domain: string) =>
				transpiledOf("typed.ts", typed(domain))
			await transformedIn(dir, [givenAs("number")])
			// its importers read what it was given last, which only precompiling it again gives them
			const requests = [givenAs("string"), givenAs("number"), "main.ts"]
			const answers = json(await transformedIn(dir, requests))
			attest(answers).equals(json(await uncachedIn(dir, requests)))
		})

		it("stores no answer with a diagnostic", async () => {
			const dir = writeFixture(replaced)
			const errors = await errorsIn(dir, ["main.ts"])
			// its refusal, and its read of the Scope scope.ts replaces
			attest(errors[0]?.length).equals(2)
			attest(entriesOf(dir)).equals([])
			attest(await errorsIn(dir, ["main.ts"])).equals(errors)
		})

		it("rewrites an entry that fails its check", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			const code = await codeIn(dir)
			const [entry] = entriesOf(dir)
			appendFileSync(entry, " ")
			attest(isWhole(entry)).equals(false)
			attest(await codeIn(dir)).equals(code)
			attest(isWhole(entry)).equals(true)
			writeFileSync(entry, readFileSync(entry, "utf8").slice(0, 40))
			attest(await codeIn(dir)).equals(code)
			attest(isWhole(entry)).equals(true)
		})

		it("keeps whole answers as builds write it at once", async () => {
			const files: Record<string, string> = {}
			const names: string[] = []
			for (let i = 0; i < 8; i++) {
				files[`m${i}.ts`] =
					`import { type } from "arktype"\n\nexport const T${i} = type({ a${i}: "string" })\n`
				names.push(`m${i}.ts`)
			}
			const dir = writeFixture(files)
			const builds = await Promise.all(
				[0, 1, 2, 3].map(() => transformedIn(dir, names))
			)
			for (const answers of builds.slice(1))
				attest(json(answers)).equals(json(builds[0]))
			attest(entriesOf(dir).length).equals(names.length)
			attest(entriesOf(dir).every(isWhole)).equals(true)
			const [version] = readdirSync(cacheRootOf(dir))
			attest(
				readdirSync(join(cacheRootOf(dir), version)).filter(name =>
					name.endsWith(".tmp")
				)
			).equals([])
		})

		it("misses once the bundler resolves an import otherwise", async () => {
			const dir = writeFixture({
				"main.ts":
					'import { type } from "arktype"\nimport { shape } from "#shape"\n\nexport const T = type(shape)\n',
				"a.ts": shaped("string"),
				"b.ts": shaped("number")
			})
			const resolvingTo =
				(file: string): BundlerResolve =>
				async specifier =>
					specifier === "#shape" ? join(dir, file) : undefined
			const answersResolving = async (file: string) =>
				json(await transformedIn(dir, ["main.ts"], {}, resolvingTo(file)))
			await answersResolving("a.ts")
			attest(entriesOf(dir).length).equals(1)
			forge(dir)
			attest(await answersResolving("a.ts")).satisfies(/"forged"/)
			const toB = await answersResolving("b.ts")
			attest(toB).equals(
				json(await uncachedIn(dir, ["main.ts"], {}, resolvingTo("b.ts")))
			)
		})

		it("reads the copy of arktype a module it answers reaches", async () => {
			const dir = writeFixture(copies)
			const [, b] = await errorsIn(dir, ["a.ts", "sub/b.ts"])
			attest(hasSecondCopy(b)).equals(true)
			await transformedIn(dir, ["a.ts"])
			const [, cachedB] = await errorsIn(dir, ["a.ts", "sub/b.ts"])
			attest(cachedB).equals(b)
		})

		it("reads the copy of arktype a module it keeps across a change reaches", async () => {
			const dir = writeFixture(copies)
			const send = createAsyncPrecompiler({
				precompilerOptions: { cwd: dir, conditions }
			})
			const transform = async (file: string) => {
				const id = join(dir, file)
				return (await send(["transform", readFileSync(id, "utf8"), id])) as
					| TransformedModule
					| undefined
			}
			await transform("a.ts")
			attest(await send(["reset"])).equals(false)
			await transform("a.ts")
			attest(hasSecondCopy((await transform("sub/b.ts"))?.errors)).equals(true)
			await send(["close"])
		})

		it("misses once another module of the program writes what it reads", async () => {
			const dir = writeFixture(heldElsewhere)
			const unwritten = await emittedIn(dir, heldFiles)
			attest(unwritten.includes(writtenElsewhere)).equals(false)
			writeElsewhere(dir)
			const written = await emittedIn(dir, heldFiles)
			attest(written.includes(writtenElsewhere)).equals(true)
			rmSync(cacheRootOf(dir), { recursive: true })
			attest(await emittedIn(dir, heldFiles)).equals(written)
		})

		it("answers anew across a reset once another module of the program writes what it reads", async () => {
			const dir = writeFixture(heldElsewhere)
			const send = createAsyncPrecompiler({
				precompilerOptions: { cwd: dir, conditions, inline: true }
			})
			await emitting(send, dir, heldFiles)
			attest(await send(["reset"])).equals(false)
			writeElsewhere(dir)
			const kept = await emitting(send, dir, heldFiles)
			await send(["close"])
			rmSync(cacheRootOf(dir), { recursive: true })
			attest(kept).equals(await emittedIn(dir, heldFiles))
			attest(kept.includes(writtenElsewhere)).equals(true)
		})

		it("reads a module at a time once a reset ends the build that read the program", async () => {
			const dir = writeFixture(heldElsewhere)
			writeElsewhere(dir)
			const send = createAsyncPrecompiler({
				precompilerOptions: { cwd: dir, conditions, inline: true }
			})
			attest(
				(await emitting(send, dir, heldFiles)).includes(writtenElsewhere)
			).equals(true)
			attest(await send(["reset"])).equals(false)
			const id = join(dir, "main.ts")
			const kept = json(await send(["transform", readFileSync(id, "utf8"), id]))
			await send(["close"])
			attest(kept).equals(
				json((await uncachedIn(dir, ["main.ts"], { inline: true }))[0])
			)
			attest(kept.includes(writtenElsewhere)).equals(false)
		})

		it("answers for a module whose Scope another module's refused site reads", async () => {
			const dir = writeFixture(replaced)
			const errors = await errorsIn(dir, ["scope.ts", "main.ts"])
			attest(errors[1]?.some(error => error.includes(replacedMessage))).equals(
				true
			)
			forge(dir)
			const [scope, main] = await transformedIn(dir, ["scope.ts", "main.ts"])
			attest(scope?.code).equals("forged")
			attest(main?.errors.map(error => error.split("\n")[0])).equals(errors[1])
		})
	})

	describe("turbopack", () => {
		// what a Next process's loader answers for each file, which stores
		// what it can as its process's first precompiler
		const keyedIn = (dir: string, files: string[]) =>
			inFreshProcess(
				async (dir: string, files: string[]) => {
					const { join } = await import("node:path")
					const { readFileSync } = await import("node:fs")
					const { createKeyedPrecompiler } = await import(
						"@ark/aot/internal/driver.ts"
					)
					const precompiler = createKeyedPrecompiler({
						cwd: dir,
						conditions: ["ark-ts"]
					})
					return files.map(file => {
						const { code, errors } = precompiler.precompile(
							readFileSync(join(dir, file), "utf8"),
							join(dir, file)
						)
						return { code, errors: errors.map(e => e.split("\n")[0]) }
					})
				},
				[dir, files]
			)

		it("answers anew once a file a cached answer read changes", () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			keyedIn(dir, ["main.ts"])
			forge(dir)
			const main = join(dir, "main.ts")
			const precompiler = createKeyedPrecompiler({ cwd: dir, conditions })
			const codeOf = () =>
				precompiler.precompile(readFileSync(main, "utf8"), main).code
			attest(codeOf()).equals("forged")
			writeFileSync(join(dir, "shape.ts"), shaped("number"))
			attest(codeOf()).satisfies(/"number"/)
		})

		it("reads the copy of arktype a module it answers reaches", () => {
			const dir = writeFixture(copies)
			const [, b] = keyedIn(dir, ["a.ts", "sub/b.ts"])
			attest(hasSecondCopy(b.errors)).equals(true)
			keyedIn(dir, ["a.ts"])
			attest(keyedIn(dir, ["a.ts", "sub/b.ts"])[1]).equals(b)
		})

		it("answers for a module whose Scope another module's refused site reads", () => {
			const dir = writeFixture(replaced)
			const [, main] = keyedIn(dir, ["scope.ts", "main.ts"])
			attest(main.errors.some(error => error.includes(replacedMessage))).equals(
				true
			)
			forge(dir)
			const [scope, reread] = keyedIn(dir, ["scope.ts", "main.ts"])
			attest(scope.code).equals("forged")
			attest(reread).equals(main)
		})
	})

	describe("scan", () => {
		// a pruned production build, or the message it fails with
		const built = async (
			dir: string,
			plugins: VitePlugin[] = [],
			alias: Record<string, string> = {},
			// false where a workspace links arktype from its source
			preserveSymlinks = true
		) => {
			// Vite sets NODE_ENV for a production build, which later suites' processes inherit
			const { NODE_ENV } = process.env
			try {
				const [{ output }] = (await viteBuild({
					root: dir,
					configFile: false,
					logLevel: "silent",
					mode: "production",
					plugins: [...plugins, precompile.vite({ cwd: dir, conditions })],
					resolve: {
						alias,
						conditions: [...conditions, ...defaultClientConditions],
						preserveSymlinks
					},
					build: {
						write: false,
						minify: false,
						lib: { entry: "main.ts", formats: ["es"] }
					}
				})) as Rolldown.RolldownOutput[]
				// each chunk, as a module another plugin adds writes one of its own
				return output
					.map(chunk => (chunk.type === "chunk" ? chunk.code : ""))
					.join("\n")
			} catch (e) {
				return (e as Error).message
			} finally {
				if (NODE_ENV === undefined) delete process.env.NODE_ENV
				else process.env.NODE_ENV = NODE_ENV
			}
		}

		const program = {
			"main.ts":
				'import { User } from "./user.ts"\nimport { Admin } from "./admin.ts"\n\nconsole.log(User({ name: "x" }), Admin.allows({ role: "admin" }))\n',
			"user.ts":
				'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
			"admin.ts":
				'import { type } from "arktype"\nimport { User } from "./user.ts"\n\nexport const Admin = User.and({ role: "\'admin\'" })\n'
		}

		// a program arktype's own package is installed in
		const installed = (files: Record<string, string>) => {
			const dir = writeFixture(files)
			mkdirSync(join(dir, "node_modules"), { recursive: true })
			symlinkSync(
				fromHere("..", "..", "type"),
				join(dir, "node_modules/arktype")
			)
			return dir
		}

		it("answers a build from what an earlier build stored", async () => {
			const dir = installed(program)
			const code = await built(dir)
			attest(code).satisfies(/User/)
			const written = writtenOf(dir)
			attest(written.length).equals(2)
			attest(await built(dir)).equals(code)
			attest(writtenOf(dir)).equals(written)
		})

		it("answers a scan that keeps members, warning as it did", async () => {
			const dir = installed({
				"main.ts": 'import { A } from "./a.ts"\n\nglobalThis.A = A\n',
				"a.ts":
					'import { type } from "arktype"\n\nexport const A = type({ name: "string" })\n'
			})
			// the warnings a build logs, and its code
			const warnedIn = async () => {
				const warnings: string[] = []
				const listener: VitePlugin = {
					name: "listener",
					// arktype's own, apart from the bundler's, like its timings
					onLog: (level, log) => {
						if (level === "warn" && log.plugin === "arktype")
							warnings.push(log.message)
					}
				}
				return [await built(dir, [listener]), warnings] as const
			}
			const [code, warnings] = await warnedIn()
			attest(warnings).snap([
				"prune: keeping assert, meta, ~standard and methods, because the validator at a.ts:3:18 is lost where main.ts:3:1 stores it on the global object, which code outside the bundle may read. Set assert, meta, ~standard and methods in members, each true where code reads it, like ~standard where a library validates with it, else false, to build without this warning.",
				"precompile: baking each introspection member into the validator at a.ts:3:18, because main.ts:3:1 stores it on the global object, which code outside the bundle may read. Set expression, description, json, toJSON, toJsonSchema and ~standard.jsonSchema in members, each false where no code reads it, to build without this warning."
			])
			const written = writtenOf(dir)
			attest(written.length).equals(2)
			attest(await warnedIn()).equals([code, warnings])
			attest(writtenOf(dir)).equals(written)
		})

		it("answers a package a workspace links from what its scan stored", async () => {
			const dir = installed({
				...packageFiles(
					"@acme/schemas",
					{
						"index.ts":
							'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n'
					},
					{ exports: "./index.ts" },
					"packages/schemas"
				),
				"main.ts":
					'import { User } from "@acme/schemas"\n\nconsole.log(User.allows({ name: "x" }))\n'
			})
			mkdirSync(join(dir, "node_modules/@acme"))
			symlinkSync(
				join(dir, "packages/schemas"),
				join(dir, "node_modules/@acme/schemas")
			)
			// as the bundler resolves a link to its file
			const linked = {
				"@acme/schemas": join(dir, "packages/schemas/index.ts")
			}
			const code = await built(dir, [], linked)
			attest(code).satisfies(/name/)
			attest(await built(dir, [], linked)).equals(code)
			// the package's module, as main.ts reads it unchanged
			const marked = forgeScan(dir)
			attest(marked).equals(1)
			attest(forgedIn(await built(dir, [], linked))).equals(marked)
		})

		it("answers a module its scan never reached without scanning again", async () => {
			// arktype's own modules, as Vite follows the link to the workspace's
			// source, which no scan reads
			const dir = installed(program)
			const code = await built(dir, [], {}, false)
			attest(code).satisfies(/User/)
			attest(await built(dir, [], {}, false)).equals(code)
			const marked = forgeScan(dir)
			attest(marked).equals(2)
			attest(forgedIn(await built(dir, [], {}, false))).equals(marked)
		})

		it("scans again for a module its scan never reached that it writes", async () => {
			const dir = installed({
				...program,
				"extra.ts":
					'import { type } from "arktype"\n\nconsole.log(type({ id: "number" })({ id: 1 }))\n'
			})
			// a chunk another plugin adds, which no import from the entry reaches
			const emitter: VitePlugin = {
				name: "emitter",
				buildStart() {
					this.emitFile({ type: "chunk", id: join(dir, "extra.ts") })
				}
			}
			const code = await built(dir, [emitter])
			attest(await built(dir, [emitter])).equals(code)
			attest(forgeScan(dir)).equals(2)
			attest(forgedIn(await built(dir, [emitter]))).equals(0)
		})

		it("scans again for a module unlike those it stored", async () => {
			const dir = installed(program)
			await built(dir)
			// as a plugin ahead transpiling it would
			const rewriter: VitePlugin = {
				name: "rewriter",
				enforce: "pre",
				transform: (code, id) =>
					id.endsWith("admin.ts") ? `${code}// rewritten\n` : undefined
			}
			const code = await built(dir, [rewriter])
			attest(code).satisfies(/User/)
			rmSync(cacheRootOf(dir), { recursive: true })
			attest(await built(dir, [rewriter])).equals(code)
		})

		it("scans anew where an entry fails its check", async () => {
			const dir = installed(program)
			const code = await built(dir)
			for (const entry of entriesOf(dir)) appendFileSync(entry, " ")
			attest(await built(dir)).equals(code)
			attest(entriesOf(dir).every(isWhole)).equals(true)
		})

		it("scans anew once the bundler resolves an import otherwise", async () => {
			const dir = installed({
				"main.ts":
					'import { User } from "#user"\n\nconsole.log(User.allows({ name: "x" }))\n',
				"a.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
				"b.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "number" })\n'
			})
			const resolvingTo = (file: string) => ({ "#user": join(dir, file) })
			const toA = await built(dir, [], resolvingTo("a.ts"))
			const toB = await built(dir, [], resolvingTo("b.ts"))
			attest(toB === toA).equals(false)
			rmSync(cacheRootOf(dir), { recursive: true })
			attest(await built(dir, [], resolvingTo("b.ts"))).equals(toB)
		})

		it("reads the copies of arktype the modules it answers reach", async () => {
			const dir = installed({
				...packageFiles(
					"forked",
					{
						"index.js":
							'import { type } from "arktype"\nexport const forked = typeof type\n'
					},
					{ version: "1.0.0" }
				),
				...fakePackage(
					"arktype",
					"2.1.0",
					"node_modules/forked/node_modules/arktype"
				),
				"main.ts":
					'import { type } from "arktype"\nimport { forked } from "forked"\n\nconsole.log(type("string")("x"), forked)\n'
			})
			const failed = await built(dir)
			attest(failed.includes(secondCopy)).equals(true)
			attest(writtenOf(dir).length).equals(1)
			attest(await built(dir)).equals(failed)
		})

		it("scans once for a program that precompiles a Scope another module reads", async () => {
			const dir = installed({
				// what nothing reads, so it prunes without a warning
				"ark.json": JSON.stringify({
					precompile: {
						members: {
							assert: false,
							meta: false,
							"~standard": false,
							methods: false
						}
					}
				}),
				"scope.ts":
					'import { scope } from "arktype"\n\nexport const $ = scope({ a: "string" })\n',
				"main.ts":
					'import { $ } from "./scope.ts"\n\nconsole.log($.type("a")("x"))\n'
			})
			const code = await built(dir)
			attest(code).satisfies(/typeof data === "string"/)
			const written = writtenOf(dir)
			attest(written.length).equals(2)
			attest(await built(dir)).equals(code)
			attest(writtenOf(dir)).equals(written)
		})
	})
})
