import { attest, contextualize } from "@ark/attest"
import {
	writeMissedByProgramMessage,
	writeUnreadProgramMessage
} from "@ark/aot/internal/messages.ts"
import { writeKeptMembersMessage } from "@ark/aot/internal/scan.ts"
import {
	nextConfigReadOf,
	readProjectWith,
	type NextConfigLike
} from "@ark/aot/internal/nextProgram.ts"
import type { PrecompilePluginOptions } from "@ark/aot/unplugin"
import turbopack, { type TurbopackLoaderContext } from "@ark/aot/turbopack"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join, relative, resolve as resolvePath } from "node:path"
import { tempPath, writeFixture } from "./utils.ts"

const conditions = ["ark-ts"]

const project = (files: Record<string, string> = {}, root?: string) =>
	writeFixture(
		{
			"node_modules/next/package.json": '{ "name": "next" }',
			"src/user.ts":
				'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
			"app/page.ts":
				'import { User } from "../src/user.ts"\n\nexport const GET = (data: unknown) => Response.json(User.allows(data))\n',
			...files
		},
		root
	)

// Turbopack's own resolver, where a module's layer may answer otherwise
type Resolved = Record<string, string | undefined>

interface Loaded {
	out: string | undefined
	message: string | undefined
	warnings: string[]
}

