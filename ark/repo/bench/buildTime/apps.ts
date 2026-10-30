import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const saas = join(import.meta.dirname, "..", "apps", "saas", "arktype")

const saasModules = [
	"common",
	"accounts",
	"projects",
	"issues",
	"billing",
	"events",
	"ops"
]

export const sizes = {
	small: { domains: 1, modules: ["common", "projects"] },
	medium: { domains: 2, modules: saasModules },
	large: { domains: 22, modules: saasModules }
}

export type Size = keyof typeof sizes

export interface App {
	types: number
	domains: number
	files: Record<string, string>
}

const definition = /^(?:export )?const (\w+) =/gm
const exported = /^export const (\w+) =/gm

// each domain's upper bounds are offset by its index, so no two share a Type
const offsetBounds = (source: string, offset: number) =>
	offset === 0 ? source : (
		source.replace(/(<=\s*)(\d+)/g, (_, op, n) => `${op}${Number(n) + offset}`)
	)

/** copies of the saas app's schemas, each Type validating a request in a handler */
export const appOf = (size: Size, root: string): App => {
	const { domains, modules } = sizes[size]
	const files: Record<string, string> = {}
	const names: string[] = []
	let types = 0
	for (let i = 0; i < domains; i++) {
		const dir = `src/domains/d${i}`
		const exportsOf: Record<string, string[]> = {}
		for (const name of modules) {
			let source = offsetBounds(
				readFileSync(join(saas, `${name}.ts`), "utf8"),
				i
			)
			types += [...source.matchAll(definition)].length
			exportsOf[name] = [...source.matchAll(exported)].map(m => m[1])
			// what an edit bumps, so the page can tell when it shows one
			if (name === "common" && i === 0)
				source += "\nexport const revision = 0\n"
			files[`${dir}/${name}.ts`] = source
		}
		files[`${dir}/format.ts`] = formatModule
		files[`${dir}/handlers.ts`] = handlersOf(modules, exportsOf)
		names.push(`d${i}`)
	}
	files["src/main.ts"] = mainOf(names)
	files["src/entry.ts"] = entryModule
	files["index.html"] = indexHtml
	files["vite.config.ts"] = viteConfig
	files["next.config.ts"] = nextConfigOf(root)
	files["app/layout.tsx"] = layoutModule
	files["app/page.tsx"] = pageModule
	files["esbuild.ts"] = esbuildModule
	files["tsconfig.json"] = tsconfig
	return { types, domains, files }
}

export const writeApp = (app: App, dir: string) => {
	rmSync(dir, { recursive: true, force: true })
	for (const [path, contents] of Object.entries(app.files)) {
		mkdirSync(dirname(join(dir, path)), { recursive: true })
		writeFileSync(join(dir, path), contents)
	}
}

/** the module every Type in the first domain imports, as an edit changes it */
export const editedCommon = (original: string, revision: number) =>
	original
		.replace("export const revision = 0", `export const revision = ${revision}`)
		.replace(
			'perPage: "1 <= number.integer <= 100 = 20"',
			`perPage: "1 <= number.integer <= ${100 + revision} = 20"`
		)

const handlersOf = (modules: string[], exportsOf: Record<string, string[]>) => {
	let source = `import { type } from "arktype"\nimport { respond } from "./format.ts"\n`
	for (const name of modules)
		source += `import { ${exportsOf[name].join(", ")} } from "./${name}.ts"\n`
	for (const name of modules) {
		for (const validator of exportsOf[name]) {
			source += `
export const check${validator} = (body: unknown) => {
	const out = ${validator}(body)
	return out instanceof type.errors ?
			respond({ issues: out.issues }, 400)
		:	respond({ data: out })
}
`
		}
	}
	return source
}

// no arktype here: a module the plugin has nothing to do for
const formatModule = `export const respond = <t>(result: t, status = 200) => ({
	status,
	headers: { "content-type": "application/json" },
	body: result
})

export const describeIssues = (issues: readonly { message: string }[]) =>
	issues.map((issue, i) => \`\${i + 1}. \${issue.message}\`).join("\\n")
`

const mainOf = (
	names: string[]
) => `${names.map(d => `import * as ${d} from "./domains/${d}/handlers.ts"`).join("\n")}
export { revision } from "./domains/d0/common.ts"

export const handlers = { ${names.join(", ")} }

// calls every handler once, as a request would
export const run = (): number => {
	let count = 0
	for (const domain of Object.values(handlers))
		for (const check of Object.values(domain) as ((body: unknown) => unknown)[]) {
			check({})
			count++
		}
	return count
}
`

// __onRevision is the benchmark's hook, told once every handler has run
const entryModule = `import { revision, run } from "./main.ts"

const count = run()
if (typeof document !== "undefined") {
	document.getElementById("rev")!.textContent = String(revision)
	;(globalThis as any).__ready = count
	;(globalThis as any).__onRevision?.(revision)
}
`

const indexHtml = `<!doctype html>
<html>
	<body>
		<div id="rev"></div>
		<script type="module" src="/src/entry.ts"></script>
	</body>
</html>
`

// PRECOMPILE is set to build with the plugin, and the plugin is imported only then
const viteConfig = `import { defineConfig } from "vite"

const plugins =
	process.env.PRECOMPILE ?
		[(await import("@ark/aot/unplugin")).precompile.vite()]
	:	[]

export default defineConfig({ plugins, logLevel: "warn", clearScreen: false })
`

const nextConfigOf = (root: string) => `const root = ${JSON.stringify(root)}

export default {
	typescript: { ignoreBuildErrors: true },
	devIndicators: false,
	turbopack:
		process.env.PRECOMPILE ?
			{
				root,
				rules: {
					"*.ts": { loaders: ["@ark/aot/turbopack"] },
					"*.tsx": { loaders: ["@ark/aot/turbopack"] }
				},
				resolveAlias: {
					arktype: "arktype/runtime",
					"arktype/codecs": "arktype/runtime",
					"arktype/config": "arktype/runtime",
					"arktype/errors": "arktype/runtime",
					"arktype/mutatesInput": "arktype/runtime"
				}
			}
		:	{ root }
}
`

const layoutModule = `export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html>
			<body>{children}</body>
		</html>
	)
}
`

const pageModule = `"use client"
import { useEffect } from "react"
import { revision, run } from "../src/main.ts"

export default function Page() {
	useEffect(() => {
		;(globalThis as any).__ready = run()
		;(globalThis as any).__onRevision?.(revision)
	}, [revision])
	return <div id="rev">{revision}</div>
}
`

// --context exports the options for rebuilds.ts rather than building once
const esbuildModule = `import { build, context } from "esbuild"

const plugins =
	process.env.PRECOMPILE ?
		[(await import("@ark/aot/unplugin")).precompile.esbuild()]
	:	[]

export const options = {
	entryPoints: ["src/entry.ts"],
	bundle: true,
	minify: true,
	format: "esm",
	conditions: ["production"],
	outfile: "dist-esbuild/entry.js",
	logLevel: "warning",
	plugins
} as const

if (process.argv[2] !== "--context") await build(options)
export { context }
`

const tsconfig = `${JSON.stringify(
	{
		compilerOptions: {
			target: "ES2022",
			module: "esnext",
			moduleResolution: "bundler",
			jsx: "react-jsx",
			strict: true,
			allowImportingTsExtensions: true,
			noEmit: true,
			skipLibCheck: true,
			isolatedModules: true,
			lib: ["dom", "esnext"]
		},
		include: ["src", "app"]
	},
	null,
	"\t"
)}\n`
