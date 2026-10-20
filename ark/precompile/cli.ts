#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, relative } from "node:path"
import { parseArgs } from "node:util"
import { emitDeclarations, sharedDeclarationFile } from "./declare.ts"
import { isBuildError, writeNodeVersionMessage } from "./host.ts"
import type { PrecompilePluginOptions } from "./driver.ts"
import {
	assertPrecompileOptions,
	type PrecompileOptions
} from "./precompile.ts"

// before importing what reads fs.globSync, which older versions lack
const [major, minor] = process.versions.node.split(".").map(Number)
if (major < 22 || (major === 22 && minor < 12)) {
	console.error(writeNodeVersionMessage("arktype-precompile", "22.12"))
	process.exit(1)
}

const { check, countOf } = await import("./check.ts")

const usage =
	"Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] [--runtime arktype] [--config <file> | --no-config] [--members <json>] [--checks <types|helpers|none>] [--mutates-input <false|true|always>] [--errors <all|first|none>] [--conditions <a,b>] [--tsconfig <file>] [--allow-unsafe]\n       arktype-precompile --declare [--tsconfig <file>]"

const fail = (problem: string): never => {
	console.error(`${problem}\n${usage}`)
	process.exit(2)
}

const { values, positionals } = (() => {
	try {
		return parseArgs({
			allowPositionals: true,
			options: {
				help: { type: "boolean", short: "h" },
				check: { type: "boolean" },
				declare: { type: "boolean" },
				"fail-under": { type: "string" },
				runtime: { type: "string" },
				config: { type: "string" },
				"no-config": { type: "boolean" },
				members: { type: "string" },
				checks: { type: "string" },
				"mutates-input": { type: "string" },
				errors: { type: "string" },
				conditions: { type: "string" },
				tsconfig: { type: "string" },
				"allow-unsafe": { type: "boolean" }
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

if (values.declare) {
	if (values.check || positionals.length) {
		fail(
			"--declare emits the tsconfig's program and takes no other mode or files"
		)
	}
	const declarations = emitDeclarations({ tsconfig: values.tsconfig })
	for (const path in declarations.files) {
		mkdirSync(dirname(path), { recursive: true })
		writeFileSync(path, declarations.files[path])
	}
	if (declarations.diagnostics) console.error(declarations.diagnostics)
	console.log(
		`${Object.keys(declarations.files).length} declaration files in ${relative(process.cwd(), declarations.root) || "."}, with ${countOf(declarations.shapes, "shape")} in ${sharedDeclarationFile}`
	)
	process.exit(declarations.errors ? 1 : 0)
}

if (!values.check) fail("--check or --declare is required")

const runtime = values.runtime
if (runtime !== undefined && runtime !== "arktype")
	fail(`--runtime must be arktype (was ${runtime})`)

const failUnder =
	values["fail-under"] === undefined ? undefined : Number(values["fail-under"])
if (Number.isNaN(failUnder))
	fail(`--fail-under must be a percentage (was ${values["fail-under"]})`)

if (values.config !== undefined && values["no-config"]) {
	fail(
		"--config names the module calling configure(), which --no-config says none does"
	)
}

let members: PrecompileOptions["members"]
if (values.members !== undefined) {
	try {
		members = JSON.parse(values.members)
	} catch {
		fail(`--members must be JSON (was ${values.members})`)
	}
}

const mutatesInput = values["mutates-input"]

const opts: PrecompilePluginOptions = {
	runtime: runtime as "arktype" | undefined,
	config: values["no-config"] ? false : values.config,
	members,
	checks: values.checks as PrecompileOptions["checks"],
	mutatesInput: (mutatesInput === "true" ? true
	: mutatesInput === "false" ? false
	: mutatesInput) as PrecompileOptions["mutatesInput"],
	errors: values.errors as PrecompileOptions["errors"],
	conditions: values.conditions?.split(","),
	tsconfig: values.tsconfig,
	allowUnsafe: values["allow-unsafe"]
}

try {
	assertPrecompileOptions(opts)
} catch (e) {
	fail((e as Error).message)
}

const report = (() => {
	try {
		return check(positionals, opts)
	} catch (e) {
		// e.g. a config module that can't be read, which the message names
		if (!isBuildError(e)) throw e
		console.error(e.message)
		process.exit(1)
	}
})()

for (const line of report.lines) console.log(line)

if (
	failUnder !== undefined &&
	(report.rate < failUnder || report.errorsOutsideSites)
)
	process.exit(1)
