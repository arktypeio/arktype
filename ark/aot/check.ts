import { globSync, readFileSync, statSync } from "node:fs"
import { dirname, resolve, sep } from "node:path"
import type { CheckedModule, PrecompilePluginOptions } from "./driver.ts"
import { printablePathOf, transformedId } from "./host.ts"
import {
	pluginCallLinesOf,
	pluginCallsIn,
	withPluginCalls
} from "./pluginCalls.ts"
import { renderDiagnostic, type Diagnostic } from "./diagnostics.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"
import {
	scanProgramSync,
	writeUnprunedMessage,
	type ScannedProgram,
	type ScannedUsage
} from "./scan.ts"
import { withSettingsFile } from "./settings.ts"
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
	errors: number
	files: number
}

const defaultSources = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"]

// globSync tests a directory by its name and its path, and a file by its name
const ignoredDirs = /(^|[/\\])(node_modules|out|dist|build)([/\\]|$)/

const isExcluded = (path: string) =>
	ignoredDirs.test(path) || path.endsWith(".d.ts")

const scriptFile = /\.(?:[cm]?[jt]s|[jt]sx)$/

// a directory, as `src` or each of `src/**`, stands for the scripts it holds
const sourcesOf = (patterns: string[], cwd: string): string[] => {
	const files = new Set<string>()
	const dirs: string[] = []
	// a directory sorts before what it holds
	const matches = globSync(patterns, { cwd, exclude: isExcluded })
		.map(match => resolve(cwd, match))
		.sort()
	for (const path of matches) {
		if (!statSync(path).isDirectory()) {
			if (scriptFile.test(path)) files.add(path)
		} else if (!dirs.some(dir => path.startsWith(dir + sep))) dirs.push(path)
	}
	for (const dir of dirs) {
		for (const file of globSync(defaultSources, {
			cwd: dir,
			exclude: isExcluded
		}))
			files.add(resolve(dir, file))
	}
	return [...files].sort()
}

// a component may read a validator as only its framework's compiled code shows
const componentsOf = (cwd: string): string[] =>
	globSync("**/*.{svelte,vue,astro,mdx}", { cwd, exclude: isExcluded })
		.map(match => resolve(cwd, match))
		.filter(file => /\bimport\b/.test(readFileSync(file, "utf8")))
		.sort()

export const check = (
	patterns: string[],
	opts?: PrecompilePluginOptions
): CheckReport => {
	const cwd = opts?.cwd ?? process.cwd()
	const files = sourcesOf(patterns.length ? patterns : defaultSources, cwd)
	// what the build's own plugin call passes, as in vite.config.ts
	const calls = pluginCallsIn(cwd)
	const given = opts ?? {}
	const precompilerOptions = withEnvironment(
		withSettingsFile({ ...withPluginCalls(calls, given), cwd }),
		{
			production: isProductionEnv(),
			testing: false
		}
	)
	const request = createSyncPrecompiler({ precompilerOptions })
	const report: CheckReport = {
		lines: pluginCallLinesOf(calls, given),
		sites: 0,
		accepted: 0,
		islands: 0,
		rate: 100,
		errorsOutsideSites: 0,
		errors: 0,
		files: files.length
	}
	try {
		for (const file of files) {
			const result = request(
				"check",
				readFileSync(file, "utf8"),
				file
			) as CheckedModule
			reportModule(report, result, file, cwd)
		}
		// as a production build prunes
		const unpruned =
			isProductionEnv() &&
			precompilerOptions.prune !== false &&
			unprunedMessageOf(files, cwd, request)
		if (unpruned) report.lines.push(unpruned)
		if (
			precompilerOptions.runtime !== "arktype" &&
			!precompilerOptions.shadow
		) {
			const components = componentsOf(cwd)
			if (components.length) {
				report.lines.push(
					`${printablePathOf(cwd, components[0])}${components.length > 1 ? ` and ${countOf(components.length - 1, "other component")} aren't` : " isn't"} checked here, as the build checks a component once its framework compiles it`
				)
			}
		}
	} finally {
		request("close")
	}
	const precompiled = report.sites - report.islands
	if (precompiled) report.rate = (100 * report.accepted) / precompiled
	report.lines.push(summaryOf(report))
	return report
}

// a module's diagnostics and sites as lines in source order, tallied into the report
const reportModule = (
	report: CheckReport,
	result: CheckedModule,
	file: string,
	cwd: string
): void => {
	const path = printablePathOf(cwd, file)
	const entries: [number, string][] = result.diagnostics.map(diagnostic => [
		diagnostic.start,
		renderDiagnostic({
			...diagnostic,
			file: printablePathOf(cwd, diagnostic.file)
		})
	])
	const errors = result.diagnostics.filter(
		diagnostic => diagnostic.severity === "error"
	)
	const isAt = (error: Diagnostic, site: CheckedModule["sites"][number]) =>
		error.file === file && error.start === site.start && error.end === site.end
	// an accepted site can fail too, like one that throws a ParseError
	const failed = result.sites.filter(
		site =>
			site.status === "rejected" || errors.some(error => isAt(error, site))
	)
	report.errors += errors.length
	report.errorsOutsideSites += errors.filter(
		error => !failed.some(site => isAt(error, site))
	).length
	for (const site of result.sites) {
		report.sites++
		if (failed.includes(site)) continue
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

const summaryOf = (report: CheckReport): string => {
	const summary = [
		`${countOf(report.sites, "site")} in ${countOf(report.files, "file")}: ${report.accepted} accepted (${report.rate.toFixed(1)}%)`
	]
	if (report.islands) summary.push(countOf(report.islands, "runtime island"))
	if (report.errorsOutsideSites) {
		summary.push(
			`${countOf(report.errorsOutsideSites, "error")} outside a site`
		)
	}
	return summary.join(", ")
}

// a file a bundle doesn't hold, like a test, a story or a config
const unbundledFile =
	/(?:^|[/\\])__(?:tests|mocks)__[/\\]|\.(?:test|spec|bench|stories|config)\.[cm]?[jt]sx?$/

// as far as --check can tell: it follows relative imports of scripts alone and reads no entry
const unprunedMessageOf = (
	files: string[],
	cwd: string,
	request: (...request: ["scan", ScannedProgram]) => unknown
): string | undefined => {
	const bundled = files.filter(file => !unbundledFile.test(file))
	const scanned = scanProgramSync(
		"check",
		bundled.map(id => ({ id })),
		{
			resolve: (specifier, importer) => {
				if (!/^\.\.?\//.test(specifier)) return null
				const script = scriptOf(resolve(dirname(importer), specifier))
				return script && transformedId.test(script) ? script : null
			},
			readFile: file => readFileSync(file, "utf8"),
			isTransformed: () => true,
			idOf: file => file,
			cwd
		}
	)
	if (typeof scanned === "string") return writeUnprunedMessage(scanned)
	return (request("scan", { ...scanned, entries: [] }) as ScannedUsage).unpruned
}

const scriptOf = (path: string): string | undefined =>
	[
		path,
		path.replace(/\.([cm]?)js(x?)$/, ".$1ts$2"),
		...scriptExtensions.flatMap(extension => [
			path + extension,
			resolve(path, `index${extension}`)
		])
	].find(candidate => statSync(candidate, { throwIfNoEntry: false })?.isFile())

const scriptExtensions = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs"
]

export const countOf = (n: number, noun: string): string =>
	`${n} ${noun}${n === 1 ? "" : "s"}`
