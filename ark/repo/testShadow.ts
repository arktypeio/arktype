// run `pnpm build` first: npm installs arktype's built packages
import { execSync, spawnSync } from "node:child_process"
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const arkDir = fileURLToPath(new URL("..", import.meta.url))

const manifestOf = (dir: string) =>
	JSON.parse(readFileSync(join(arkDir, dir, "package.json"), "utf8")) as {
		name: string
		dependencies?: Record<string, string>
	}

// what installing arktype and @ark/aot installs from this repo
const dirsByName = Object.fromEntries(
	["util", "schema", "regex", "sets", "type", "aot"].map(dir => [
		manifestOf(dir).name,
		dir
	])
)

// @ark/aot's other dependencies, and what the app runs, as this repo installs them
const thirdParty = [
	...Object.keys(manifestOf("aot").dependencies ?? {}).filter(
		name => !(name in dirsByName)
	),
	"typescript",
	"vite",
	"vitest"
]

const files: Record<string, string> = {
	"package.json": JSON.stringify({ private: true, type: "module" }),
	"vitest.config.ts": `import { precompile } from "@ark/aot/unplugin"
import { defineConfig } from "vitest/config"

export default defineConfig({ plugins: [precompile.vite({ shadow: true })] })
`,
	// Vite keeping each path as it's given, as it can an 8.3 name on Windows,
	// which arktype's resolver doesn't
	"vitest.preserved.config.ts": `import { precompile } from "@ark/aot/unplugin"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [precompile.vite({ shadow: true })],
	resolve: { preserveSymlinks: true }
})
`,
	"fields.ts": `import { type } from "arktype"

export const Title = type("string <= 120")
export const Count = type("number > 0")
export const Email = type("string.email")
export const Trimmed = type("string").pipe(s => s.trim())
export const User = type({ name: "string", age: "number.integer >= 0" })
`,
	"test/fields.test.ts": `import { type } from "arktype"
import { types } from "node:util"
import { expect, it } from "vitest"
import { Count, Email, Title, Trimmed, User } from "../fields.ts"

it("shadows each Type", () => {
	expect(types.isProxy(Title)).toBe(true)
})

it("returns what arktype returns", () => {
	expect(Title("x")).toBe("x")
	expect(Title("x".repeat(121))).toBeInstanceOf(type.errors)
	expect(Count(1)).toBe(1)
	expect(String(Count("x"))).toBe("must be a number (was a string)")
	expect(Email("ada@example.com")).toBe("ada@example.com")
	expect(String(Email("x"))).toBe('must be an email address (was "x")')
	expect(Trimmed(" ada ")).toBe("ada")
	expect(User({ name: "Ada", age: 36 })).toEqual({ name: "Ada", age: 36 })
	expect(String(User({ name: "Ada", age: -1 }))).toBe(
		"age must be non-negative (was -1)"
	)
})
`
}

const link = (target: string, path: string) => {
	mkdirSync(dirname(path), { recursive: true })
	symlinkSync(target, path, "junction")
}

const writeApp = (appDir: string) => {
	for (const [path, contents] of Object.entries(files)) {
		mkdirSync(dirname(join(appDir, path)), { recursive: true })
		writeFileSync(join(appDir, path), contents)
	}
	for (const name of thirdParty) {
		link(
			realpathSync(join(arkDir, "aot", "node_modules", name)),
			join(appDir, "node_modules", name)
		)
	}
}

const runIn = (appDir: string, config = "vitest.config.ts") => {
	const result = spawnSync(
		process.execPath,
		[
			join(appDir, "node_modules/vitest/vitest.mjs"),
			"run",
			"--root",
			appDir,
			"--config",
			config
		],
		{ cwd: appDir, encoding: "utf8" }
	)
	if (result.error) throw result.error
	if (result.status !== 0) {
		throw new Error(
			`Vitest should pass in shadow mode. It exited ${result.status}:\n${result.stdout}${result.stderr}`
		)
	}
}

const tempDir = mkdtempSync(join(tmpdir(), "ark-shadow-"))

try {
	console.log("🌘 Running Vitest in shadow mode on packed packages...")
	const packsDir = join(tempDir, "packs")
	const packedDir = join(tempDir, "packed")
	for (const [name, dir] of Object.entries(dirsByName)) {
		const packDir = join(packsDir, dir)
		execSync(`pnpm pack --pack-destination "${packDir}"`, {
			cwd: join(arkDir, dir),
			stdio: "ignore"
		})
		const installDir = join(packedDir, "node_modules", name)
		mkdirSync(installDir, { recursive: true })
		// as npm installs it, beside each package it depends on. tar runs where
		// it extracts and is given a relative path, since GNU tar on Windows
		// reads `C:` as a host and can't open a backslashed -C directory
		const archive = relative(installDir, join(packDir, readdirSync(packDir)[0]))
		execSync(
			`tar -xzf "${archive.split(sep).join("/")}" --strip-components=1`,
			{
				cwd: installDir
			}
		)
	}
	writeApp(packedDir)
	runIn(packedDir)

	console.log("🌘 Running it through a path Vite keeps as it's given...")
	const aliasDir = join(tempDir, "alias")
	link(packedDir, aliasDir)
	runIn(aliasDir, "vitest.preserved.config.ts")

	console.log("🌘 Running it on packages linked from this repo...")
	const linkedDir = join(tempDir, "linked")
	for (const name of ["arktype", "@ark/aot"])
		link(join(arkDir, dirsByName[name]), join(linkedDir, "node_modules", name))
	writeApp(linkedDir)
	runIn(linkedDir)
} finally {
	rmSync(tempDir, { recursive: true, force: true })
}

console.log(
	"✅ Shadow mode finds no divergence where arktype's validators agree with it"
)
