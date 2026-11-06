import type { PrecompilePluginOptions } from "@ark/aot/unplugin"
import { fromHere } from "@ark/fs"
import { spawnSync } from "node:child_process"
import {
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { basename, dirname, join, relative } from "node:path"

// what the fuzzers build on Next, which resolves arktype's built output from
// beside its own install, as testNext's app does
const repo = fromHere("..", "..", "..")
const appsDir = join(repo, "ark/repo/temp/next-fuzz")
const next = createRequire(join(repo, "ark/repo/package.json")).resolve(
	"next/dist/bin/next"
)

const setup = readFileSync(
	join(repo, "ark/docs/content/docs/precompile/setup.mdx"),
	"utf8"
)
const config = /```js title="next\.config\.js"\n([\S\s]*?)^```$/m.exec(
	setup
)?.[1]
if (!config) throw new Error("Found no next.config.js in Setup")
const cacheOff = "turbopackFileSystemCacheForBuild: false"
if (!config.includes(cacheOff)) throw new Error(`Found no ${cacheOff} in Setup`)
const withCache = config.replace(
	cacheOff,
	"turbopackFileSystemCacheForBuild: true"
)

export interface NextBuilt {
	refused: string | undefined
	warnings: string[]
	// each entry's built route, which its first request loads
	routes: Record<string, string>
	// a module for each that loads it, to run in a process of its own
	runners: Record<string, string>
	// the chunks of the server that hold it
	js: string
}

export const nextApp = (tag: string): string => join(appsDir, tag)

export const removeNextApps = (): void => {
	rmSync(appsDir, { recursive: true, force: true })
	rmSync(join(repo, "ark/repo/node_modules/.bin/.ark"), {
		recursive: true,
		force: true
	})
}

// a build's own message, past what it says it failed building, or the end of
// what it wrote where it stopped otherwise, as for a crash
const messageOf = (output: string): string => {
	const at = output.indexOf("> Build error occurred")
	const failed = at === -1 ? output.slice(-4000) : output.slice(at)
	return (
		failed
			.split("\n")
			.find(line =>
				/^Error: (?!Turbopack build failed|Error evaluating|Issue while)/.test(
					line
				)
			) ?? failed
	)
}

const warningsOf = (output: string) =>
	[
		...output.matchAll(/^Error: (prune: .*|The @ark\/aot\/turbopack .*)$/gm)
	].map(match => match[1])

const jsIn = (dir: string): string =>
	readdirSync(dir, { recursive: true, encoding: "utf8" })
		.filter(file => file.endsWith(".js"))
		.sort()
		.map(file => readFileSync(join(dir, file), "utf8"))
		.join("\n")

export interface NextBuildOptions {
	// on what the app's last build left in .next and the precompiler's cache, as
	// a project's next build is
	warm?: boolean
	// with Turbopack's build cache on, as Next has it unless set off
	cache?: boolean
}

export const buildOnNext = (
	sources: string,
	tag: string,
	entries: string[],
	// undefined for no loader, as arktype alone builds it
	options: PrecompilePluginOptions | undefined,
	{ warm, cache }: NextBuildOptions = {}
): NextBuilt => {
	const dir = nextApp(tag)
	if (warm && existsSync(dir)) {
		for (const name of readdirSync(dir)) {
			if (name !== ".next" && name !== "node_modules")
				rmSync(join(dir, name), { recursive: true, force: true })
		}
		for (const name of readdirSync(join(dir, "node_modules"))) {
			if (name !== ".cache") {
				rmSync(join(dir, "node_modules", name), {
					recursive: true,
					force: true
				})
			}
		}
	} else rmSync(dir, { recursive: true, force: true })
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	cpSync(sources, dir, {
		recursive: true,
		dereference: true,
		filter: source =>
			// resolved instead from beside Next's install, as it isn't within its root
			!(lstatSync(source).isSymbolicLink() && basename(source) === "arktype") &&
			// which has Next install what it needs for TypeScript in the app
			!/^out-|^tsconfig\.json$/.test(relative(sources, source))
	})
	writeFileSync(
		join(dir, "next.config.mjs"),
		options ?
			(cache ? withCache : config)
				.split('"@ark/aot/turbopack"')
				.join(JSON.stringify({ loader: "@ark/aot/turbopack", options }))
				.replace(
					"turbopack: {",
					`typescript: { ignoreBuildErrors: true },\n\tturbopack: {\n\t\troot: ${JSON.stringify(repo)},`
				)
		:	`export default { bundlePagesRouterDependencies: true, typescript: { ignoreBuildErrors: true }, turbopack: { root: ${JSON.stringify(repo)} } }\n`
	)
	for (const entry of entries) {
		// not TypeScript, for the same reason
		const route = join(dir, `app/api/${entry}/route.js`)
		mkdirSync(dirname(route), { recursive: true })
		writeFileSync(
			route,
			`export * from "../../../${entry}.ts"\nexport const dynamic = "force-dynamic"\nexport const GET = () => Response.json(0)\n`
		)
	}
	const env: NodeJS.ProcessEnv = {
		...process.env,
		NEXT_TELEMETRY_DISABLED: "1",
		NODE_ENV: "production"
	}
	delete env.NODE_OPTIONS
	const { status, stdout, stderr, error } = spawnSync(
		process.execPath,
		[next, "build"],
		{ cwd: dir, encoding: "utf8", env, timeout: 600_000 }
	)
	if (error) throw error
	const output = stdout + stderr
	const warnings = warningsOf(output)
	if (status !== 0) {
		return {
			refused: messageOf(output),
			warnings,
			routes: {},
			runners: {},
			js: ""
		}
	}
	const routes: Record<string, string> = {}
	const runners: Record<string, string> = {}
	for (const entry of entries) {
		routes[entry] = join(dir, `.next/server/app/api/${entry}/route.js`)
		runners[entry] = join(dir, `${entry}-run.cjs`)
		writeFileSync(
			runners[entry],
			`process.env.NODE_ENV = "production"
const { routeModule } = require(${JSON.stringify(routes[entry])})
// Next loads what a route imports at its first request
routeModule.ensureUserland()
`
		)
	}
	return {
		refused: undefined,
		warnings,
		routes,
		runners,
		js: jsIn(join(dir, ".next/server"))
	}
}
