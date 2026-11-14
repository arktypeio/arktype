import { execSync } from "node:child_process"
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	renameSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"

// A real app measured beside the generated ones: ntwine's packages/shared, about
// 360 schemas with their logic, whose index re-exports every Type so nothing
// prunes. Nothing of it is vendored: each arm is cloned from the public repo,
// its zod source at the commit before the migration and its arktype source at
// the migration (branch zod-to-arktype), which links the arktype under test.

const repoSha = "f150195582ee6385abc56ba261b2f0248a841187"
const migrationSha = "e284592d41c2b97114a26d71b23ceac15277abbd"

const root = join(import.meta.dirname, "..", "..", "..", "..")
const cache = join(root, "node_modules", ".cache", "bigapp")

const cloned = (sha: string) => {
	const dir = join(cache, `ntwine-${sha}`)
	if (existsSync(dir)) return dir
	const temp = `${dir}.tmp`
	rmSync(temp, { recursive: true, force: true })
	mkdirSync(temp, { recursive: true })
	const git = (args: string) =>
		execSync(`git ${args}`, { cwd: temp, stdio: "pipe" })
	try {
		git("init -q")
		git("remote add origin https://github.com/ssalbdivad/ntwine.git")
		git("sparse-checkout set packages/shared")
		git(`fetch -q --depth 1 --filter=blob:none origin ${sha}`)
		git("checkout -q FETCH_HEAD")
	} catch (e) {
		rmSync(temp, { recursive: true, force: true })
		throw new Error(`Couldn't clone ntwine at ${sha}: ${e}`)
	}
	renameSync(temp, dir)
	return dir
}

// what its packages/shared depends on, where its source and copies resolve them
const installDeps = () => {
	if (existsSync(join(cache, "node_modules", "yaml"))) return
	mkdirSync(cache, { recursive: true })
	writeFileSync(
		join(cache, "package.json"),
		JSON.stringify({
			private: true,
			type: "module",
			dependencies: { yaml: "2.9.0", zod: "3.25.76" }
		})
	)
	execSync("pnpm i --ignore-workspace --ignore-pnpmfile --prefer-offline", {
		cwd: cache,
		stdio: "pipe"
	})
}

/** the ntwine commits the arms measure, before and after the migration */
export const ntwineSource = { repo: repoSha, migration: migrationSha }

/** whether both commits and their dependencies are already here, so a check can read them offline */
export const ntwineCloned = (): boolean =>
	[repoSha, migrationSha].every(sha =>
		existsSync(join(cache, `ntwine-${sha}`))
	) && existsSync(join(cache, "node_modules", "yaml"))

export const ntwineMissing =
	"ntwine isn't cloned here; `pnpm benchBigApp ntwine` clones it"

const zod4 = join(import.meta.dirname, "..", "..", "node_modules", "zod")

export const ntwineArms = (dir: string) => {
	installDeps()
	const zodSource = join(cloned(repoSha), "packages", "shared", "src")
	// under the repo, since the plugin leaves node_modules alone, and resolving
	// this workspace's arktype
	rmSync(dir, { recursive: true, force: true })
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	const source = join(cloned(migrationSha), "packages", "shared", "src")
	for (const file of readdirSync(source)) {
		if (file.endsWith(".ts") && !file.endsWith(".test.ts"))
			cpSync(join(source, file), join(dir, file))
	}
	symlinkSync(
		join(cache, "node_modules", "yaml"),
		join(dir, "node_modules", "yaml")
	)
	// zod's global mode compiles each schema at its first parse
	const compiled = join(dir, "zodCompiled.ts")
	writeFileSync(
		compiled,
		`import "zod/compile"\nexport * from ${JSON.stringify(join(zodSource, "index.ts"))}`
	)
	return {
		arktype: {
			entry: join(dir, "index.ts"),
			cwd: dir,
			precompiled: { config: "./ark-config.ts" }
		},
		// written to zod 3, and runs unchanged on the zod this repo's benches use
		zod: {
			entry: join(zodSource, "index.ts"),
			cwd: zodSource,
			alias: { zod: join(zod4, "index.js") }
		},
		zodCompiled: {
			entry: compiled,
			cwd: zodSource,
			alias: {
				"zod/compile": join(zod4, "compile.js"),
				zod: join(zod4, "index.js")
			}
		},
		zod3: { entry: join(zodSource, "index.ts"), cwd: zodSource }
	}
}

export const ntwineThread = {
	id: "launch-lane",
	title: "Launch lane",
	status: "active",
	hasPlan: false,
	mechanism: null,
	humanBlocked: false,
	ready: true,
	dependsOn: [],
	externalDeps: [],
	agents: [],
	errors: [],
	warnings: [],
	runtime: "running",
	unread: false,
	archived: false,
	subAgents: [],
	bgShells: [],
	watches: [],
	pendingQuestion: false
}
