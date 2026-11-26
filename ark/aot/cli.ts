#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import type { Checker, DeclareOptions } from "./declare.ts"
import { isBuildError } from "./host.ts"
import { isFileError } from "./util.ts"
import { writeNodeVersionMessage } from "./messages.ts"
import type { PrecompilePluginOptions } from "./driver.ts"
import {
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { cliOptions } from "./settingsValidators.ts"
import { checkArktypeVersion } from "./version.ts"

// before importing what reads fs.globSync, which older versions lack
const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 22 || (major === 22 && minor < 12)) {
	console.error(writeNodeVersionMessage("@ark/aot", "22.12"))
	process.exit(1)
}

try {
	checkArktypeVersion()
} catch (e) {
	console.error((e as Error).message)
	process.exit(1)
}

// after the check, since they import arktype
const { check, countOf } = await import("./check.ts")
const { checkers, emitDeclarations, sharedDeclarationFile } = await import(
	"./declare.ts"
)

// a host's options and a test's aside, and the CLI's own --declare
const options = Object.entries(cliOptions).filter(
	([name]) => name !== "inline" && name !== "declare" && name !== "defers"
)

const flagOf = (name: string) =>
	name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)

const here = dirname(fileURLToPath(import.meta.url))
const aotRoot = existsSync(join(here, "package.json")) ? here : dirname(here)
const aotVersion: string =
	(
		JSON.parse(readFileSync(join(aotRoot, "package.json"), "utf8")) as {
			version?: string
		}
	).version ?? "unknown"

const usage = `Usage: ark check [...files or globs] [--fail-under <percent>] [--json] ${options
	.map(([name, { type, values }]) =>
		type === "boolean" ?
			`[--[no-]${flagOf(name)}]`
		:	`[--${flagOf(name)} <${values}>]`
	)
	.join(
		" "
	)}\n       ark emit [--declare] [--tsconfig <path>] [...the options check takes]\n       ark declare [--tsconfig <path>] [--checker <${checkers.join("|")}>]`

const fail = (problem: string): never => {
	console.error(`${problem}\n${usage}`)
	process.exit(2)
}

// file errors (e.g. an unparseable package.json or ark.json) aren't usage errors
const failSettings = (e: unknown): never => {
	if (isFileError(e) || (e instanceof Error && "code" in e)) {
		console.error(e.message)
		process.exit(1)
	}
	return fail((e as Error).message)
}

const { values, positionals } = ((): {
	values: Record<string, string | boolean | undefined>
	positionals: string[]
} => {
	try {
		return parseArgs({
			allowPositionals: true,
			allowNegative: true,
			options: {
				help: { type: "boolean", short: "h" },
				version: { type: "boolean", short: "v" },
				check: { type: "boolean" },
				declare: { type: "boolean" },
				emit: { type: "boolean" },
				json: { type: "boolean" },
				"fail-under": { type: "string" },
				...Object.fromEntries(
					options.map(([name, { type }]) => [
						flagOf(name),
						{ type: type === "boolean" ? "boolean" : "string" } as const
					])
				)
			}
		})
	} catch (e) {
		return fail((e as Error).message)
	}
})()

if (values.help) {
	console.log(usage)
	process.exit(0)
}

if (values.version) {
	console.log(aotVersion)
	process.exit(0)
}

const writeFiles = (files: Record<string, string>) => {
	for (const path in files) {
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, files[path])
	}
}

const run = <result>(build: () => result): result => {
	try {
		return build()
	} catch (e) {
		// e.g. a config module that can't be read or a tsconfig that's missing,
		// which the message names
		if (!isBuildError(e)) throw e
		console.error(e.message)
		process.exit(1)
	}
}