// as next.config's wrapper reads the project, then Turbopack loads a module
const load = async (
	dir: string,
	file: string,
	{
		opts = {},
		source = readFileSync(join(dir, file), "utf8"),
		resolved = {},
		read = {},
		sameBuild = false
	}: {
		opts?: PrecompilePluginOptions
		source?: string
		resolved?: Resolved
		// next.config, as its wrapper reads it before Turbopack starts, or false
		// for one exporting its config bare
		read?: NextConfigLike | false
		// a module of the build the last load read for, so not read again
		sameBuild?: boolean
	} = {}
): Promise<Loaded> => {
	const warnings: string[] = []
	const given = { conditions, cwd: dir, ...opts }
	// each loader process of a build finds the read before it
	if (!sameBuild && read) {
		const { refused, warnings: found } = await readProjectWith(dir, read, given)
		warnings.push(...(refused ? [refused] : found))
	} else if (!sameBuild) delete process.env.ARK_NEXT_READ
	return new Promise<Loaded>(settle => {
		const context: TurbopackLoaderContext = {
			mode: "production",
			rootContext: dir,
			resourcePath: join(dir, file),
			getOptions: () => given,
			addDependency: () => {},
			emitWarning: warning => warnings.push(warning.message),
			getResolve: () => async (context, request) => {
				if (request in resolved) {
					const answer = resolved[request]
					if (answer === undefined) throw new Error(`Can't resolve ${request}`)
					return join(dir, answer)
				}
				if (request.startsWith(".")) return resolvePath(context, request)
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
}

const runtimeFile = join(import.meta.dirname, "../../type/runtime.ts")

const unitsDirIn = (dir: string) => {
	const ark = join(dir, "node_modules/.cache/ark-units")
	return join(ark, readdirSync(ark)[0])
}

// each unit it wrote, as one text
const writtenIn = (dir: string) =>
	readdirSync(unitsDirIn(dir))
		.map(name => readFileSync(join(unitsDirIn(dir), name), "utf8"))
		.join("\n")

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

		it("keeps each validator's methods, so a read it can't see warns in development", async () => {
			// where arktype resolves, as it does from an app's units
			const dir = project(
				{
					// a read of its `~standard`, which bakes no jsonSchema into it
					"app/standard.ts":
						'import { User } from "../src/user.ts"\n\nexport const POST = (data: unknown) => User["~standard"].validate(data)\n'
				},
				tempPath("nextProgram", "methods")
			)
			const { out } = await load(dir, "src/user.ts")
			writeFileSync(join(dir, "src/written.mjs"), out!)
			const reads = [
				"User.expression",
				"User.description",
				"User.json",
				"User.toJsonSchema",
				'User["~standard"].jsonSchema',
				"String(User)",
				"JSON.stringify({ User })"
			]
			const logged = (...conditions: string[]) =>
				spawnSync(
					process.execPath,
					[
						...["ark-ts", ...conditions].flatMap(condition => [
							"--conditions",
							condition
						]),
						"--input-type=module",
						"-e",
						`import { User } from "./src/written.mjs"
for (const read of [${reads.map(read => `() => ${read}`).join(", ")}]) {
	try {
		console.log(read())
	} catch (e) {
		console.log(e.message)
	}
}`
					],
					{ cwd: dir, encoding: "utf8" }
				)
			// a member no build baked reads undefined, and a function with no
			// toJSON is left out of what holds it
			const production = logged()
			attest(production.stdout).snap(`undefined
undefined
undefined
undefined
undefined
Type
{}
`)
			// in development each warns as it's read, and reads what it does in production
			const development = logged("development")
			attest(development.stdout).equals(production.stdout)
			attest(development.stderr.match(/^Error: .*$/gm)).snap([
				'Error: expression isn\'t precompiled: set members["expression"] true in the precompile options',
				'Error: description isn\'t precompiled: set members["description"] true in the precompile options',
				'Error: json isn\'t precompiled: set members["json"] true in the precompile options',
				'Error: toJsonSchema isn\'t precompiled: set members["toJsonSchema"] true in the precompile options',
				'Error: ~standard.jsonSchema isn\'t precompiled: set members["~standard.jsonSchema"] true in the precompile options',
				'Error: toJSON isn\'t precompiled: set members["toJSON"] true in the precompile options'
			])
			attest(production.stderr).equals("")
		})

		it("creates each validator as its module loads, given defers", async () => {
			const dir = project()
			await load(dir, "src/user.ts", { opts: { defers: true } })
			const written = readdirSync(unitsDirIn(dir))
				.map(name => readFileSync(join(unitsDirIn(dir), name), "utf8"))
				.join("\n")
			attest(/deferred/i.test(written)).equals(false)
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
				"withContext"
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

		it("warns of what it read once, not for each module it answers", async () => {
			const dir = project({
				"src/unused.ts":
					'import { User } from "./user.ts"\n\nexport const Unused = User\n'
			})
			attest((await load(dir, "src/user.ts")).warnings).equals([
				keptFor(
					"src/unused.ts exports Unused, which code outside the bundle may read"
				)
			])
			attest(
				(await load(dir, "src/unused.ts", { sameBuild: true })).warnings
			).equals([])
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

		it("reads a route under a directory a build at the root would write", async () => {
			const dir = project({
				"app/build/page.tsx":
					'import { User } from "../../src/user.ts"\n\nexport default () => String(User.allows(1))\n'
			})
			attest((await load(dir, "app/build/page.tsx")).message).equals(undefined)
		})

		// JavaScript naming no validator, so no loader runs on it to say what
		// the read missed
		const reading = (file: string) =>
			`import { User } from "${relative(dirname(file), "src/user.ts").replace(/\\/g, "/")}"\n\nexport const GET = () => Response.json(User["~standard"])\n`

		for (const [name, file, isRead] of [
			[
				"a route under a directory named as a build's",
				"app/docs/dist/route.js",
				true
			],
			[
				"a route under a directory named with a dot",
				"app/.well-known/probe/route.js",
				true
			],
			["a page among pages/'s tests", "pages/__tests__/probe.js", true],
			["a page named as a test", "pages/probe.test.js", true],
			["a build's output beside the root", "dist/route.js", false],
			["tests app/ leaves unrouted", "app/__tests__/route.js", false]
		] as const) {
			it(`${isRead ? "reads" : "leaves unread"} ${name}`, async () => {
				const dir = project({ [file]: reading(file) })
				await load(dir, "src/user.ts")
				attest(writtenIn(dir).includes("~standard")).equals(isRead)
			})
		}

		it("reads a route a link leads to, as Next routes it", async () => {
			// where it walks nothing else
			const dir = project({ ".shared/route.js": reading(".shared/route.js") })
			mkdirSync(join(dir, "app"), { recursive: true })
			symlinkSync(join(dir, ".shared"), join(dir, "app/shared"), "junction")
			await load(dir, "src/user.ts")
			attest(writtenIn(dir).includes("~standard")).equals(true)
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

	describe("a read Turbopack's build cache restores what it read of", () => {
		const unitsOf = (dir: string) =>
			Object.fromEntries(
				readdirSync(unitsDirIn(dir)).map(name => [
					name,
					statSync(join(unitsDirIn(dir), name)).mtimeMs
				])
			)

		it("leaves what it writes alike as it was", async () => {
			const dir = project()
			await load(dir, "src/user.ts")
			const before = unitsOf(dir)
			await load(dir, "src/user.ts")
			attest(unitsOf(dir)).equals(before)
		})

		it("removes what an earlier build wrote that this one doesn't", async () => {
			const dir = project({
				"src/address.ts":
					'import { type } from "arktype"\n\nexport const Address = type({ street: "string" })\n'
			})
			await load(dir, "src/user.ts")
			const before = Object.keys(unitsOf(dir)).length
			writeFileSync(join(dir, "src/address.ts"), "export const Address = 1\n")
			await load(dir, "src/user.ts")
			attest(Object.keys(unitsOf(dir)).length < before).equals(true)
		})

		it("writes each module on its own where next.config exports its config bare", async () => {
			const dir = project()
			const { out, warnings } = await load(dir, "src/user.ts", { read: false })
			attest(warnings).equals([
				writeUnreadProgramMessage(
					"next.config doesn't export its config through withPrecompile, which reads the project before Turbopack starts"
				)
			])
			attest(out?.includes("node_modules/.cache/ark-units")).equals(false)
			// once a build
			attest((await load(dir, "src/user.ts", { read: false })).warnings).equals(
				[]
			)
		})

		it("resolves an import as turbopack.resolveAlias says", async () => {
			const dir = project({
				"app/page.ts":
					'import { User } from "@/user.ts"\n\nexport const GET = (data: unknown) => Response.json(User.allows(data))\n'
			})
			const { warnings } = await load(dir, "src/user.ts", {
				read: { turbopack: { resolveAlias: { "@/": "./src/" } } }
			})
			attest(warnings).equals([])
		})

		it("reads an import Next serves of its own as holding no validator", async () => {
			const dir = project({
				"src/server.ts":
					'import "server-only"\nimport { User } from "./user.ts"\n\nexport const reads = User.assert\n'
			})
			attest((await load(dir, "src/user.ts")).warnings).equals([])
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
				"a Babel config",
				{ "babel.config.json": '{ "presets": ["next/babel"] }\n' },
				"babel.config.json has Next run Babel on each module after this loader, which may add reads it can't see"
			]
		]

		for (const [name, files, reason] of refusals) {
			it(`writes each module on its own, given ${name}`, async () => {
				const dir = project(files)
				const { out, warnings } = await load(dir, "src/user.ts")
				attest(warnings).equals([writeUnreadProgramMessage(reason)])
				attest(out?.includes("node_modules/.cache/ark-units")).equals(false)
				// once a build
				attest(
					(await load(dir, "src/user.ts", { sameBuild: true })).warnings
				).equals([])
			})
		}

		it("writes units under the nearest existing node_modules/.cache/ark-units when the app has no local node_modules", async () => {
			const root = writeFixture({
				"node_modules/next/package.json": '{ "name": "next" }',
				"apps/web/src/user.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
				"apps/web/app/page.ts":
					'import { User } from "../src/user.ts"\n\nexport const GET = (data: unknown) => Response.json(User.allows(data))\n'
			})
			const app = join(root, "apps/web")
			const { out, warnings } = await load(app, "src/user.ts")
			attest(warnings).equals([])
			const specifier =
				/from "((?:\.{2}\/){3}node_modules\/\.cache\/ark-units\/[^"]+)"/.exec(
					out!
				)?.[1]
			attest(specifier !== undefined).equals(true)
			attest(existsSync(join(app, "src", specifier!))).equals(true)
			attest(dirname(join(app, "src", specifier!))).equals(unitsDirIn(root))
			// warm build still uses the workspace root's node_modules even though
			// the first build created apps/web/node_modules/.cache/ark-programs
			const second = await load(app, "src/user.ts")
			attest(second.warnings).equals([])
			attest(second.out).equals(out)
		})

		it("writes units under the app's own node_modules/.cache/ark-units without needing .bin", async () => {
			const root = writeFixture({
				"apps/web/node_modules/next/package.json": '{ "name": "next" }',
				"apps/web/src/user.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n',
				"apps/web/app/page.ts":
					'import { User } from "../src/user.ts"\n\nexport const GET = (data: unknown) => Response.json(User.allows(data))\n'
			})
			const app = join(root, "apps/web")
			const { out, warnings } = await load(app, "src/user.ts")
			attest(warnings).equals([])
			const specifier =
				/from "(\.\.\/node_modules\/\.cache\/ark-units\/[^"]+)"/.exec(out!)?.[1]
			attest(specifier !== undefined).equals(true)
			attest(existsSync(join(app, "src", specifier!))).equals(true)
			attest(dirname(join(app, "src", specifier!))).equals(unitsDirIn(app))
		})

		it("writes each module on its own, given another arktype beside the files it would write", async () => {
			const root = writeFixture({
				"shared/node_modules/arktype/package.json":
					'{ "name": "arktype", "exports": { "./runtime": "./runtime.js" } }',
				"shared/node_modules/arktype/runtime.js": "",
				"shared/cache/.keep": "",
				"apps/web/node_modules/next/package.json": '{ "name": "next" }',
				"apps/web/src/user.ts":
					'import { type } from "arktype"\n\nexport const User = type({ name: "string" })\n'
			})
			const app = join(root, "apps/web")
			symlinkSync(
				join(root, "shared/cache"),
				join(app, "node_modules/.cache"),
				"junction"
			)
			const { out, warnings } = await load(app, "src/user.ts")
			attest(warnings).equals([
				writeUnreadProgramMessage(
					"node_modules/.cache/ark-units resolves another arktype"
				)
			])
			attest(out?.includes("node_modules/.cache/ark-units")).equals(false)
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
			attest(out?.includes("node_modules/.cache/ark-units")).equals(false)
		})
	})

	describe("next.config", () => {
		const own = "@ark/aot/turbopack"
		const readOf = (
			rules: Record<string, unknown>,
			config: NextConfigLike = {}
		) =>
			nextConfigReadOf(
				{ ...config, turbopack: { rules } },
				loader => loader === own
			)

		it("takes the loader's options from each shape of rule", () => {
			const options = { config: "./ark-config.ts" }
			attest(readOf({ "*.ts": { loaders: [own] } })).equals({ options: {} })
			attest(readOf({ "*.ts": [own] })).equals({ options: {} })
			attest(
				readOf({
					"*.ts": { loaders: [{ loader: own, options }] },
					"*.js": [
						{
							condition: { content: /arktype/ },
							loaders: [{ loader: own, options }]
						}
					]
				})
			).equals({ options })
		})

		it("refuses another loader, whose output's imports it can't see", () => {
			attest(readOf({ "*.ts": { loaders: ["other-loader", own] } })).equals({
				problem:
					"next.config runs other-loader, which may add imports it can't see"
			})
		})

		it("refuses an SWC plugin, which runs after it", () => {
			attest(
				readOf({}, { experimental: { swcPlugins: [["plugin", {}]] } })
			).equals({
				problem:
					"next.config runs SWC plugins after this loader, which may add reads it can't see"
			})
			attest(readOf({}, { experimental: { swcPlugins: [] } })).equals({
				options: {}
			})
		})

		it("refuses two sets of the loader's options", () => {
			attest(
				readOf({
					"*.ts": { loaders: [{ loader: own, options: { a: 1 } }] },
					"*.js": { loaders: [own] }
				})
			).equals({
				problem: "next.config runs the loader with 2 sets of options"
			})
		})

		it("refuses pages of an extension it doesn't read", () => {
			attest(readOf({}, { pageExtensions: ["tsx", "ts"] })).equals({
				options: {}
			})
			attest(readOf({}, { pageExtensions: ["tsx", "mdx"] })).equals({
				problem: "next.config sets pageExtensions, whose pages it can't read"
			})
		})
	})
})
