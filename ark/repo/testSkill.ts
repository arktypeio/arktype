import { spawnSync } from "node:child_process"
import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const skillDir = fileURLToPath(
	new URL("../type/skills/arktype/", import.meta.url)
)

// references/migrating.md is written from a docs page whose examples the docs
// build already checks
const skillFiles = [
	"SKILL.md",
	...readdirSync(join(skillDir, "references"))
		.filter(file => file !== "migrating.md")
		.map(file => `references/${file}`)
]
// under node_modules, so typecheckRepo leaves the examples to this script
const tempDir = fileURLToPath(
	new URL("./node_modules/.cache/skill/", import.meta.url)
)

rmSync(tempDir, { recursive: true, force: true })
mkdirSync(tempDir, { recursive: true })

const blockPattern = /^```ts\n([\S\s]*?)^```$/gm

let count = 0
for (const file of skillFiles) {
	const markdown = readFileSync(join(skillDir, file), "utf8")
	for (const [, code] of markdown.matchAll(blockPattern)) {
		const line = markdown.slice(0, markdown.indexOf(code)).split("\n").length
		// blocks after the first rely on the imports it shows
		const imports =
			code.includes(`from "arktype"`) ? "" : (
				`import { scope, type, type Type } from "arktype"\n`
			)
		writeFileSync(
			join(tempDir, `${file.replace(/\W/g, "_")}_${line}.ts`),
			`${imports}${code}export {}\n`
		)
		count++
	}
}

writeFileSync(
	join(tempDir, "tsconfig.json"),
	JSON.stringify({
		extends: "../../../../../tsconfig.json",
		compilerOptions: { declaration: false, types: ["node"], lib: ["ESNext"] },
		include: ["*.ts"],
		// the inherited excludes would skip node_modules, where these are written
		exclude: []
	})
)

console.log(`🔍 Type checking ${count} examples from the ArkType skill...`)

// Windows spawns pnpm's .cmd shim only through a shell
const result = spawnSync("pnpm", ["exec", "tsc", "--project", tempDir], {
	stdio: "inherit",
	shell: process.platform === "win32"
})

if (result.error) throw result.error

if (result.status !== 0) {
	throw new Error(
		`The skill's examples don't type check. Each file in ${tempDir} is named for the line its block starts on.`
	)
}

console.log("✅ Every example in the skill type checks")
