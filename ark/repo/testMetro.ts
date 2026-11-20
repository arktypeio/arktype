// run `pnpm build` first: the domain package is built with the CLI's output
import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { runInNewContext } from "node:vm"

// a shared ESM package of Types, built with `tsc` and `arktype-precompile
// --emit` and bundled by Metro for a React Native app, as Setup shows. Its
// bundle must match the one Metro builds from the package's source, with
// arktype and its parser, and must leave out that parser

const require = createRequire(import.meta.url)
const Metro = require("metro") as {
	runBuild: (config: object, options: object) => Promise<unknown>
}
const { getDefaultConfig, mergeConfig } = require("metro-config") as {
	getDefaultConfig: (root: string) => Promise<object>
	mergeConfig: (...configs: object[]) => object
}

const setup = fileURLToPath(
	new URL("../docs/content/docs/precompile/setup.mdx", import.meta.url)
)
const repo = fileURLToPath(new URL("../../", import.meta.url))
// outside node_modules, as a workspace's packages are
const root = fileURLToPath(new URL("./temp/metro/", import.meta.url))
const domain = join(root, "packages/domain")
const app = join(root, "app")

// the build script Setup shows for the package, so the docs and this build
// can't drift
const section = readFileSync(setup, "utf8")
	.split(/^## /m)
	.find(part => part.startsWith("React Native (Metro)"))
const buildScript = section && /"build": "([^"]+)"/.exec(section)?.[1]
if (!buildScript)
	throw new Error(`Found no build script in React Native (Metro) in ${setup}`)

const bin = {
	tsc: fileURLToPath(
		new URL("./node_modules/typescript/bin/tsc", import.meta.url)
	),
	"arktype-precompile": fileURLToPath(
		new URL("../aot/out/cli.js", import.meta.url)
	)
}

// what the app prints from each Type, and the exact text of the messages a
// helper configures and a scope's cyclic Type writes
const money = (amount: string) =>
	`import { type } from "arktype"\n\nexport const Money = type({ amount: "${amount}", currency: "'USD' | 'EUR'" })\n\nexport const Cents = type("string.numeric.parse").pipe(n => Math.round(n * 100))\n`

const files: Record<string, string> = {
	"packages/domain/package.json": JSON.stringify({
		name: "@app/domain",
		version: "1.0.0",
		type: "module",
		sideEffects: false,
		exports: { ".": { types: "./out/index.d.ts", default: "./out/index.js" } },
		scripts: { build: buildScript },
		peerDependencies: { arktype: "*" }
	}),
	"packages/domain/tsconfig.json": JSON.stringify({
		compilerOptions: {
			strict: true,
			skipLibCheck: true,
			target: "ES2022",
			module: "ESNext",
			moduleResolution: "Bundler",
			// so Metro reads the same imports from source as from what tsc emits
			rewriteRelativeImportExtensions: true,
			allowImportingTsExtensions: true,
			sourceMap: true,
			rootDir: "src",
			outDir: "out",
			types: []
		},
		include: ["src"]
	}),
	// each introspection member the app reads, as no module of the package does
	"packages/domain/ark.json": JSON.stringify({
		precompile: { members: { description: true } }
	}),
	"packages/domain/src/money.ts": money("number > 0"),
	// a cyclic scope, whose inferred type tsc can't write into a declaration
	"packages/domain/src/account.ts": `import { scope, type } from "arktype"
import { Money } from "./money.ts"

export const accounts = scope({
	account: {
		id: "string.uuid",
		email: "string.email",
		balance: Money,
		"children?": "account[]"
	},
	transfer: { from: "account", to: "account", at: "string.date.iso.parse" }
}).export()

export const Settings = type("string.json.parse").pipe(
	type({ theme: "'light' | 'dark'", "retries?": "0 <= number.integer <= 5" })
)
`,
	// a helper called with each definition's own text, as a form's fields are
	"packages/domain/src/helpers.ts": `import { type } from "arktype"

export const nonEmptyString = (field: string) =>
	type("string > 0").configure({ message: \`\${field} is required.\` })
`,
	"packages/domain/src/invoice.ts": `import { type } from "arktype"
import { nonEmptyString } from "./helpers.ts"
import { Money } from "./money.ts"

export const Invoice = type({
	"+": "delete",
	number: nonEmptyString("Number"),
	lines: type({ sku: "string", qty: "number.integer > 0", price: Money }).array().atLeastLength(1),
	status: type.enumerated("draft", "sent", "paid")
}).narrow((invoice, ctx) => invoice.status !== "paid" || invoice.lines.length > 1 || ctx.mustBe("a paid invoice with two lines"))
`,
	// what an app imports to check an error without loading arktype's own copy
	"packages/domain/src/index.ts": `export * from "./money.ts"\nexport * from "./account.ts"\nexport * from "./invoice.ts"\nexport { type } from "arktype"\n`,
	// the app is CommonJS, as React Native apps are, so its babel.config.js is
	"app/package.json": JSON.stringify({ name: "app", private: true }),
	"app/babel.config.js":
		'module.exports = { presets: ["@react-native/babel-preset"] }\n'
}

