#!/usr/bin/env node
import { parseArgs } from "node:util"
import { check } from "./check.ts"

const usage =
	"Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] [--mode standalone|cache] [--config <file>] [--conditions <a,b>] [--tsconfig <file>] [--define <name>=<json>]"

const fail = (problem: string): never => {
	console.error(`${problem}\n${usage}`)
	process.exit(2)
}

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		check: { type: "boolean" },
		"fail-under": { type: "string" },
		mode: { type: "string" },
		config: { type: "string" },
		conditions: { type: "string" },
		tsconfig: { type: "string" },
		define: { type: "string", multiple: true }
	}
})

if (!values.check) fail("--check is required")

const mode = values.mode ?? "standalone"
if (mode !== "standalone" && mode !== "cache")
	fail(`--mode must be standalone or cache (was ${mode})`)

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
	mode: mode as "standalone" | "cache",
	config: values.config,
	conditions: values.conditions?.split(","),
	tsconfig: values.tsconfig,
	define
})

for (const line of report.lines) console.log(line)

if (report.sites && (100 * report.accepted) / report.sites < failUnder)
	process.exit(1)
