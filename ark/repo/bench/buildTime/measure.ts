import { spawn, type ChildProcess } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { setTimeout as sleep } from "node:timers/promises"
import { editedCommon } from "./apps.ts"

export type Bundler = "esbuild" | "vite" | "next"

export interface Arm {
	/** the app's directory */
	app: string
	bundler: Bundler
	precompiled: boolean
}

export type Measured =
	| { ok: true; ms: number; edits?: (number | null)[] }
	| { ok: false; ms?: number; error: string }

/** the parts of Playwright's API a dev server's session uses */
export interface Browser {
	newPage(): Promise<Page>
}

interface Page {
	exposeFunction(name: string, f: (revision: number) => void): Promise<void>
	goto(url: string, options: { timeout: number }): Promise<unknown>
	close(): Promise<void>
}

const binOf = (app: string, bundler: "vite" | "next") =>
	join(
		app,
		"..",
		"..",
		"node_modules",
		bundler === "vite" ? "vite/bin/vite.js" : "next/dist/bin/next"
	)

// what a cold build or a fresh server starts from
export const clean = (app: string) => {
	for (const dir of ["dist", "dist-esbuild", ".next", "node_modules"])
		rmSync(join(app, dir), { recursive: true, force: true })
}

const exitOf = (child: ChildProcess) =>
	new Promise<number>(resolve => child.on("exit", code => resolve(code ?? 1)))

interface Started {
	child: ChildProcess
	output: () => string
}

// a process group of its own, so a server's children stop with it
const start = ({ app, precompiled }: Arm, args: string[]): Started => {
	const child = spawn(process.execPath, args, {
		cwd: app,
		env: {
			...process.env,
			PRECOMPILE: precompiled ? "1" : "",
			NEXT_TELEMETRY_DISABLED: "1"
		},
		detached: true,
		stdio: ["ignore", "pipe", "pipe"]
	})
	let output = ""
	child.stdout!.on("data", data => (output += data))
	child.stderr!.on("data", data => (output += data))
	return { child, output: () => output.slice(-2000) }
}

const stop = async (child: ChildProcess) => {
	if (child.exitCode !== null) return
	const exited = exitOf(child)
	process.kill(-child.pid!, "SIGTERM")
	const stopped = await Promise.race([exited, sleep(5000).then(() => false)])
	if (stopped === false) process.kill(-child.pid!, "SIGKILL")
}

/** a production build, from spawning the bundler until it exits */
export const build = async (arm: Arm): Promise<Measured> => {
	const args =
		arm.bundler === "esbuild" ? [join(arm.app, "esbuild.ts")]
		: arm.bundler === "vite" ? [binOf(arm.app, "vite"), "build"]
		: [binOf(arm.app, "next"), "build"]
	const started = start(arm, args)
	const begun = performance.now()
	const code = await exitOf(started.child)
	const ms = performance.now() - begun
	return code === 0 ?
			{ ok: true, ms }
		:	{ ok: false, ms, error: started.output() }
}

/**
 * A dev server's startup, from spawning it until a page has run every
 * handler, then each edit, from writing it until the page shows it
 */
export const dev = async (
	arm: Arm,
	browser: Browser,
	port: number,
	edits: number
): Promise<Measured> => {
	const common = join(arm.app, "src/domains/d0/common.ts")
	const original = readFileSync(common, "utf8")
	const page = await browser.newPage()
	const shown: [revision: number, at: number][] = []
	let notify = () => {}
	await page.exposeFunction("__onRevision", revision => {
		shown.push([revision, performance.now()])
		notify()
	})
	const shownAt = (revision: number, timeout: number) =>
		new Promise<number | undefined>(resolve => {
			notify = () => {
				const seen = shown.find(([r]) => r === revision)
				if (seen) resolve(seen[1])
			}
			notify()
			setTimeout(() => resolve(undefined), timeout)
		})
	const args =
		arm.bundler === "vite" ?
			[binOf(arm.app, "vite"), "--port", String(port), "--strictPort"]
		:	[binOf(arm.app, "next"), "dev", "-p", String(port)]
	const begun = performance.now()
	const started = start(arm, args)
	const url = `http://localhost:${port}/`
	try {
		while (
			!(await fetch(url, { method: "HEAD" }).then(
				() => true,
				() => false
			))
		) {
			if (started.child.exitCode !== null) throw new Error("server exited")
			await sleep(20)
		}
		await page.goto(url, { timeout: 600_000 })
		const ready = await shownAt(0, 600_000)
		if (ready === undefined) throw new Error("page never ran its handlers")
		const times: (number | null)[] = []
		await sleep(2000)
		for (let i = 1; i <= edits; i++) {
			writeFileSync(common, editedCommon(original, i))
			const written = performance.now()
			const seen = await shownAt(i, 120_000)
			times.push(seen === undefined ? null : seen - written)
			await sleep(1500)
		}
		return { ok: true, ms: ready - begun, edits: times }
	} catch (e) {
		return { ok: false, error: `${e}\n${started.output()}` }
	} finally {
		writeFileSync(common, original)
		await page.close()
		await stop(started.child)
	}
}

/** an esbuild context's first build, then its rebuild after each edit */
export const rebuilds = async (
	arm: Arm,
	edits: number,
	mode: "development" | "production"
): Promise<Measured> => {
	const started = start(arm, [
		join(import.meta.dirname, "rebuilds.ts"),
		String(edits),
		mode
	])
	const code = await exitOf(started.child)
	if (code !== 0) return { ok: false, error: started.output() }
	const lines = started.output().trim().split("\n")
	const { ms, rebuilds } = JSON.parse(lines[lines.length - 1])
	return { ok: true, ms, edits: rebuilds }
}
