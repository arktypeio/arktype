// run `pnpm build` first: Turbopack bundles arktype's built entries
import { writeTurbopackDependencyMessage } from "@ark/aot/internal/messages.ts"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
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

// the Turbopack config Setup shows, so the docs and this build can't drift
const config =
	/```js title="next\.config\.js"\n(export default {\n\tturbopack[\S\s]*?)^```$/m.exec(
		readFileSync(setup, "utf8")
	)?.[1]
if (!config) throw new Error(`Found no Turbopack next.config.js in ${setup}`)

const files: Record<string, string> = {
	"package.json": JSON.stringify({ private: true, type: "module" }),
	"next.config.js": config,
	"app/layout.jsx":
		"export default function Layout({ children }) {\n\treturn <html><body>{children}</body></html>\n}\n",
	"app/page.jsx":
		'import { User } from "defines-types"\nimport { failed } from "reads-errors"\n\nexport default function Page() {\n\treturn <p>{User({ name: "Ada" }).name} {String(failed(User({})))}</p>\n}\n',
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
		exports: "./index.js"
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

const build = () => {
	rmSync(join(appDir, ".next"), { recursive: true, force: true })
	const result = spawnSync(process.execPath, [next, "build"], {
		cwd: appDir,
		encoding: "utf8",
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
	})
	if (result.error) throw result.error
	return { status: result.status, output: result.stdout + result.stderr }
}

console.log("▲ Building a Next app whose dependency defines a Type...")

const refused = build()
const message = writeTurbopackDependencyMessage("defines-types")
if (refused.status === 0 || !refused.output.includes(message)) {
	throw new Error(
		`Turbopack should fail the build with:\n${message}\nIt exited ${refused.status}:\n${refused.output}`
	)
}

console.log("▲ Building it again with the dependency precompiled...")

writeFileSync(
	join(appDir, "ark.json"),
	JSON.stringify({ precompile: { dependencies: { "defines-types": "aot" } } })
)
const precompiled = build()
const page = join(appDir, ".next/server/app/index.html")
if (precompiled.status !== 0 || !existsSync(page)) {
	throw new Error(
		`Turbopack should build the app. It exited ${precompiled.status}:\n${precompiled.output}`
	)
}
// prerendered, so the precompiled Type ran in the build
if (!readFileSync(page, "utf8").includes("Ada<!-- --> <!-- -->true")) {
	throw new Error(
		`The prerendered page doesn't show the Type's results: ${page}`
	)
}

rmSync(appDir, { recursive: true, force: true })

console.log(
	"✅ Turbopack fails a dependency that defines a Type and precompiles one set to aot"
)
