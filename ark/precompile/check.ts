import { globSync, readFileSync } from "node:fs"
import { relative, resolve } from "node:path"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import {
	Precompiler,
	renderDiagnostic,
	type PrecompileOptions
} from "./precompile.ts"

export interface CheckOptions extends PrecompileOptions, NodeHostOptions {}

export interface CheckReport {
	lines: string[]
	sites: number
	accepted: number
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
	const precompiler = new Precompiler(createNodeHost(opts), {
		...opts,
		cwd,
		config: opts?.config && resolve(cwd, opts.config)
	})
	const report: CheckReport = {
		lines: [],
		sites: 0,
		accepted: 0,
		files: files.length
	}
	for (const file of files) {
		const result = precompiler.analyze(readFileSync(file, "utf8"), file)
		const path = relative(cwd, file)
		const entries: [number, string][] = result.diagnostics.map(diagnostic => [
			diagnostic.start,
			renderDiagnostic({ ...diagnostic, file: relative(cwd, diagnostic.file) })
		])
		for (const site of result.sites) {
			report.sites++
			if (site.status === "rejected") continue
			report.accepted++
			entries.push([
				site.start,
				`${path}:${site.line}:${site.column}  accepted`
			])
		}
		entries.sort((l, r) => l[0] - r[0])
		for (const [, line] of entries) report.lines.push(line)
	}
	const rate = report.sites ? (100 * report.accepted) / report.sites : 100
	report.lines.push(
		`${report.sites} ${report.sites === 1 ? "site" : "sites"} in ${report.files} ${report.files === 1 ? "file" : "files"}: ${report.accepted} accepted (${rate.toFixed(1)}%)`
	)
	return report
}
