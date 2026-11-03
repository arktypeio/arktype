import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import { hashOf } from "@ark/aot/internal/cache.ts"
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
import { join } from "node:path"
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
// apart from one the precompiler writes
const forge = (dir: string) => {
	for (const path of entriesOf(dir)) {
		const text = readFileSync(path, "utf8")
		const stored = JSON.parse(text.slice(text.indexOf("\n") + 1))
		const answer = stored.answer.transformed ?? stored.answer.keyed
		if (!answer) continue
		answer.code = "forged"
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

// what a build's worker answers for each file, in order
const transformedIn = async (
	dir: string,
	files: string[],
	opts: object = {},
	resolve?: BundlerResolve
): Promise<(TransformedModule | undefined)[]> => {
	const send = createAsyncPrecompiler({
		precompilerOptions: { cwd: dir, conditions, ...opts }
	})
	const answers: (TransformedModule | undefined)[] = []
	for (const file of files) {
		const id = join(dir, file)
		answers.push(
			(await send(["transform", readFileSync(id, "utf8"), id], resolve)) as
				| TransformedModule
				| undefined
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

const errorsIn = async (dir: string, files: string[]) =>
	(await transformedIn(dir, files)).map(answer =>
		answer?.errors.map(error => error.split("\n")[0])
	)

const shaped = (domain: string) =>
	`export const shape = { a: "${domain}" } as const\n`

const shapeReader = (specifier: string) =>
	`import { type } from "arktype"\nimport { shape } from "${specifier}"\n\nexport const T = type(shape)\n`

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

		it("never reads what another version of the code wrote", async () => {
			const dir = writeFixture({
				"main.ts": shapeReader("./shape.ts"),
				"shape.ts": shaped("string")
			})
			await codeIn(dir)
			forge(dir)
			const root = cacheRootOf(dir)
			const [version] = readdirSync(root)
			renameSync(join(root, version), join(root, "other"))
			attest(await codeIn(dir)).satisfies(/^import/)
			attest(readdirSync(root)).equals([version])
		})

		it("stores no answer with a diagnostic", async () => {
			const dir = writeFixture(replaced)
			const errors = await errorsIn(dir, ["main.ts"])
			attest(errors[0]?.length).equals(1)
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

		it("never answers for a module that replaced a Scope a refused site reads", async () => {
			const dir = writeFixture(replaced)
			const errors = await errorsIn(dir, ["scope.ts", "main.ts"])
			attest(errors[1]?.some(error => error.includes(replacedMessage))).equals(
				true
			)
			attest(await errorsIn(dir, ["scope.ts", "main.ts"])).equals(errors)
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

		it("never answers for a module that replaced a Scope a refused site reads", () => {
			const dir = writeFixture(replaced)
			const loaded = keyedIn(dir, ["scope.ts", "main.ts"])
			attest(
				loaded[1].errors.some(error => error.includes(replacedMessage))
			).equals(true)
			attest(keyedIn(dir, ["scope.ts", "main.ts"])).equals(loaded)
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
	})
})
