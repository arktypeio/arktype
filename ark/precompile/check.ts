import { globSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import type { CheckedModule } from "./driver.ts"
import type { NodeHostOptions } from "./host.ts"
import { renderDiagnostic, type PrecompileOptions } from "./precompile.ts"
import { createSyncPrecompiler } from "./worker.ts"

export interface CheckOptions extends PrecompileOptions, NodeHostOptions {}

export interface CheckReport {
	lines: string[]
	sites: number
	accepted: number
	islands: number
	// the percentage of sites accepted, of those not left to arktype as runtime islands
	rate: number
	files: number
}

const defaultSources = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]

const ignoredDirs = /(^|\/)(node_modules|out|dist|build)\//

export const check = (patterns: string[], opts?: CheckOptions): CheckReport => {
	const cwd = opts?.cwd ?? process.cwd()
	const files = globSync(patterns.length ? patterns : defaultSources, {
		cwd,
		exclude: path => ignoredDirs.test(path) || path.endsWith(".d.ts")
	})
		.map(file => resolve(cwd, file))
		.sort()
	// a worker applies the configuration to arktype as the build does, which the caller's thread can't
	const request = createSyncPrecompiler({
		precompilerOptions: { ...opts, cwd }
	})
	const report: CheckReport = {
		lines: [],
		sites: 0,
		accepted: 0,
		islands: 0,
		rate: 100,
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
	report.lines.push(
		`${report.sites} ${report.sites === 1 ? "site" : "sites"} in ${report.files} ${report.files === 1 ? "file" : "files"}: ${report.accepted} accepted (${report.rate.toFixed(1)}%)${report.islands ? `, ${report.islands} ${report.islands === 1 ? "runtime island" : "runtime islands"}` : ""}`
	)
	return report
}
