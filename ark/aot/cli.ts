#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, relative } from "node:path"
import { parseArgs } from "node:util"
import { emitDeclarations, sharedDeclarationFile } from "./declare.ts"
import { isBuildError, writeNodeVersionMessage } from "./host.ts"
import type { PrecompilePluginOptions } from "./driver.ts"
import {
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { cliOptions } from "./settingsValidators.ts"

// before importing what reads fs.globSync, which older versions lack
const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 22 || (major === 22 && minor < 12)) {
	console.error(writeNodeVersionMessage("arktype-precompile", "22.12"))
	process.exit(1)
}

const { check, countOf } = await import("./check.ts")

// a host's options aside, and the CLI's own --declare
const options = Object.entries(cliOptions).filter(
	([name]) => name !== "inline" && name !== "declare"
)

const flagOf = (name: string) =>
	name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)

const usage = `Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] ${options
	.map(([name, { type, values }]) =>
		type === "boolean" ?
			`[--[no-]${flagOf(name)}]`
		:	`[--${flagOf(name)} <${values}>]`
	)
	.join(
		" "
	)}\n       arktype-precompile --emit [--declare] [--tsconfig <path>] [...the options --check takes]\n       arktype-precompile --declare [--tsconfig <path>]`

const fail = (problem: string): never => {
	console.error(`${problem}\n${usage}`)
	process.exit(2)
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
				check: { type: "boolean" },
				declare: { type: "boolean" },
				emit: { type: "boolean" },
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

const writeFiles = (files: Record<string, string>) => {
	for (const path in files) {
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, files[path])
	}
}

const declare = (): never => {
	const declarations = emitDeclarations({
		tsconfig: values.tsconfig as string | undefined
	})
	writeFiles(declarations.files)
	if (declarations.diagnostics) console.error(declarations.diagnostics)
	console.log(
		`${Object.keys(declarations.files).length} declaration files in ${relative(process.cwd(), declarations.root) || "."}, with ${countOf(declarations.shapes, "shape")} in ${sharedDeclarationFile}`
	)
	process.exit(declarations.errors ? 1 : 0)
}

if (values.declare && !values.emit) {
	const others = Object.keys(values).filter(
		flag => flag !== "declare" && flag !== "tsconfig"
	)
	if (others.length || positionals.length) {
		fail(
			`--declare emits the tsconfig's program and takes no files or option but --tsconfig (was ${[...others.map(flag => `--${flag}`), ...positionals].join(" ")})`
		)
	}
	declare()
}

if (values.emit && (values.check || positionals.length)) {
	fail(
		"--emit precompiles the tsconfig's program and takes no files or --check"
	)
}

if (!values.check && !values.emit)
	fail("--check, --emit or --declare is required")

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
	else if (type === "object") {
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
	// --check reads prune as the bundler does, but --emit can't prune
	if (values.emit) refusePrune(set, "arktype-precompile")
	resolvePrecompileOptions(set)
} catch (e) {
	fail((e as Error).message)
}

const run = <result>(build: () => result): result => {
	try {
		return build()
	} catch (e) {
		// e.g. a config module that can't be read, which the message names
		if (!isBuildError(e)) throw e
		console.error(e.message)
		process.exit(1)
	}
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

for (const line of report.lines) console.log(line)

// any error fails a build, unless --fail-under holds the project to a rate
if (
	failUnder === undefined ?
		report.errors
	:	report.rate < failUnder || report.errorsOutsideSites
)
	process.exit(1)
