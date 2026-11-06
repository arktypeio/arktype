// run `pnpm build` first: Turbopack bundles arktype's built entries
import {
	withAllowUnsafe,
	writeExternalizedMessage,
	writeMissedByProgramMessage,
	writeNextExternalMessage,
	writeTurbopackDependencyMessage
} from "@ark/aot/internal/messages.ts"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const setup = fileURLToPath(
	new URL("../docs/content/docs/precompile/setup.mdx", import.meta.url)
)
// outside node_modules, where the loader would take the app for a dependency
const appDir = fileURLToPath(new URL("./temp/next/", import.meta.url))

// the configs Setup shows, so the docs and these builds can't drift
const configs = [
	...readFileSync(setup, "utf8").matchAll(
		/```js title="next\.config\.js"\n([\S\s]*?)^```$/gm
	)
].map(match => match[1])
const configNamed = (key: string) => {
	const config = configs.find(config => config.includes(`\t${key}:`))
	if (!config) throw new Error(`Found no ${key} next.config.js in ${setup}`)
	return config
}
const turbopack = configNamed("turbopack")
const webpack = configNamed("webpack")

const bundlesDependencies =
	"\t// for the pages router\n\tbundlePagesRouterDependencies: true,\n"
const withoutBundling = (config: string) => {
	if (!config.includes(bundlesDependencies))
		throw new Error(`Found no bundlePagesRouterDependencies in:\n${config}`)
	return config.replace(bundlesDependencies, "")
}

const files: Record<string, string> = {
	// next, which has the webpack plugin name Next's settings
	"package.json": JSON.stringify({
		private: true,
		type: "module",
		dependencies: { next: "*" }
	}),
	"next.config.js": turbopack,
	"app/layout.jsx":
		"export default function Layout({ children }) {\n\treturn <html><body>{children}</body></html>\n}\n",
	"app/page.jsx":
		'import { User } from "defines-types"\nimport { failed } from "reads-errors"\nimport { Reads } from "./reads.jsx"\n\nexport default function Page() {\n\treturn <p>{User({ name: "Ada" }).name} {String(failed(User({})))} <Reads /></p>\n}\n',
	// a client component, whose module Next's generated code imports, and only
	// its own compiler's reads may keep a member
	"app/reads.jsx":
		'"use client"\nimport { Age } from "../src/age.ts"\n\nexport const Reads = () => typeof Age.assert\n',
	// as Next.js leaves on the pages router's server unless told otherwise
	"pages/legacy.jsx":
		'import { type } from "arktype"\nimport { failed } from "reads-errors"\nimport { Age } from "../src/age.ts"\n\nexport default function Legacy() {\n\tconst out = Age({ age: -1 })\n\treturn <p>own {String(out instanceof type.errors)} dependency {String(failed(out))}</p>\n}\n',
	"src/age.ts":
		'import { type } from "arktype"\n\nexport const Age = type({ age: "number >= 0" })\n',
	// a dependency that defines a Type, ESM as a dependency ships it
	"node_modules/defines-types/package.json": JSON.stringify({
		name: "defines-types",
		version: "1.0.0",
		type: "module",
		exports: "./index.mjs"
	}),
	"node_modules/defines-types/index.mjs":
		'import { type } from "arktype"\nexport const User = type({ name: "string" })\n',
	// as @hono/arktype-validator, which reads only `type.errors`
	"node_modules/reads-errors/package.json": JSON.stringify({
		name: "reads-errors",
		version: "1.0.0",
		type: "module",
		exports: "./index.js",
		peerDependencies: { arktype: "*" }
	}),
	"node_modules/reads-errors/index.js":
		'import { type } from "arktype"\nexport const failed = out => out instanceof type.errors\n'
}

rmSync(appDir, { recursive: true, force: true })
for (const [path, contents] of Object.entries(files)) {
	mkdirSync(dirname(join(appDir, path)), { recursive: true })
	writeFileSync(join(appDir, path), contents)
}

const next = createRequire(import.meta.url).resolve("next/dist/bin/next")

// a flag building from what the last build left in .next, Turbopack's build
// cache included, as a project's next build does
const warm = "warm"

