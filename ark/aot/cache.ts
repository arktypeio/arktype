import { createHash } from "node:crypto"
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { threadId } from "node:worker_threads"
import {
	arkPackageName,
	packageRootOf,
	readFile,
	type PrecompileHost
} from "./host.ts"

// what a stored answer read, which must read the same for it to be reused
export interface Snapshot {
	// what was read before
	parent: string | undefined
	// each file's content hash, null where it was missing
	reads: [file: string, hash: string | null][]
	// each import's target, null where it didn't resolve
	resolutions: [importer: string, specifier: string, target: string | null][]
	// each the bundler resolved, as no file did, which it's asked again
	asked: [importer: string, specifier: string, target: string | null][]
	// the tsconfig whose paths each importer resolves through
	tsconfigs: [importer: string, tsconfig: string | null][]
}

export const emptySnapshot = (parent: string | undefined): Snapshot => ({
	parent,
	reads: [],
	resolutions: [],
	asked: [],
	tsconfigs: []
})

export const hashOf = (text: string): string =>
	createHash("sha256").update(text).digest("base64url")

// what hashOf writes, so a name read from the cache, as an entry's snapshot
// is, names a file in its directory and no key every object has
const isHash = (name: string): boolean => /^[\w-]{43}$/.test(name)

// the code writing an answer: arktype's packages by content, as a linked
// workspace or a repacked tarball changes it without a version, each as the
// package importing it resolves it, the precompiler's other dependencies by
// version, and the runtime
const fingerprintOf = (): string => {
	const parts = [process.version, process.platform, process.arch]
	const roots = [rootOf(fileURLToPath(import.meta.url))]
	for (const root of roots) {
		const { name, dependencies, peerDependencies } = JSON.parse(
			readFileSync(join(root, "package.json"), "utf8")
		)
		const files: string[] = []
		collectCode(root, files)
		parts.push(name)
		for (const file of files.sort())
			parts.push(relative(root, file), hashOf(readFileSync(file, "utf8")))
		for (const dependency in { ...dependencies, ...peerDependencies }) {
			const found =
				arkPackageName.test(dependency) && packageRootOf(dependency, root)
			if (found && !roots.includes(found)) roots.push(found)
		}
	}
	for (const name of versionedDependencies) {
		const root = rootOf(fileURLToPath(import.meta.resolve(name)))
		parts.push(
			name,
			JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version
		)
	}
	return hashOf(parts.join("\n"))
}

const versionedDependencies = [
	"oxc-parser",
	"oxc-resolver",
	"magic-string",
	"@jridgewell/sourcemap-codec"
]

const rootOf = (file: string): string => {
	let dir = dirname(file)
	while (!existsSync(join(dir, "package.json"))) dir = dirname(dir)
	return dir
}

const codeFile = /\.(?:[cm]?[jt]s|json)$/

// a workspace package's tests and dependencies don't run as it precompiles
const collectCode = (dir: string, files: string[]) => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) {
			if (
				entry.name !== "node_modules" &&
				entry.name !== "__tests__" &&
				!entry.name.startsWith(".")
			)
				collectCode(path, files)
		} else if (codeFile.test(entry.name)) files.push(path)
	}
}

let fingerprint: string | undefined

// names the directory of this code's answers, and versions a bundler's
// persistent cache, which a module's dependencies don't turn over as the
// code changes without a version
export const fingerprintOfCode = (): string => (fingerprint ??= fingerprintOf())

export const mtimeOf = (file: string): number =>
	statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? -1

// a cache's answers outlive the build: one in node_modules/.cache/ark where
// the build runs, as Vite keeps its own, for each version of the code, which
// replaces those of others. Like Vite's, whoever writes it writes the bundle,
// so it's restored only from a build as trusted as the one reading it
export class AnswerCache {
	dir: string

	// past which those written longest ago go
	static maxEntries = 50_000

	constructor(cwd: string) {
		const version = fingerprintOfCode()
		const root = join(cwd, "node_modules", ".cache", "ark")
		this.dir = join(root, version)
		if (existsSync(root)) {
			for (const name of readdirSync(root)) {
				if (name !== version && isHash(name))
					rmSync(join(root, name), { recursive: true, force: true })
			}
		}
		mkdirSync(this.dir, { recursive: true })
		const names = readdirSync(this.dir)
		if (names.length > AnswerCache.maxEntries) {
			const paths = names.map(name => join(this.dir, name))
			const mtimes = Object.fromEntries(
				paths.map(path => [path, mtimeOf(path)])
			)
			paths.sort((l, r) => mtimes[l] - mtimes[r])
			for (const path of paths.slice(
				0,
				paths.length - AnswerCache.maxEntries / 2
			))
				rmSync(path, { force: true })
		}
	}

