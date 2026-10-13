#!/usr/bin/env node
import { parseArgs } from "node:util"
import { check } from "./check.ts"

const usage =
	"Usage: arktype-precompile --check [...files or globs] [--fail-under <percent>] [--runtime arktype] [--config <file>] [--conditions <a,b>] [--tsconfig <file>]"

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
		tsconfig: { type: "string" }
	}
})

if (!values.check) fail("--check is required")

const runtime = values.runtime
if (runtime !== undefined && runtime !== "arktype")
	fail(`--runtime must be arktype (was ${runtime})`)

const failUnder =
	values["fail-under"] === undefined ? undefined : Number(values["fail-under"])
if (Number.isNaN(failUnder))
	fail(`--fail-under must be a percentage (was ${values["fail-under"]})`)

const report = check(positionals, {
	runtime: runtime as "arktype" | undefined,
	config: values.config,
	conditions: values.conditions?.split(","),
	tsconfig: values.tsconfig
})

for (const line of report.lines) console.log(line)

if (
	failUnder !== undefined &&
	(report.rate < failUnder || report.errorsOutsideSites)
)
	process.exit(1)