const nextBuild = (config: string, ...flags: string[]) => {
	writeFileSync(join(appDir, "next.config.js"), config)
	if (!flags.includes(warm))
		rmSync(join(appDir, ".next"), { recursive: true, force: true })
	const result = spawnSync(
		process.execPath,
		[next, "build", ...flags.filter(flag => flag !== warm)],
		{
			cwd: appDir,
			encoding: "utf8",
			env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
		}
	)
	if (result.error) throw result.error
	return { status: result.status, output: result.stdout + result.stderr }
}

const build = (config: string, ...flags: string[]) => {
	rmSync(join(appDir, "node_modules/.cache"), { recursive: true, force: true })
	return nextBuild(config, ...flags)
}

const unwrittenMessage =
	"can't be precompiled in a module another plugin writes"

const assertFailsWith = (
	message: string,
	{ status, output }: ReturnType<typeof build>
) => {
	if (status === 0 || !output.includes(message)) {
		throw new Error(
			`The build should fail with:\n${message}\nIt exited ${status}:\n${output}`
		)
	}
}

// prerendered, so the precompiled Type ran in the build
const assertRendered = (
	bundler: string,
	{ status, output }: ReturnType<typeof build>
) => {
	const app = join(appDir, ".next/server/app/index.html")
	const pages = join(appDir, ".next/server/pages/legacy.html")
	if (status !== 0 || !existsSync(app) || !existsSync(pages)) {
		throw new Error(
			`${bundler} should build the app. It exited ${status}:\n${output}`
		)
	}
	if (
		!readFileSync(app, "utf8").includes(
			"Ada<!-- --> <!-- -->true<!-- --> <!-- -->function"
		)
	) {
		throw new Error(
			`The prerendered page doesn't show the Type's results: ${app}`
		)
	}
	if (
		!readFileSync(pages, "utf8").includes(
			"own <!-- -->true<!-- --> dependency <!-- -->true"
		)
	) {
		throw new Error(
			`The pages router's server doesn't take a validator's errors for type.errors: ${pages}`
		)
	}
}

console.log("▲ Building a Next app whose dependency defines a Type...")

assertFailsWith(
	writeTurbopackDependencyMessage("defines-types"),
	build(turbopack)
)

console.log("▲ Building it again with the dependency precompiled...")

writeFileSync(
	join(appDir, "ark.json"),
	JSON.stringify({ precompile: { dependencies: { "defines-types": "aot" } } })
)
assertRendered("Turbopack", build(turbopack))

// a member no read of the app's needs, which only a whole-program read can drop
const emittedWith = (text: string, dir: string): string[] =>
	readdirSync(dir, { recursive: true, encoding: "utf8" }).filter(file => {
		const path = join(dir, file)
		return (
			file.endsWith(".js") &&
			statSync(path).isFile() &&
			readFileSync(path, "utf8").includes(text)
		)
	})

const assertPruned = (bundler: string) => {
	for (const compiler of ["server", "static"]) {
		const whole = emittedWith("~standard", join(appDir, ".next", compiler))
		if (whole.length) {
			throw new Error(
				`${bundler}'s ${compiler} build should prune what no module reads, but kept ~standard in ${whole.join(", ")}`
			)
		}
	}
}

assertPruned("Turbopack")

// what a build's chunks hold, whose names are hashes of it
const chunksOf = () =>
	["server/chunks", "static/chunks"].flatMap(dir =>
		readdirSync(join(appDir, ".next", dir), {
			recursive: true,
			encoding: "utf8"
		})
			.filter(file => file.endsWith(".js"))
			.sort()
			.map(file => [
				file,
				readFileSync(join(appDir, ".next", dir, file), "utf8")
			])
	)

console.log("▲ Building it again from what the last build stored...")

const cold = JSON.stringify(chunksOf())
assertRendered("Turbopack", nextBuild(turbopack))
if (JSON.stringify(chunksOf()) !== cold)
	throw new Error("Turbopack's warm build should write what its cold build did")

console.log(
	"▲ Building it on Turbopack's build cache with a module newly reading a member..."
)

