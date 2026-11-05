import { attest, contextualize } from "@ark/attest"
import {
	writeMissedByProgramMessage,
	writeUnreadProgramMessage
} from "@ark/aot/internal/messages.ts"
import { writeKeptMembersMessage } from "@ark/aot/internal/scan.ts"
import { programDirOf, programOf } from "@ark/aot/internal/nextProgram.ts"
import { turbopackRulesProblemOf } from "@ark/aot/internal/pluginCalls.ts"
import type { PrecompilePluginOptions } from "@ark/aot/unplugin"
import turbopack, { type TurbopackLoaderContext } from "@ark/aot/turbopack"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync
} from "node:fs"
import { dirname, join, resolve as resolvePath } from "node:path"
import { writeFixture } from "./utils.ts"

const conditions = ["ark-ts"]

const rules = (rule: string) =>
	`export default { turbopack: { rules: { "*.ts": ${rule} } } }\n`

const ownRule = '{ loaders: ["@ark/aot/turbopack"] }'

const project = (files: Record<string, string> = {}) =>
	writeFixture({
		"next.config.js": rules(ownRule),
		"node_modules/next/package.json": '{ "name": "next" }',
		"node_modules/.bin/next": "",
		"src/user.ts":
			'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
		"app/page.ts":
			'import { User } from "../src/user.ts"\n\nexport const GET = (data: unknown) => Response.json(User.allows(data))\n',
		...files
	})

// Turbopack's own resolver, where a module's layer may answer otherwise
type Resolved = Record<string, string | undefined>

interface Loaded {
	out: string | undefined
	message: string | undefined
	warnings: string[]
}

const load = (
	dir: string,
	file: string,
	{
		opts = {},
		source = readFileSync(join(dir, file), "utf8"),
		resolved = {},
		arktypeFrom
	}: {
		opts?: PrecompilePluginOptions
		source?: string
		resolved?: Resolved
		// a directory arktype/runtime resolves otherwise from, as a nested install's
		arktypeFrom?: string | undefined
	} = {}
) =>
	new Promise<Loaded>(settle => {
		const warnings: string[] = []
		const context: TurbopackLoaderContext = {
			mode: "production",
			rootContext: dir,
			resourcePath: join(dir, file),
			getOptions: () => ({ conditions, cwd: dir, ...opts }),
			addDependency: () => {},
			emitWarning: warning => warnings.push(warning.message),
			getResolve: () => async (context, request) => {
				if (request in resolved) {
					const answer = resolved[request]
					if (answer === undefined) throw new Error(`Can't resolve ${request}`)
					return join(dir, answer)
				}
				if (request.startsWith(".")) return resolvePath(context, request)
				if (request === "arktype/runtime" && context === arktypeFrom)
					return join(dir, "node_modules/arktype/runtime.js")
				// bundled by Next, as the loader's check that it's bundled asks
				if (request === "arktype/runtime" || request.startsWith("next/"))
					return runtimeFile
				throw new Error(`Can't resolve ${request}`)
			},
			async: () => (error, out) =>
				settle({ out, message: error?.message, warnings })
		}
		try {
			const out = turbopack.call(context, source)
			if (out !== undefined) settle({ out, message: undefined, warnings })
		} catch (e) {
			settle({ out: undefined, message: (e as Error).message, warnings })
		}
	})

const runtimeFile = join(import.meta.dirname, "../../type/runtime.ts")

const unitsDirIn = (dir: string) => {
	const ark = join(dir, "node_modules/.bin/.ark")
	return join(ark, readdirSync(ark)[0])
}