const declare = (): never => {
	const checker = values.checker as string | undefined
	if (checker !== undefined && !checkers.includes(checker as Checker))
		fail(`--checker must be ${checkers.join(", ")} (was ${checker})`)
	// a flag over ark.json, as for the other modes
	const { tsconfig, checker: setChecker } = ((): DeclareOptions => {
		try {
			return withSettingsFile({
				tsconfig: values.tsconfig as string | undefined,
				checker: checker as Checker | undefined
			})
		} catch (e) {
			return failSettings(e)
		}
	})()
	const declarations = run(() =>
		emitDeclarations({ tsconfig, checker: setChecker })
	)
	writeFiles(declarations.files)
	if (declarations.diagnostics) console.error(declarations.diagnostics)
	console.log(
		`${Object.keys(declarations.files).length} declaration files in ${relative(process.cwd(), declarations.root) || "."}, with ${countOf(declarations.shapes, "shape")} in ${sharedDeclarationFile}`
	)
	process.exit(declarations.errors ? 1 : 0)
}

if (values.declare && !values.emit) {
	const others = Object.keys(values).filter(
		flag => flag !== "declare" && flag !== "tsconfig" && flag !== "checker"
	)
	if (others.length || positionals.length) {
		fail(
			`ark declare emits the tsconfig's program and takes no files or option but --tsconfig and --checker (was ${[...others.map(flag => `--${flag}`), ...positionals].join(" ")})`
		)
	}
	declare()
}

if (values.emit && (values.check || positionals.length)) {
	fail(
		"ark emit precompiles the tsconfig's program and takes no files or --check"
	)
}

if (values.emit && values.json) fail("ark emit does not take --json")

if (!values.check && !values.emit)
	fail("ark check, ark emit or ark declare is required")

const failUnder =
	values["fail-under"] === undefined ? undefined : Number(values["fail-under"])
if (Number.isNaN(failUnder))
	fail(`--fail-under must be a percentage (was ${values["fail-under"]})`)

const opts: Record<string, unknown> = {}
for (const [name, { type, values: taken }] of options) {
	const flag = flagOf(name)
	const value = values[flag]
	if (value === undefined) continue
	if (typeof value === "boolean") opts[name] = value
	else if (type === "array") opts[name] = value.split(",")
	else if (type === "number") {
		// read as its number, which the option's validator then checks
		const count = value.trim() === "" ? Number.NaN : Number(value)
		if (Number.isNaN(count)) fail(`--${flag} must be a number (was ${value})`)
		opts[name] = count
	} else if (type === "object") {
		try {
			opts[name] = JSON.parse(value)
		} catch {
			fail(`--${flag} must be JSON (was ${value})`)
		}
	} else {
		opts[name] =
			(
				(value === "true" || value === "false") &&
				taken.split("|").includes(value)
			) ?
				value === "true"
			:	value
	}
}

try {
	const set = withSettingsFile(opts)
	// check reads prune as the bundler does, but emit can't prune
	if (values.emit) refusePrune(set, "ark emit")
	resolvePrecompileOptions(set)
} catch (e) {
	failSettings(e)
}

if (values.emit) {
	const { emitPrecompiled } = await import("./emit.ts")
	const emitted = run(() => emitPrecompiled(opts as PrecompilePluginOptions))
	for (const warning of emitted.warnings) console.warn(warning)
	if (emitted.errors.length) {
		console.error(emitted.errors.join("\n"))
		process.exit(1)
	}
	writeFiles(emitted.files)
	const modules = Object.keys(emitted.files).filter(
		path => !path.endsWith(".map")
	)
	console.log(`${countOf(modules.length, "module")} precompiled`)
	if (values.declare) declare()
	process.exit(0)
}

const report = run(() => check(positionals, opts as PrecompilePluginOptions))

if (values.json) {
	console.log(
		JSON.stringify(
			{
				files: report.files,
				sites: report.sites,
				accepted: report.accepted,
				islands: report.islands,
				rate: report.rate,
				errors: report.errors,
				errorsOutsideSites: report.errorsOutsideSites,
				diagnostics: report.diagnostics
			},
			null,
			2
		)
	)
} else for (const line of report.lines) console.log(line)

// any error fails a build, unless --fail-under holds the project to a rate
if (
	failUnder === undefined ?
		report.errors
	:	report.rate < failUnder || report.errorsOutsideSites
)
	process.exit(1)