const entry = (
	from: string
) => `import { Invoice, Money, Cents, Settings, accounts, type } from "${from}"

const line = { sku: "a", qty: 1, price: { amount: 2, currency: "EUR" } }
const id = "5f0b3c1e-6a43-4d3a-8f3b-2d2f4b1b9a11"
const account = { id, email: "a@b.co", balance: { amount: 1, currency: "USD" } }
const stringify = out => JSON.stringify(out instanceof type.errors ? out.summary : out)

globalThis.__results = JSON.stringify({
	money: stringify(Money({ amount: 5, currency: "USD" })),
	moneyBad: stringify(Money({ amount: -1, currency: "GBP" })),
	moneyDescription: Money.description,
	cents: stringify(Cents("1.25")),
	settings: stringify(Settings('{"theme":"dark","retries":3}')),
	settingsBad: stringify(Settings('{"theme":"blue"}')),
	invoice: stringify(Invoice({ number: "1", lines: [line], status: "sent", extra: 1 })),
	invoiceBad: stringify(Invoice({ number: "", lines: [], status: "x" })),
	invoicePaid: stringify(Invoice({ number: "1", lines: [line], status: "paid" })),
	account: stringify(accounts.account({ ...account, children: [{ ...account, balance: { amount: 2, currency: "EUR" } }] })),
	accountBad: stringify(accounts.account({ ...account, children: [{ ...account, id: "x" }] })),
	transfer: stringify(accounts.transfer({ from: account, to: account, at: "2025-01-01T00:00:00Z" })),
	transferBad: stringify(accounts.transfer({ from: account, to: account, at: "yesterday" }))
})
`

