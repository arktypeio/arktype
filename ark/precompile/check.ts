import { globSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import type { CheckedModule, PrecompilePluginOptions } from "./driver.ts"
import { renderDiagnostic } from "./precompile.ts"
import { createSyncPrecompiler } from "./worker.ts"

export interface CheckReport {
	lines: string[]
	sites: number
	accepted: number
	islands: number
	// the percentage of sites accepted, runtime islands aside
	rate: number
	// what fails a build whatever the rate, like a configure() it can't place
	errorsOutsideSites: number
	files: number
}

const defaultSources = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]

const ignoredDirs = /(^|\/)(node_modules|out|dist|build)\//

export const check = (
	patterns: string[],
	opts?: PrecompilePluginOptions
): CheckReport => {
	const cwd = opts?.cwd ?? process.cwd()
	const files = globSync(patterns.length ? patterns : defaultSources, {
		cwd,
		exclude: path => ignoredDirs.test(path) || path.endsWith(".d.ts")
	})
		.map(file => resolve(cwd, file))
		.sort()
	// a worker applies the configuration to arktype as the build does
	const request = createSyncPrecompiler({
		precompilerOptions: { ...opts, cwd }
	})
	const report: CheckReport = {
		lines: [],
		sites: 0,
		accepted: 0,
		islands: 0,
		rate: 100,
		errorsOutsideSites: 0,
		files: files.length
	}
	try {
		for (const file of files) {
			const result = request(
				"check",
				readFileSync(file, "utf8"),
				file
			) as CheckedModule
			const path = relative(cwd, file)
			const entries: [number, string][] = result.diagnostics.map(diagnostic => [
				diagnostic.start,
				renderDiagnostic({
					...diagnostic,
					file: relative(cwd, diagnostic.file)
				})
			])
			const rejected = result.sites.filter(site => site.status === "rejected")
			for (const diagnostic of result.diagnostics) {
				if (
					diagnostic.severity === "error" &&
					!rejected.some(
						site =>
							diagnostic.file === file &&
							diagnostic.start === site.start &&
							diagnostic.end === site.end
					)
				)
					report.errorsOutsideSites++
			}
			for (const site of result.sites) {
				report.sites++
				if (site.status === "rejected") continue
				if (site.status === "island") report.islands++
				else report.accepted++
				entries.push([
					site.start,
					`${path}:${site.line}:${site.column}  ${site.status}`
				])
			}
			entries.sort((l, r) => l[0] - r[0])
			for (const [, line] of entries) report.lines.push(line)
		}
	} finally {
		request("close")
	}
	const precompiled = report.sites - report.islands
	if (precompiled) report.rate = (100 * report.accepted) / precompiled
	const summary = [
		`${countOf(report.sites, "site")} in ${countOf(report.files, "file")}: ${report.accepted} accepted (${report.rate.toFixed(1)}%)`
	]
	if (report.islands) summary.push(countOf(report.islands, "runtime island"))
	if (report.errorsOutsideSites)
		summary.push(
			`${countOf(report.errorsOutsideSites, "error")} outside a site`
		)
	report.lines.push(summary.join(", "))
	return report
}

export const countOf = (n: number, noun: string): string =>
	`${n} ${noun}${n === 1 ? "" : "s"}`