const readsPath = join(appDir, "app/reads.jsx")
const reads = readFileSync(readsPath, "utf8")
writeFileSync(
	readsPath,
	reads.replace("typeof Age.assert", 'typeof Age["~standard"].validate')
)
assertRendered("Turbopack", nextBuild(turbopack, warm))
if (!emittedWith("~standard", join(appDir, ".next/static")).length) {
	throw new Error(
		"Turbopack's build should keep what a module edited since the last build reads"
	)
}
const edited = JSON.stringify(chunksOf())
assertRendered("Turbopack", nextBuild(turbopack))
if (JSON.stringify(chunksOf()) !== edited) {
	throw new Error(
		"Turbopack's build on its cache should write what a build without it does"
	)
}
writeFileSync(readsPath, reads)

// the settings ark.json holds otherwise, as the loader's options, so ark.json
// can be created and removed
const settingsPath = join(appDir, "ark.json")
const settings = readFileSync(settingsPath, "utf8")
const withLoaderSettings = (config: string) =>
	config
		.split('loaders: ["@ark/aot/turbopack"]')
		.join(
			`loaders: [${JSON.stringify({ loader: "@ark/aot/turbopack", options: JSON.parse(settings).precompile })}]`
		)
const wrapped = "export default withPrecompile({"
if (!turbopack.includes(wrapped))
	throw new Error(`Found no ${wrapped} in ${setup}`)
const errorsNone = '{ "precompile": { "errors": "none" } }'
// the read, and each module on its own where next.config exports its config
// bare, each kept past a build until a file it depends on changes, ark.json
// among them, whether or not it was there
for (const [how, config] of [
	["read", turbopack],
	[
		"bare",
		turbopack
			.replace('import { withPrecompile } from "@ark/aot/turbopack"\n\n', "")
			.replace(wrapped, "export default {")
			.replace(/}\)\n$/, "}\n")
	]
]) {
	console.log(
		`▲ Building it on Turbopack's build cache as ark.json changes (${how})...`
	)
	const cached = withLoaderSettings(config)
	rmSync(settingsPath)
	assertRendered("Turbopack", build(cached))
	const unset = JSON.stringify(chunksOf())
	writeFileSync(settingsPath, errorsNone)
	assertRendered("Turbopack", nextBuild(cached, warm))
	const warmNone = JSON.stringify(chunksOf())
	assertRendered("Turbopack", build(cached))
	if (JSON.stringify(chunksOf()) !== warmNone) {
		throw new Error(
			`Turbopack's build on its cache should write what a build without it does once ark.json is written (${how})`
		)
	}
	rmSync(settingsPath)
	assertRendered("Turbopack", nextBuild(cached, warm))
	if (JSON.stringify(chunksOf()) !== unset) {
		throw new Error(
			`Turbopack's build on its cache should write what a build without it does once ark.json is removed (${how})`
		)
	}
	writeFileSync(settingsPath, settings)
}

console.log("▲ Building a route importing a module from beyond the project...")

const sharedDir = join(appDir, "../next-shared")
mkdirSync(sharedDir, { recursive: true })
writeFileSync(
	join(sharedDir, "shared.ts"),
	'import { type } from "arktype"\n\nexport const Shared = type({ shared: "string" })\n'
)
mkdirSync(join(appDir, "app/shared"))
writeFileSync(
	join(appDir, "app/shared/page.jsx"),
	'import { Shared } from "../../../next-shared/shared.ts"\n\nexport default function Page() {\n\treturn <p>{String(Shared.allows({ shared: "yes" }))}</p>\n}\n'
)
const beyond = build(turbopack)
if (
	beyond.status !== 0 ||
	!readFileSync(join(appDir, ".next/server/app/shared.html"), "utf8").includes(
		"<p>true</p>"
	)
) {
	throw new Error(
		`Turbopack should read a module from beyond the project. It exited ${beyond.status}:\n${beyond.output}`
	)
}
rmSync(join(appDir, "app/shared"), { recursive: true })
rmSync(sharedDir, { recursive: true })

console.log(
	"▲ Building a module whose import resolves apart in each of its layers..."
)

