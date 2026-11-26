import { throwError } from "arktype/util"
import { existsSync, globSync, readFileSync, statSync } from "node:fs"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import type {
	CheckedModule,
	PrecompilePluginOptions,
	RenderedDiagnostics
} from "./driver.ts"
import {
	optedInPackagesOf,
	printablePathOf,
	realPathOf,
	scriptExtensions,
	transformedId
} from "./host.ts"
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
import { SchemaStrategies } from "./strategies.ts"
import { createSyncPrecompiler } from "./worker.ts"

export interface CheckDiagnostic {
	severity: Diagnostic["severity"]
	rule?: Diagnostic["rule"]
	file?: string
	line?: number
	column?: number
	start?: number
	end?: number
	message: string
	reasons?: string[]
	hint?: string
}

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
	diagnostics: CheckDiagnostic[]
}

const nameASource =
	"Name a script, a directory holding scripts or a glob that matches some."

// each of patterns matched nothing
export const writeNoSourcesMessage = (
	patterns: string[],
	cwd: string
): string =>
	`ark check was given ${patterns.join(", ")}, which ${patterns.length === 1 ? "matches" : "match"} no script in ${cwd}. ${nameASource}`

// each of patterns holds scripts, but only in directories it skips
export const writeSkippedSourcesMessage = (patterns: string[]): string =>
	`ark check was given ${patterns.join(", ")}, which ${patterns.length === 1 ? "holds" : "hold"} scripts only in directories it skips (node_modules, out, dist and build) or as declaration files. ${nameASource}`

export const writeMissingTsconfigMessage = (tsconfig: string): string =>
	`The tsconfig ${tsconfig} can't be read. Name the tsconfig your build uses as --tsconfig, or remove it to check without one.`

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

const isInNodeModules = (path: string) =>
	/(^|[/\\])node_modules([/\\]|$)/.test(path)

// whether a pattern matches scripts only where sourcesOf skips them, which
// isn't a typo
const holdsSkippedSources = (pattern: string, cwd: string): boolean => {
	const exclude = isInNodeModules(pattern) ? undefined : isInNodeModules
	return globSync(pattern, { cwd, exclude }).some(match => {
		const path = resolve(cwd, match)
		return statSync(path).isDirectory() ?
				globSync(defaultSources, {
					cwd: path,
					exclude
				}).length > 0
			:	scriptFile.test(path)
	})
}

// the scripts each pattern names, failing those that name none
const requiredSourcesOf = (patterns: string[], cwd: string): string[] => {
	const files = new Set<string>()
	const unmatched: string[] = []
	const skipped: string[] = []
	for (const pattern of patterns) {
		const found = sourcesOf([pattern], cwd)
		if (found.length) for (const file of found) files.add(file)
		else if (holdsSkippedSources(pattern, cwd)) skipped.push(pattern)
		else unmatched.push(pattern)
	}
	// a path or glob that holds nothing is a typo, which no rate would reveal
	if (unmatched.length || skipped.length) {
		throwError(
			[
				unmatched.length && writeNoSourcesMessage(unmatched, cwd),
				skipped.length && writeSkippedSourcesMessage(skipped)
			]
				.filter(Boolean)
				.join("\n")
		)
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
	const files =
		patterns.length ?
			requiredSourcesOf(patterns, cwd)
		:	sourcesOf(defaultSources, cwd)
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
	// one it can't find would otherwise check as though the project had none
	if (
		precompilerOptions.tsconfig &&
		!existsSync(resolve(cwd, precompilerOptions.tsconfig))
	) {
		throwError(
			writeMissingTsconfigMessage(resolve(cwd, precompilerOptions.tsconfig))
		)
	}
	const request = createSyncPrecompiler({ precompilerOptions })
	const report: CheckReport = {
		lines: pluginCallLinesOf(calls, given),
		sites: 0,
		accepted: 0,
		islands: 0,
		rate: 100,
		errorsOutsideSites: 0,
		errors: 0,
		files: files.length,
		diagnostics: []
	}
	// each key of schemas that chose for a definition of some file
	const choosing = new Set<string>()
	// a script outside cwd the build transforms as one checked here imports it,
	// like a workspace package's source, whose refusals fail the build too
	const packages = optedInPackagesOf(
		cwd,
		precompilerOptions.dependencies,
		() => {}
	)
	const root = realPathOf(cwd)
	const isOutside = (file: string) => {
		const path = relative(root, file)
		return path.startsWith("..") || isAbsolute(path)
	}
	const reached = new Set<string>()
	try {
		for (let batch = files; batch.length; ) {
			for (const file of batch) {
				const result = request(
					"check",
					readFileSync(file, "utf8"),
					file
				) as CheckedModule
				reportModule(report, result, file, cwd)
				for (const key of result.schemaKeys) choosing.add(key)
			}
			batch = (
				request("transformedImports", batch, packages) as string[]
			).filter(file => isOutside(file) && !reached.has(file))
			for (const file of batch) reached.add(file)
			files.push(...batch)
		}
		report.files = files.length
		// a key every file of which was checked, and none found to define a Type
		if (precompilerOptions.runtime !== "arktype") {
			const definitionless = new SchemaStrategies(
				precompilerOptions,
				"speed",
				realPathOf(cwd)
			).definitionlessIn(new Set(files.map(realPathOf)), choosing)
			report.lines.push(...definitionless)
			for (const message of definitionless)
				report.diagnostics.push({ severity: "error", message })
			report.errors += definitionless.length
			report.errorsOutsideSites += definitionless.length
		}
		// as a build reads each dependency importing arktype
		const { errors, warnings } = request(
			"readDependencies",
			files
		) as RenderedDiagnostics
		report.lines.push(...errors, ...warnings)
		for (const message of errors)
			report.diagnostics.push({ severity: "error", message })
		for (const message of warnings)
			report.diagnostics.push({ severity: "warning", message })
		report.errors += errors.length
		report.errorsOutsideSites += errors.length
		// as a production build prunes
		const unpruned =
			isProductionEnv() &&
			precompilerOptions.prune !== false &&
			unprunedMessageOf(files, cwd, request)
		if (unpruned) {
			report.lines.push(unpruned)
			report.diagnostics.push({ severity: "warning", message: unpruned })
		}
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
	const sortedDiagnostics = [...result.diagnostics].sort(
		(l, r) => l.start - r.start
	)
	for (const diagnostic of sortedDiagnostics) {
		report.diagnostics.push({
			severity: diagnostic.severity,
			rule: diagnostic.rule,
			file: printablePathOf(cwd, diagnostic.file),
			line: diagnostic.line,
			column: diagnostic.column,
			start: diagnostic.start,
			end: diagnostic.end,
			message: diagnostic.message,
			reasons: diagnostic.reasons,
			...(diagnostic.hint !== undefined && { hint: diagnostic.hint })
		})
	}
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
			`${path}:${site.line}:${site.column}  ${site.status}${site.strategy === undefined ? "" : `  ${site.strategy}`}`
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

export const countOf = (n: number, noun: string): string =>
	`${n} ${noun}${n === 1 ? "" : "s"}`
