// run `pnpm build` first: Turbopack bundles arktype's built entries
import { spawn, spawnSync, type ChildProcess } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { createServer } from "node:net"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// `next dev` on a workspace package that defines Types, whose source Next
// transpiles: what the dev server serves as the package's modules change,
// fail and return, as it restarts on what changed while it was down, and as
// ark.json changes under it

const setup = fileURLToPath(
	new URL("../docs/content/docs/precompile/setup.mdx", import.meta.url)
)
// outside node_modules, where the loader would take the app for a dependency
const appDir = fileURLToPath(new URL("./temp/next-dev/", import.meta.url))

// the configs Setup shows, so the docs and these servers can't drift
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

const transpiled = 'transpilePackages: ["@app/domain"],'
const withTranspiledDomain = (config: string, after: string) => {
	if (!config.includes(after))
		throw new Error(`Found no ${after} in:\n${config}`)
	return config.replace(after, `${after}\n\t${transpiled}`)
}

type Bundler = "Turbopack" | "webpack"

const bundlers: Record<Bundler, { config: string; flags: string[] }> = {
	Turbopack: {
		config: withTranspiledDomain(
			configNamed("turbopack"),
			"bundlePagesRouterDependencies: true,"
		),
		flags: []
	},
	webpack: {
		config: withTranspiledDomain(configNamed("webpack"), "export default {"),
		flags: ["--webpack"]
	}
}

// a Type another Type is written from, so editing it must change what each of
// its importers' validators check, though no importer's own text changes
const money = (amount: string) =>
	`import { type } from "arktype"\n\nexport const Money = type({ amount: "${amount}" })\n`

const files: Record<string, string> = {
	"package.json": JSON.stringify({
		private: true,
		type: "module",
		dependencies: { next: "*" }
	}),
	"app/layout.jsx":
		"export default function Layout({ children }) {\n\treturn <html><body>{children}</body></html>\n}\n",
	"app/page.jsx":
		'import { Invoice, Money } from "@app/domain"\nimport { Client } from "./client.jsx"\n\nexport default function Page() {\n\treturn <p>{`server ${String(Invoice({ id: "a", money: { amount: 5 } }))} ${String(Money.allows({ amount: 5 }))}`} <Client /></p>\n}\n',
	// a client component, which the browser and the server's renderer each build
	"app/client.jsx":
		'"use client"\nimport { Invoice } from "@app/domain"\n\nexport const Client = () => <b>{`client ${String(Invoice.allows({ id: "a", money: { amount: 5 } }))}`}</b>\n',
	// a route with a module of the loader's, which no Type is in
	"app/other/page.jsx":
		'import { plain } from "../../src/plain.ts"\n\nexport default function Page() {\n\treturn <p>{plain}</p>\n}\n',
	"src/plain.ts": 'export const plain: string = "plain"\n',
	"packages/domain/package.json": JSON.stringify({
		name: "@app/domain",
		version: "1.0.0",
		type: "module",
		exports: "./src/index.ts",
		peerDependencies: { arktype: "*" }
	}),
	"packages/domain/src/index.ts":
		'export * from "./money.ts"\nexport * from "./invoice.ts"\n',
	"packages/domain/src/money.ts": money("number > 0"),
	"packages/domain/src/invoice.ts":
		'import { type } from "arktype"\nimport { Money } from "./money.ts"\n\nexport const Invoice = type({ id: "string", money: Money })\n'
}

const next = createRequire(import.meta.url).resolve("next/dist/bin/next")

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const freePort = () =>
	new Promise<number>((resolve, reject) => {
		const server = createServer()
		server.once("error", reject)
		server.listen(0, () => {
			const { port } = server.address() as { port: number }
			server.close(() => resolve(port))
		})
	})

// what the dev server's workers hold open, which a build's don't outlive
const killTree = (child: ChildProcess) => {
	if (child.pid === undefined || child.exitCode !== null) return
	if (process.platform === "win32") {
		spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"])
		return
	}
	try {
		// the group it leads, as Turbopack's loader runs in processes of its own
		process.kill(-child.pid, "SIGKILL")
	} catch {
		child.kill("SIGKILL")
	}
}

interface Served {
	status: number
	text: string
}

class DevServer {
	log = ""
	private child: ChildProcess | undefined
	private port = 0
	private bundler: Bundler

	constructor(bundler: Bundler) {
		this.bundler = bundler
	}

	async start() {
		this.log = ""
		this.port = await freePort()
		const child = spawn(
			process.execPath,
			[next, "dev", "-p", String(this.port), ...bundlers[this.bundler].flags],
			{
				cwd: appDir,
				detached: process.platform !== "win32",
				env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
			}
		)
		this.child = child
		child.stdout!.on("data", data => (this.log += data))
		child.stderr!.on("data", data => (this.log += data))
		for (let waited = 0; !this.log.includes("Ready"); waited += 100) {
			if (waited > 60_000 || child.exitCode !== null) {
				throw new Error(
					`${this.bundler}'s dev server didn't start:\n${this.log}`
				)
			}
			await sleep(100)
		}
	}

	stop() {
		if (this.child) killTree(this.child)
		this.child = undefined
	}

	async get(path: string, timeout = 60_000): Promise<Served> {
		try {
			const response = await fetch(`http://localhost:${this.port}${path}`, {
				// a compile that fails shouldn't hang its request
				signal: AbortSignal.timeout(timeout)
			})
			return { status: response.status, text: await response.text() }
		} catch (e) {
			throw new Error(
				`${this.bundler}'s dev server didn't answer ${path} within ${timeout / 1000}s (${e}). Its output:\n${this.log}`
			)
		}
	}

