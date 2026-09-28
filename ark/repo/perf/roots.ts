import { readJson, writeJson } from "@ark/fs"
import { execSync, spawnSync } from "node:child_process"
import {
	copyFileSync,
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	realpathSync,
	symlinkSync
} from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

// A root is any directory laid out like the repo, whose ark/<pkg>/out,
// package.json and node_modules workspace links let
// <root>/ark/type/out/index.js be imported. The repo is one; a snapshot of its
// build is another.

/** the packages `import "arktype"` loads */
const runtimePackages = ["util", "schema", "sets", "type", "regex"]

/**
 * Environment for a child that loads a root. NODE_OPTIONS is dropped because the
 * repo's ts runner puts `--conditions ark-ts` there, which would resolve the
 * root's packages to their sources instead of their out/, and
 * NODE_COMPILE_CACHE because a code cache would make a cold import warm.
 */
const childEnv = () => {
	const env = { ...process.env }
	delete env.NODE_OPTIONS
	delete env.NODE_COMPILE_CACHE
	return env
}

/** runs node with args and returns its stdout, throwing with stderr on failure */
export const runNode = (args: string[], cwd?: string): string => {
	const result = spawnSync(process.execPath, args, {
		cwd,
		env: childEnv(),
		encoding: "utf8",
		maxBuffer: 2 ** 26
	})
	if (result.status !== 0) {
		const command = args.map(arg => (arg.includes("\n") ? "<script>" : arg))
		throw new Error(
			`node ${command.join(" ")} exited with ${result.status ?? result.signal}:\n${result.stderr}`
		)
	}
	return result.stdout
}

/**
 * Copies the runtime packages' out/ and package.json from a root into dir, and
 * recreates their node_modules links to one another as relative links within
 * dir, so the snapshot imports standalone. Refuses to overwrite anything, since
 * a snapshot is evidence.
 */
export const snapshot = (fromRoot: string, toDir: string): void => {
	const from = realpathSync(fromRoot)
	const to = resolve(toDir)
	if (existsSync(to) && readdirSync(to).length)
		throw new Error(`${to} is not empty; remove it or pick another directory`)

	const packageDirs = runtimePackages.map(pkg => join(from, "ark", pkg))
	for (const pkg of runtimePackages) {
		const src = join(from, "ark", pkg)
		const dest = join(to, "ark", pkg)
		mkdirSync(dest, { recursive: true })
		cpSync(join(src, "out"), join(dest, "out"), { recursive: true })
		copyFileSync(join(src, "package.json"), join(dest, "package.json"))
		for (const link of linksIn(join(src, "node_modules"))) {
			const target = realpathSync(link)
			if (!packageDirs.includes(target)) continue
			const destLink = join(dest, relative(src, link))
			mkdirSync(dirname(destLink), { recursive: true })
			symlinkSync(
				relative(dirname(destLink), join(to, relative(from, target))),
				destLink
			)
		}
	}
	writeJson(join(to, "snapshot.json"), {
		from,
		head: gitHead(from),
		date: new Date().toISOString()
	})
}

/** symlinks directly in a node_modules directory, or in one of its @scopes */
const linksIn = (dir: string): string[] =>
	!existsSync(dir) ?
		[]
	:	readdirSync(dir).flatMap(name => {
			const path = join(dir, name)
			if (lstatSync(path).isSymbolicLink()) return [path]
			return name.startsWith("@") ? linksIn(path) : []
		})

// imports arktype from the url in argv[1], checks that it validates, and prints
// every module url resolved along the way (even if the import failed)
const importAndListModules = `
import { registerHooks } from "node:module"
const urls = new Set()
registerHooks({
	resolve: (specifier, context, nextResolve) => {
		const result = nextResolve(specifier, context)
		urls.add(result.url)
		return result
	}
})
let error
try {
	const { type } = await import(process.argv[1])
	const T = type({ a: "string" })
	if (!T.allows({ a: "" }) || T.allows({ a: 5 })) error = "validation is broken"
} catch (e) {
	error = String(e?.stack ?? e)
}
console.log(JSON.stringify({ urls: [...urls], error }))
`

/**
 * Imports the root's arktype in a clean child and checks that every module it
 * loaded lies inside the root, and that it validates. Returns the module count.
 */
export const verifyStandalone = (root: string): number => {
	const dir = realpathSync(root)
	const { urls, error } = JSON.parse(
		runNode(
			[
				"--input-type=module",
				"--eval",
				importAndListModules,
				pathToFileURL(join(dir, "ark", "type", "out", "index.js")).href
			],
			dir
		)
	) as { urls: string[]; error?: string }
	const files = urls
		.filter(url => url.startsWith("file:"))
		.map(url => fileURLToPath(url))
	const outside = files.filter(file => !file.startsWith(dir + sep))
	if (outside.length) {
		throw new Error(
			`${dir} is not standalone; it loaded:\n${outside.map(file => `  ${file}`).join("\n")}`
		)
	}
	if (error) throw new Error(`${dir} failed to import:\n${error}`)
	return files.length
}

export type RootDescription = {
	path: string
	head?: string | undefined
	snapshot?: Record<string, unknown>
}

export const describeRoot = (root: string): RootDescription => {
	const path = realpathSync(root)
	const snapshotFile = join(path, "snapshot.json")
	return existsSync(snapshotFile) ?
			{ path, snapshot: readJson(snapshotFile) }
		:	{ path, head: gitHead(path) }
}

export const rootLabel = (root: RootDescription): string =>
	root.snapshot ?
		`${root.path} (snapshot of ${root.snapshot.head ?? root.snapshot.from})`
	: root.head ? `${root.path} @ ${root.head}`
	: root.path

const gitHead = (dir: string): string | undefined => {
	try {
		return execSync("git rev-parse --short HEAD", {
			cwd: dir,
			stdio: ["ignore", "pipe", "ignore"]
		})
			.toString()
			.trim()
	} catch {
		return undefined
	}
}
