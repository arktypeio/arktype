#!/usr/bin/env node
import { parseArgs } from "node:util"
import { check } from "./check.ts"

const usage =
	"Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] [--runtime arktype] [--config <file>] [--conditions <a,b>] [--tsconfig <file>] [--define <name>=<json>]"

const fail = (problem: string): never => {
	console.error(`${problem}\n${usage}`)
	process.exit(2)
}

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		check: { type: "boolean" },
		"fail-under": { type: "string" },
		runtime: { type: "string" },
		config: { type: "string" },
		conditions: { type: "string" },
		tsconfig: { type: "string" },
		define: { type: "string", multiple: true }
	}
})

if (!values.check) fail("--check is required")

const runtime = values.runtime
if (runtime !== undefined && runtime !== "arktype")
	fail(`--runtime must be arktype (was ${runtime})`)

const failUnder = Number(values["fail-under"] ?? 0)
if (Number.isNaN(failUnder))
	fail(`--fail-under must be a percentage (was ${values["fail-under"]})`)

const define: Record<string, unknown> = {}
for (const entry of values.define ?? []) {
	const separator = entry.indexOf("=")
	if (separator < 1) fail(`--define must be <name>=<json> (was ${entry})`)
	try {
		define[entry.slice(0, separator)] = JSON.parse(entry.slice(separator + 1))
	} catch {
		fail(`--define must be <name>=<json> (was ${entry})`)
	}
}

const report = check(positionals, {
	runtime: runtime as "arktype" | undefined,
	config: values.config,
	conditions: values.conditions?.split(","),
	tsconfig: values.tsconfig,
	define
})

for (const line of report.lines) console.log(line)

if (report.rate < failUnder) process.exit(1)
