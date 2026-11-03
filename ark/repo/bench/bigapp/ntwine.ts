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
// prunes. Nothing of it is vendored. Its zod source is cloned at a pinned commit
// and its arktype migration, not yet public, is read from a checkout.

const repoSha = "c3d4209563837606699b76cf51d99feba32b179a"
// ntwine's commit holding the migration, once it lands, in place of the env var
const migrationSha: string | undefined = undefined
const arktypeEnv = "BIGAPP_NTWINE_ARKTYPE"

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
	execSync("pnpm i --ignore-workspace --prefer-offline", {
		cwd: cache,
		stdio: "pipe"
	})
}

const arktypeSource = () =>
	process.env[arktypeEnv] ??
	(migrationSha && join(cloned(migrationSha), "packages", "shared", "src"))

/** the migration's source, if this machine has it */
export const ntwineAvailable = (): boolean => {
	const source = arktypeSource()
	return !!source && existsSync(join(source, "index.ts"))
}

export const ntwineMissing = `${arktypeEnv} must name the src of ntwine's packages/shared, migrated to arktype`

const zod4 = join(import.meta.dirname, "..", "..", "node_modules", "zod")

export const ntwineArms = (dir: string) => {
	if (!ntwineAvailable()) throw new Error(ntwineMissing)
	installDeps()
	const zodSource = join(cloned(repoSha), "packages", "shared", "src")
	// under the repo, since the plugin leaves node_modules alone, and resolving
	// this workspace's arktype
	rmSync(dir, { recursive: true, force: true })
	mkdirSync(join(dir, "node_modules"), { recursive: true })
	const source = arktypeSource()!
	for (const file of readdirSync(source)) {
		if (file.endsWith(".ts") && !file.endsWith(".test.ts"))
			cpSync(join(source, file), join(dir, file))
	}
	symlinkSync(
		join(cache, "node_modules", "yaml"),
		join(dir, "node_modules", "yaml")
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
