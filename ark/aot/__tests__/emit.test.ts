import { attest, contextualize } from "@ark/attest"
import { fromHere } from "@ark/fs"
import {
	emitPrecompiled,
	writeEmittedVariantMessage,
	writeUnemittedMessage
} from "@ark/aot/internal/emit.ts"
import { spawnSync } from "node:child_process"
import {
	existsSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { SourceMap, type SourceMapping } from "node:module"
import { join } from "node:path"
import { runCli, tempDir } from "./utils.ts"

const emitted = fromHere("emitted")
const out = join(emitted, "out")
const tsc = fromHere(
	"..",
	"..",
	"..",
	"node_modules",
	"typescript",
	"bin",
	"tsc"
)

// as `tsc && arktype-precompile --emit` builds it, for a package of `type`
const build = (
	type: "module" | "commonjs",
	tsconfig: string,
	emittedTsconfig = tsconfig
) => {
	writeFileSync(join(emitted, "package.json"), JSON.stringify({ type }))
	// arktype resolves to its source here, which tsc would check and emit too
	spawnSync(process.execPath, [
		tsc,
		"-p",
		join(emitted, tsconfig),
		"--noCheck",
		"--noResolve"
	])
	const cli = runCli(emitted, "--emit", "--tsconfig", emittedTsconfig)
	const run = spawnSync(
		process.execPath,
		["--conditions", "ark-ts", join(out, "main.js")],
		{ encoding: "utf8" }
	)
	return { cli: cli.stdout + cli.stderr, run: run.stdout + run.stderr }
}

// the arktype entries each emitted module imports or requires
const arktypeImportsOf = () =>
	readdirSync(out)
		.filter(file => file.endsWith(".js"))
		.sort()
		.map(file => [
			file,
			[
				...new Set(
					[
						...readFileSync(join(out, file), "utf8").matchAll(
							/(?:from |import |require\()"(arktype[^"]*)"/g
						)
					].map(match => match[1])
				)
			]
		])

// the source line of the first emitted line holding `text`
const sourceLineOf = (text: string) => {
	const code = readFileSync(join(out, "main.js"), "utf8")
	const inline =
		/\/\/# sourceMappingURL=data:application\/json;base64,(.+)$/.exec(code)?.[1]
	const map = new SourceMap(
		JSON.parse(
			inline ?
				Buffer.from(inline, "base64").toString()
			:	readFileSync(join(out, "main.js.map"), "utf8")
		)
	)
	const line = code.split("\n").findIndex(line => line.includes(text))
	return (map.findEntry(line, 0) as SourceMapping).originalLine + 1
}

contextualize(() => {
	afterEach(() => {
		rmSync(out, { recursive: true, force: true })
		rmSync(join(emitted, "package.json"), { force: true })
	})

	const attestBuilt = ({ cli, run }: ReturnType<typeof build>) => {
		attest(cli).equals("3 modules precompiled\n")
		attest(run).equals(
			'{"name":"Ada","age":36}\nage must be non-negative\nrole must be "admin"\n'
		)
		attest(arktypeImportsOf()).equals([
			["errors.js", ["arktype/runtime"]],
			["main.js", ["arktype/runtime"]],
			["print.js", []],
			["user.js", ["arktype/runtime"]]
		])
		attest(sourceLineOf("const Admin")).equals(5)
	}

	it("precompiles what tsc emits as ESM", () => {
		attestBuilt(build("module", "tsconfig.json"))
	}).timeout(60000)

	it("precompiles what tsc emits as CommonJS, through references", () => {
		attestBuilt(
			build("commonjs", "tsconfig.inline.json", "tsconfig.solution.json")
		)
	}).timeout(60000)

	it("writes nothing for a module it can't precompile", () => {
		const cli = runCli(
			emitted,
			"--emit",
			"--tsconfig",
			"tsconfig.rejected.json"
		)
		attest({ status: cli.status, stderr: cli.stderr }).snap({
			status: 1,
			stderr:
				'rejected/main.ts:5:20  `type` is used outside a precompiled site\n  Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".\n'
		})
		attest(existsSync(out)).equals(false)
	}).timeout(60000)

	it("refuses a runtime only a bundler can load", () => {
		attest(() => emitPrecompiled({ cwd: emitted, errors: "none" })).throws(
			writeEmittedVariantMessage("none")
		)
	})

	it("names the tsconfig to create where none is found", () => {
		const dir = tempDir()
		attest(() => emitPrecompiled({ cwd: dir })).throws(
			`No tsconfig.json is in ${dir} or a directory above it. Create ${join(dir, "tsconfig.json")}, as { "compilerOptions": { "rootDir": "src", "outDir": "dist" }, "include": ["src"] }, or name the one tsc builds with as --tsconfig, or as "tsconfig" in ark.json.`
		)
	})

	it("refuses a tsconfig that emits no JavaScript", () => {
		attest(() =>
			emitPrecompiled({ cwd: emitted, tsconfig: "tsconfig.noEmit.json" })
		).throws(writeUnemittedMessage(join(emitted, "tsconfig.noEmit.json")))
	})
})