writeFileSync(
	join(appDir, "package.json"),
	JSON.stringify({
		...JSON.parse(files["package.json"]),
		imports: {
			"#layered": {
				"react-server": "./src/server.ts",
				default: "./src/client.ts"
			}
		}
	})
)
writeFileSync(
	join(appDir, "src/server.ts"),
	'import { type } from "arktype"\n\nexport const Layered = type("string")\n'
)
writeFileSync(
	join(appDir, "src/client.ts"),
	'import { type } from "arktype"\n\nexport const Layered = type("number")\n'
)
writeFileSync(
	join(appDir, "src/layered.ts"),
	'import { Layered } from "#layered"\n\nexport const layered = () => typeof Layered["~standard"]\n'
)
writeFileSync(
	join(appDir, "app/layered.jsx"),
	'"use client"\nimport { layered } from "../src/layered.ts"\n\nexport const Client = () => <b>{layered()}</b>\n'
)
mkdirSync(join(appDir, "app/layered"))
writeFileSync(
	join(appDir, "app/layered/page.jsx"),
	'import { layered } from "../../src/layered.ts"\nimport { Client } from "../layered.jsx"\n\nexport default function Page() {\n\treturn <p>{layered()}<Client /></p>\n}\n'
)
assertFailsWith(
	writeMissedByProgramMessage(
		"src/layered.ts",
		'imports "#layered" as src/server.ts'
	),
	build(turbopack)
)
writeFileSync(join(appDir, "package.json"), files["package.json"])
for (const file of [
	"src/server.ts",
	"src/client.ts",
	"src/layered.ts",
	"app/layered.jsx"
])
	rmSync(join(appDir, file))
rmSync(join(appDir, "app/layered"), { recursive: true })

console.log(
	"▲ Building it with Next leaving the pages router's dependencies external..."
)

assertFailsWith(
	withAllowUnsafe(writeNextExternalMessage("arktype")),
	build(withoutBundling(turbopack))
)

console.log(
	"▲ Building it with serverExternalPackages naming a package on arktype..."
)

assertFailsWith(
	withAllowUnsafe(
		writeExternalizedMessage("reads-errors", "serverExternalPackages")
	),
	build(
		turbopack.replace(
			"withPrecompile({",
			'withPrecompile({\n\tserverExternalPackages: ["reads-errors"],'
		)
	)
)

console.log("▲ Building it with webpack...")

assertRendered("webpack", build(webpack, "--webpack"))

assertPruned("webpack")

console.log(
	"▲ Building it with webpack, Next leaving the pages router's dependencies external..."
)

assertFailsWith(
	withAllowUnsafe(writeNextExternalMessage("reads-errors")),
	build(withoutBundling(webpack), "--webpack")
)

console.log("▲ Building a route that imports a module twice by query...")

writeFileSync(
	join(appDir, "src/queried.ts"),
	'import { type } from "arktype"\n\nlet seen = 0\nexport const V = type("string").narrow(() => ++seen > 0)\nexport const seenOf = () => seen\n'
)
mkdirSync(join(appDir, "app/queried"))
writeFileSync(
	join(appDir, "app/queried/page.jsx"),
	'import { V as A, seenOf as seenA } from "../../src/queried.ts?v=1"\nimport { V as B, seenOf as seenB } from "../../src/queried.ts?v=2"\n\nexport default function Page() {\n\treturn <p>{`${A("a")} ${seenA()} ${seenB()} ${B("b")}`}</p>\n}\n'
)

assertFailsWith(unwrittenMessage, build(webpack, "--webpack"))

// Turbopack's loader writes each module on its own, so each keeps its own run
const queried = build(turbopack)
const queriedPage = join(appDir, ".next/server/app/queried.html")
if (
	queried.status !== 0 ||
	!readFileSync(queriedPage, "utf8").includes("<p>a 1 0 b</p>")
) {
	throw new Error(
		`Turbopack should keep a module's queries apart. It exited ${queried.status}:\n${queried.output}`
	)
}

rmSync(appDir, { recursive: true, force: true })
rmSync(fileURLToPath(new URL("./node_modules/.bin/.ark", import.meta.url)), {
	recursive: true,
	force: true
})

console.log(
	"✅ Next fails a dependency that defines a Type and precompiles one set to aot, and either bundler fails where Next leaves arktype external on the server"
)