contextualize(() => {
	describe("a `next build` reading its project", () => {
		it("writes a module's validators to a file its code imports", async () => {
			const dir = project()
			const { out, warnings } = await load(dir, "src/user.ts")
			attest(warnings).equals([])
			const specifier = /from "(\.\.\/node_modules\/[^"]+)"/.exec(out!)![1]
			attest(existsSync(join(dir, "src", specifier))).equals(true)
			attest(dirname(join(dir, "src", specifier))).equals(unitsDirIn(dir))
		})

		it("leaves out what no module reads, keeping what any does", async () => {
			const dir = project()
			await load(dir, "src/user.ts")
			const written = readdirSync(unitsDirIn(dir))
				.map(name => readFileSync(join(unitsDirIn(dir), name), "utf8"))
				.join("\n")
			attest(written.includes("allows")).equals(true)
			attest(written.includes("~standard")).equals(false)
		})

		it("keeps what a module nothing imports reads", async () => {
			const dir = project({
				"src/unused.ts":
					'import { User } from "./user.ts"\n\nexport const standard = User["~standard"]\n'
			})
			await load(dir, "src/user.ts")
			const written = readdirSync(unitsDirIn(dir))
				.map(name => readFileSync(join(unitsDirIn(dir), name), "utf8"))
				.join("\n")
			attest(written.includes("~standard")).equals(true)
		})

		// which code it can't read may read, so it keeps what it would leave out
		const keptFor = (reason: string) =>
			writeKeptMembersMessage(reason, [
				"assert",
				"meta",
				"~standard",
				"methods"
			])

		it("takes what nothing imports for an entry", async () => {
			const dir = project({
				"src/unused.ts":
					'import { User } from "./user.ts"\n\nexport const Unused = User\n'
			})
			attest((await load(dir, "src/user.ts")).warnings).equals([
				keptFor(
					"src/unused.ts exports Unused, which code outside the bundle may read"
				)
			])
		})

		it("takes a route another module imports for an entry", async () => {
			const dir = project({
				"app/page.ts":
					'import { User } from "../src/user.ts"\n\nexport const Page = User\n',
				"src/imports.ts": 'import { Page } from "../app/page.ts"\n\nPage({})\n'
			})
			attest((await load(dir, "src/user.ts")).warnings).equals([
				keptFor(
					"app/page.ts exports Page, which code outside the bundle may read"
				)
			])
		})

		it("takes a client component another module imports for an entry", async () => {
			const dir = project({
				"src/client.ts":
					'"use client"\nimport { User } from "./user.ts"\n\nexport const Client = User\n',
				"app/page.ts":
					'import { Client } from "../src/client.ts"\n\nexport const GET = () => Response.json(Client.allows(1))\n'
			})
			attest((await load(dir, "src/user.ts")).warnings).equals([
				keptFor(
					"src/client.ts exports Client, which code outside the bundle may read"
				)
			])
		})

		it("takes one of a cycle nothing else imports for an entry", async () => {
			const dir = project({
				"src/a.ts":
					'import { User } from "./user.ts"\nimport "./b.ts"\n\nexport const A = User\n',
				"src/b.ts": 'import { A } from "./a.ts"\n\nexport const B = () => A\n'
			})
			attest((await load(dir, "src/user.ts")).warnings).equals([
				keptFor("src/a.ts exports A, which code outside the bundle may read")
			])
		})

		it("takes over from a reader that died", async () => {
			const dir = project()
			const opts = { conditions, cwd: dir }
			const lock = join(programDirOf(dir, opts), "reading")
			mkdirSync(lock, { recursive: true })
			// no process has this id
			writeFileSync(join(lock, "pid"), "2147483646")
			const { refused } = await programOf(dir, opts, async (_, request) => {
				if (request === "arktype/runtime") return runtimeFile
				throw new Error(`Can't resolve ${request}`)
			})
			attest(refused).equals(undefined)
		})

		it("has what it writes import what it wrote", async () => {
			const dir = project({
				"src/user.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string", address: { street: "string", city: "string" } })\n'
			})
			const { out } = await load(dir, "src/user.ts")
			const written = readdirSync(unitsDirIn(dir)).map(name =>
				readFileSync(join(unitsDirIn(dir), name), "utf8")
			)
			attest(written.some(code => /from "\.\/\w+\.js"/.test(code))).equals(true)
			attest(
				[out, ...written].some(code => code!.includes("~arktype/"))
			).equals(false)
		})
	})

	describe("what the read of the project missed", () => {
		it("fails a module it didn't read", async () => {
			const dir = project({
				"public/stray.ts":
					'import { type } from "arktype"\n\nexport const Stray = type("string")\n'
			})
			attest((await load(dir, "public/stray.ts")).message).equals(
				writeMissedByProgramMessage("public/stray.ts", "is built")
			)
		})

		it("fails a module a loader ahead rewrote", async () => {
			const dir = project()
			attest(
				(
					await load(dir, "src/user.ts", {
						source: readFileSync(join(dir, "src/user.ts"), "utf8").replace(
							"string",
							"number"
						)
					})
				).message
			).equals(
				writeMissedByProgramMessage(
					"src/user.ts",
					"reaches this loader rewritten"
				)
			)
		})

		it("fails a module importing another module in this layer", async () => {
			const dir = project({ "src/other.ts": "export const User = 1\n" })
			await load(dir, "src/user.ts")
			attest(
				(
					await load(dir, "app/page.ts", {
						resolved: { "../src/user.ts": "src/other.ts" }
					})
				).message
			).equals(
				writeMissedByProgramMessage(
					"app/page.ts",
					'imports "../src/user.ts" as src/other.ts'
				)
			)
		})

		it("reads an import apart from the layer of the module asking", async () => {
			const dir = project({ "src/other.ts": "export const User = 1\n" })
			attest(
				(
					await load(dir, "app/page.ts", {
						resolved: { "../src/user.ts": "src/other.ts" }
					})
				).message
			).equals(
				writeMissedByProgramMessage(
					"app/page.ts",
					'imports "../src/user.ts" as src/other.ts'
				)
			)
		})

		it("fails a module whose import the read left resolving into it here", async () => {
			const dir = project({
				"src/imports.ts":
					'import { User } from "./user.ts"\nimport "dep"\n\nexport const reads = User.assert\n',
				"node_modules/dep/package.json": '{ "name": "dep" }',
				"node_modules/dep/index.js": ""
			})
			const inDependency = { dep: "node_modules/dep/index.js" }
			await load(dir, "src/user.ts", { resolved: inDependency })
			attest(
				(
					await load(dir, "src/imports.ts", {
						resolved: { dep: "src/user.ts" }
					})
				).message
			).equals(
				writeMissedByProgramMessage(
					"src/imports.ts",
					'imports "dep" as src/user.ts'
				)
			)
		})
	})

	describe("a project it can't read whole", () => {
		const refusals: [
			name: string,
			files: Record<string, string>,
			reason: string
		][] = [
			[
				"a query",
				{
					"src/queried.ts":
						'import { User } from "./user.ts?v=1"\n\nexport const reads = User.assert\n'
				},
				'src/queried.ts imports "./user.ts?v=1" with a query'
			],
			[
				"a computed import",
				{
					"src/computed.ts":
						"export const load = (name: string) => import(`./${name}.ts`)\n"
				},
				"src/computed.ts:1:39 imports a module by a computed specifier"
			],
			[
				"a file another loader compiles",
				{ "app/about/page.mdx": "# About\n" },
				"app/about/page.mdx may import what it can't see"
			],
			[
				"another loader",
				{
					"next.config.js": rules(
						'{ loaders: ["other-loader", "@ark/aot/turbopack"] }'
					)
				},
				"next.config.js runs other-loader, which may add imports it can't see"
			],
			[
				"a config it can't read without running it",
				{
					"next.config.js":
						'import wrap from "wrap"\nexport default wrap({ turbopack: {} })\n'
				},
				"next.config.js doesn't export its turbopack.rules as literals"
			],
			[
				"a cache keeping a module past a read's change",
				{
					"next.config.js":
						'export default { experimental: { turbopackFileSystemCacheForBuild: true }, turbopack: { rules: { "*.ts": { loaders: ["@ark/aot/turbopack"] } } } }\n'
				},
				"next.config.js sets turbopackFileSystemCacheForBuild, which keeps a module's output past a change to a module that reads it"
			]
		]

		for (const [name, files, reason] of refusals) {
			it(`writes each module on its own, given ${name}`, async () => {
				const dir = project(files)
				const { out, warnings } = await load(dir, "src/user.ts")
				attest(warnings).equals([writeUnreadProgramMessage(reason)])
				attest(out?.includes("node_modules/.bin/.ark")).equals(false)
			})
		}

		it("writes each module on its own, given another arktype beside the files it would write", async () => {
			const root = writeFixture({
				"node_modules/.bin/next": "",
				"apps/web/next.config.js": rules(ownRule),
				"apps/web/node_modules/next/package.json": '{ "name": "next" }',
				"apps/web/src/user.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n'
			})
			const { out, warnings } = await load(
				join(root, "apps/web"),
				"src/user.ts",
				{
					arktypeFrom: root
				}
			)
			attest(warnings).equals([
				writeUnreadProgramMessage(
					"../../node_modules/.bin resolves another arktype"
				)
			])
			attest(out?.includes("node_modules/.bin/.ark")).equals(false)
		})

		it("fails the build where prune: true says it must", async () => {
			const dir = project({ "app/about/page.mdx": "# About\n" })
			attest(
				(await load(dir, "src/user.ts", { opts: { prune: true } })).message
			).equals(
				writeUnreadProgramMessage(
					"app/about/page.mdx may import what it can't see"
				)
			)
		})

		it("needs no read given prune: false", async () => {
			const dir = project({ "app/about/page.mdx": "# About\n" })
			const { out, warnings } = await load(dir, "src/user.ts", {
				opts: { prune: false }
			})
			attest(warnings).equals([])
			attest(out?.includes("node_modules/.bin/.ark")).equals(false)
		})
	})

	describe("turbopack.rules", () => {
		const problemOf = (config: string) =>
			turbopackRulesProblemOf("/app/next.config.js", config)

		it("reads each shape of the loader it knows as this one", () => {
			attest(problemOf(rules(ownRule))).equals(undefined)
			attest(problemOf(rules('["@ark/aot/turbopack"]'))).equals(undefined)
			attest(
				problemOf(
					rules('{ loaders: [{ loader: "@ark/aot/turbopack", options: {} }] }')
				)
			).equals(undefined)
			attest(
				problemOf(rules('{ loaders: [require.resolve("@ark/aot/turbopack")] }'))
			).equals(undefined)
			attest(
				problemOf(
					`const config = ${rules(ownRule).slice("export default ".length)}export default config\n`
				)
			).equals(undefined)
		})

		it("refuses what running it may change", () => {
			const unreadable =
				"next.config.js doesn't export its turbopack.rules as literals"
			attest(problemOf(rules("{ loaders: list }"))).equals(unreadable)
			attest(problemOf(rules("{ loaders: [...list] }"))).equals(unreadable)
			attest(problemOf(rules("{ loaders: [pick()] }"))).equals(unreadable)
			attest(problemOf("export default wrap({})\n")).equals(unreadable)
			attest(
				problemOf("export default { ...base, turbopack: { rules: {} } }\n")
			).equals(unreadable)
			attest(
				problemOf("export default { turbopack: { ...base, rules: {} } }\n")
			).equals(unreadable)
		})

		it("refuses two sets of the loader's options", () => {
			attest(
				problemOf(
					`export default { turbopack: { rules: { "*.ts": { loaders: [{ loader: "@ark/aot/turbopack", options: { a: 1 } }] }, "*.js": { loaders: ["@ark/aot/turbopack"] } } } }\n`
				)
			).equals("next.config.js runs the loader with 2 sets of options")
		})
	})
})