	// an answer stored for the key whose snapshot still holds
	get(key: string, holds: (snapshot: string) => boolean): unknown {
		const stored = this.read(`a-${key}`) as
			| { snapshot: string; answer: unknown }
			| undefined
		if (stored && isHash(stored.snapshot) && holds(stored.snapshot))
			return stored.answer
	}

	set(key: string, answer: unknown, snapshot: string): void {
		this.write(`a-${key}`, JSON.stringify({ snapshot, answer }))
	}

	delete(key: string): void {
		rmSync(join(this.dir, `a-${key}.json`), { force: true })
	}

	// named by content, so each read once
	private snapshots: Record<string, Snapshot | undefined> = {}

	snapshot(id: string): Snapshot | undefined {
		if (!isHash(id)) return
		return (this.snapshots[id] ??= this.read(`s-${id}`) as Snapshot | undefined)
	}

	// named by its content, so a build writing it again writes the same file
	addSnapshot(snapshot: Snapshot): string {
		const text = JSON.stringify(snapshot)
		const id = hashOf(text)
		this.write(`s-${id}`, text)
		return id
	}

	// one cut short or changed since it was written reads as missing, and is
	// written again
	private read(name: string): unknown {
		let text: string
		try {
			text = readFileSync(join(this.dir, `${name}.json`), "utf8")
		} catch {
			return
		}
		const start = text.indexOf("\n") + 1
		const body = text.slice(start)
		if (start && text.slice(0, start - 1) === hashOf(body))
			return JSON.parse(body)
	}

	// with its hash, and renamed into place once written, so a concurrent build
	// reads all of it or none, and the last of two writing it wins. Its temp
	// file is new, as one already there may link to a file outside the cache
	private write(name: string, body: string): void {
		const path = join(this.dir, `${name}.json`)
		const temp = `${path}.${process.pid}-${threadId}.tmp`
		try {
			writeFileSync(temp, `${hashOf(body)}\n${body}`, { flag: "wx" })
			renameSync(temp, path)
		} catch {
			rmSync(temp, { force: true })
		}
	}
}

export interface SnapshotCheck {
	(snapshot: string): boolean
	// each file it read, as it was before, so a write meanwhile counts as a change
	mtimes: Record<string, number>
}

// whether each file and import a snapshot names reads and resolves the
// same, judged once each until a file it read changes or the build resets
export const createSnapshotCheck = (
	cache: AnswerCache,
	host: PrecompileHost,
	resolveInBundler?: (specifier: string, importer: string) => string | undefined
): SnapshotCheck => {
	const holding: Record<string, boolean> = {}
	const mtimes: Record<string, number> = {}
	const hashes: Record<string, string | null> = {}
	const hashOfFile = (file: string) => {
		mtimes[file] = mtimeOf(file)
		const source = readFile(file)
		return source === undefined ? null : hashOf(source)
	}
	const targets: Record<string, string | null> = {}
	const tsconfigs: Record<string, string | null> = {}
	const answers: Record<string, string | null> = {}
	const holdsFrom = (id: string): boolean => {
		const asked: Snapshot["asked"] = []
		for (let next: string | undefined = id; next !== undefined; ) {
			const snapshot = cache.snapshot(next)
			if (!snapshot) return false
			for (const [file, hash] of snapshot.reads)
				if ((hashes[file] ??= hashOfFile(file)) !== hash) return false
			for (const [importer, specifier, target] of snapshot.resolutions) {
				if (
					(targets[`${importer}\0${specifier}`] ??=
						host.resolve(specifier, importer) ?? null) !== target
				)
					return false
			}
			for (const [importer, tsconfig] of snapshot.tsconfigs) {
				if (
					(tsconfigs[importer] ??= host.tsconfigOf?.(importer) ?? null) !==
					tsconfig
				)
					return false
			}
			asked.push(...snapshot.asked)
			next = snapshot.parent
		}
		// last, as each question waits on the bundler's thread
		return asked.every(
			([importer, specifier, target]) =>
				(answers[`${importer}\0${specifier}`] ??=
					host.resolve(specifier, importer) ??
					resolveInBundler?.(specifier, importer) ??
					null) === target
		)
	}
	return Object.assign((id: string) => (holding[id] ??= holdsFrom(id)), {
		mtimes
	})
}
