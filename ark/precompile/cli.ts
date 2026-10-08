#!/usr/bin/env node
import { parseArgs } from "node:util"
import { check } from "./check.ts"

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

if (!values.check) {
	console.error(
		`Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] [--mode standalone|cache] [--config <file>] [--conditions <a,b>] [--tsconfig <file>] [--define <name>=<json>]`
	)
	process.exit(2)
}

const report = check(positionals, {
	mode: values.mode === "cache" ? "cache" : "standalone",
	config: values.config,
	conditions: values.conditions?.split(","),
	tsconfig: values.tsconfig,
	define: Object.fromEntries(
		(values.define ?? []).map(entry => {
			const separator = entry.indexOf("=")
			return [entry.slice(0, separator), JSON.parse(entry.slice(separator + 1))]
		})
	)
})

for (const line of report.lines) console.log(line)

const failUnder = Number(values["fail-under"] ?? 0)
if (report.sites && (100 * report.accepted) / report.sites < failUnder)
	process.exit(1)
