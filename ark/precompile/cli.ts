#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, relative } from "node:path"
import { parseArgs } from "node:util"
import { check } from "./check.ts"
import { emitDeclarations, sharedDeclarationFile } from "./declare.ts"
import type { PrecompileOptions } from "./precompile.ts"

const usage =
	"Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] [--runtime arktype] [--config <file> | --no-config] [--members <json>] [--checks <types|helpers|none>] [--conditions <a,b>] [--tsconfig <file>]\n       arktype-precompile --declare [--tsconfig <file>]"

const fail = (problem: string): never => {
	console.error(`${problem}\n${usage}`)
	process.exit(2)
}

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		check: { type: "boolean" },
		declare: { type: "boolean" },
		"fail-under": { type: "string" },
		runtime: { type: "string" },
		config: { type: "string" },
		"no-config": { type: "boolean" },
		members: { type: "string" },
		checks: { type: "string" },
		conditions: { type: "string" },
		tsconfig: { type: "string" }
	}
})

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
		`${Object.keys(declarations.files).length} declaration files in ${relative(process.cwd(), declarations.root) || "."}, with ${declarations.shapes} ${declarations.shapes === 1 ? "shape" : "shapes"} in ${sharedDeclarationFile}`
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

const report = check(positionals, {
	runtime: runtime as "arktype" | undefined,
	config: values["no-config"] ? false : values.config,
	members,
	checks: values.checks as PrecompileOptions["checks"],
	conditions: values.conditions?.split(","),
	tsconfig: values.tsconfig
})

for (const line of report.lines) console.log(line)

if (
	failUnder !== undefined &&
	(report.rate < failUnder || report.errorsOutsideSites)
)
	process.exit(1)