	// a page's text as React renders it, with its comments and tags removed
	async page(path = "/", timeout?: number) {
		const { status, text } = await this.get(path, timeout)
		const body = text
			.replace(/<!-- -->/g, "")
			.match(/<p>([\S\s]*?)<\/p>/)?.[1]
			.replace(/<[^>]*>/g, "")
		return `${status} ${body ?? "(no page)"}`
	}

	// each request, until a rebuilt module serves what it should
	async pageBecomes(expected: string, path = "/") {
		let last = ""
		const deadline = Date.now() + 60_000
		while (Date.now() < deadline) {
			// a busy machine may take a compile past one request's wait
			last = await this.page(path, 30_000).catch(() => "(no answer)")
			if (last === expected) return
			await sleep(250)
		}
		throw new Error(
			`${this.bundler}'s dev server should serve ${expected} for ${path}, but served ${last}. Its output:\n${this.log}`
		)
	}
}

const write = (path: string, contents: string) => {
	mkdirSync(dirname(join(appDir, path)), { recursive: true })
	writeFileSync(join(appDir, path), contents)
}

// what a dev server prints a moment after it answers
const assertLogged = async (
	server: DevServer,
	message: string,
	when: string
) => {
	for (let waited = 0; !server.log.includes(message); waited += 100) {
		if (waited > 10_000) {
			throw new Error(
				`The dev server should print ${message}\n${when}. Its output:\n${server.log}`
			)
		}
		await sleep(100)
	}
}

for (const bundler of Object.keys(bundlers) as Bundler[]) {
	rmSync(appDir, { recursive: true, force: true })
	for (const [path, contents] of Object.entries(files)) write(path, contents)
	write("next.config.js", bundlers[bundler].config)
	// as a package manager links a workspace package into the app
	mkdirSync(join(appDir, "node_modules/@app"), { recursive: true })
	symlinkSync(
		join(appDir, "packages/domain"),
		join(appDir, "node_modules/@app/domain"),
		"junction"
	)

	const server = new DevServer(bundler)
	const valid = "200 server [object Object] true client true"
	// money.ts at `number > 10`: the page's amount of 5 now fails Invoice's
	// Money, so what it prints is the error Invoice's validator was written to
	const failing =
		"200 server money.amount must be more than 10 false client false"
	try {
		console.log(`▲ Serving it with ${bundler}'s dev server...`)
		await server.start()
		await server.pageBecomes(valid)

		console.log(
			"▲ Editing a Type that another module's Type is written from..."
		)
		write("packages/domain/src/money.ts", money("number > 10"))
		await server.pageBecomes(failing)
		write("packages/domain/src/money.ts", money("number > 0"))
		await server.pageBecomes(valid)

		console.log("▲ Serving a module whose definition throws, then fixing it...")
		write("packages/domain/src/money.ts", money("numbr > 0"))
		await server.pageBecomes("500 (no page)")
		await assertLogged(
			server,
			"throws a ParseError",
			"where a definition throws a ParseError"
		)
		write("packages/domain/src/money.ts", money("number > 0"))
		await server.pageBecomes(valid)

		console.log(
			"▲ Restarting it after the Type was edited while it was down..."
		)
		server.stop()
		write("packages/domain/src/money.ts", money("number > 10"))
		await server.start()
		await server.pageBecomes(failing)
		write("packages/domain/src/money.ts", money("number > 0"))
		await server.pageBecomes(valid)

		console.log(
			"▲ Changing ark.json before a route is first requested, which the dev server answers..."
		)
		// a route nothing has compiled, whose module is new to the loader: where
		// the plugin rejects it from a hook the dev server doesn't catch,
		// webpack's request never answers
		await server.pageBecomes("200 plain", "/other")
		write(
			"src/late.ts",
			'import { type } from "arktype"\n\nexport const Late = type("string")\n'
		)
		write(
			"app/late/page.jsx",
			'import { Late } from "../../src/late.ts"\n\nexport default function Page() {\n\treturn <p>{String(Late.allows("a"))}</p>\n}\n'
		)
		write("ark.json", JSON.stringify({ precompile: { errors: "first" } }))
		// the failure the browser's overlay shows, which the response carries
		const failed = await server.get("/late")
		const changed = `The precompile settings in ark.json changed while ${bundler === "webpack" ? "webpack watched" : "Next ran"}`
		if (failed.status !== 500 || !failed.text.includes(changed)) {
			throw new Error(
				`${bundler}'s dev server should fail a route first requested after ark.json changed with ${changed}, but answered ${failed.status}:\n${failed.text.slice(0, 2000)}\nIts output:\n${server.log}`
			)
		}
		rmSync(join(appDir, "ark.json"))
	} finally {
		server.stop()
	}
}

// on Windows, a server's workers can hold the app's files open briefly after
// it exits, which fails the removal with EPERM, so it retries
rmSync(appDir, {
	recursive: true,
	force: true,
	maxRetries: 10,
	retryDelay: 200
})
rmSync(
	fileURLToPath(new URL("./node_modules/.cache/ark-units", import.meta.url)),
	{
		recursive: true,
		force: true
	}
)
if (existsSync(appDir)) throw new Error(`Couldn't remove ${appDir}`)

console.log(
	"✅ Next's dev server rebuilds a Type's importers as it changes, fails one that throws, serves what changed while it was down, and fails a route first requested after ark.json changed, on Turbopack and webpack"
)