const exited = (command: string, args: string[], cwd: string) => {
	const result = spawnSync(process.execPath, [command, ...args], {
		cwd,
		encoding: "utf8"
	})
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(" ")} exited ${result.status}:\n${result.stdout}${result.stderr}`
		)
	}
}

// the package's own build script, which a package manager runs with each
// binary on its path
const buildDomain = () => {
	for (const command of buildScript.split(" && ")) {
		const [name, ...args] = command.split(" ")
		if (!(name in bin)) throw new Error(`Unexpected ${name} in ${buildScript}`)
		exited(bin[name as keyof typeof bin], args, domain)
	}
}

const write = (path: string, contents: string) => {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), contents)
}

rmSync(root, { recursive: true, force: true })
for (const [path, contents] of Object.entries(files)) write(path, contents)
write("app/entry.js", entry("@app/domain"))
write("app/entrySource.js", entry("../packages/domain/src/index.ts"))
// as a package manager links a workspace package into the app
mkdirSync(join(app, "node_modules/@app"), { recursive: true })
symlinkSync(domain, join(app, "node_modules/@app/domain"), "junction")

console.log("▲ Building the package with its build script...")

buildDomain()

type Bundle = { code: string; results: Record<string, string> }

// one cache for each build, as a dev server's lasts across edits
const cacheRoot = join(root, "cache")

const bundle = async (
	entryFile: string,
	{ minify = false, dev = false, platform = "ios" } = {}
): Promise<Bundle> => {
	const base = await getDefaultConfig(app)
	const config = mergeConfig(base, {
		projectRoot: app,
		// arktype and the package resolve to where the workspace links them
		watchFolders: [repo],
		resolver: { nodeModulesPaths: [join(repo, "ark/repo/node_modules")] },
		transformer: {
			babelTransformerPath: require.resolve(
				"@react-native/metro-babel-transformer"
			)
		},
		reporter: { update: () => {} },
		cacheStores: ({ FileStore }: { FileStore: new (o: object) => object }) => [
			new FileStore({ root: cacheRoot })
		]
	})
	const out = join(root, `out-${entryFile}-${platform}-${minify}-${dev}.js`)
	await Metro.runBuild(config, { entry: entryFile, platform, dev, minify, out })
	const code = readFileSync(out, "utf8")
	// a bundle for Hermes has no Node globals, so it gets those it declares
	const sandbox: Record<string, unknown> = { __DEV__: dev, console }
	sandbox.globalThis = sandbox
	sandbox.global = sandbox
	runInNewContext(code, sandbox)
	return {
		code,
		results: JSON.parse(sandbox.__results as string) as Record<string, string>
	}
}

// what only arktype's parser holds, which a precompiled bundle leaves out
const parserText = "writeUnresolvableMessage"

console.log("▲ Bundling the app's source as Metro does without precompiling...")

const source = await bundle("entrySource.js")
if (!source.code.includes(parserText)) {
	throw new Error(
		`The bundle of the package's source should hold arktype's parser, which the test looks for as ${parserText}`
	)
}

const assertMatches = (name: string, built: Bundle) => {
	for (const key in source.results) {
		if (built.results[key] !== source.results[key]) {
			throw new Error(
				`${name} should match the package's source for ${key}:\n${built.results[key]}\nwas ${source.results[key]} from source`
			)
		}
	}
	if (built.code.includes(parserText))
		throw new Error(`${name} should hold none of arktype's parser`)
}

console.log("▲ Bundling the app with the package built by tsc and --emit...")

const built = await bundle("entry.js")
assertMatches("The app's bundle", built)
// messages the definitions write, as exact text
const expected: Record<string, string> = {
	moneyBad: JSON.stringify(
		'amount must be positive\ncurrency must be "EUR" or "USD"'
	),
	invoiceBad: JSON.stringify(
		'number: Number is required.\nlines must be non-empty\nstatus must be "draft", "paid" or "sent"'
	),
	invoicePaid: JSON.stringify("must be a paid invoice with two lines")
}
for (const key in expected) {
	if (built.results[key] !== expected[key]) {
		throw new Error(
			`The app should print ${expected[key]} for ${key}, but printed ${built.results[key]}`
		)
	}
}

console.log("▲ Bundling it minified, for each platform and in development...")

assertMatches("The minified bundle", await bundle("entry.js", { minify: true }))
assertMatches(
	"The Android bundle",
	await bundle("entry.js", { platform: "android" })
)
assertMatches("The development bundle", await bundle("entry.js", { dev: true }))

console.log("▲ Bundling it again after a Type it holds was edited...")

// what Metro caches by each module's own text: Invoice's file changes with
// Money's, as it holds Money's validator
write("packages/domain/src/money.ts", money("number > 1000"))
buildDomain()
const edited = await bundle("entry.js")
const invoiceEdit = JSON.parse(edited.results.invoice) as string
if (!invoiceEdit.includes("price.amount must be more than 1000")) {
	throw new Error(
		`Money's edit should reach Invoice in Metro's next bundle, but it printed ${edited.results.invoice}`
	)
}

rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })

console.log(
	"✅ Metro bundles a package built by tsc and --emit as it bundles its source, without arktype's parser, and bundles an edit to a Type its other Types hold"
)
