import type { ESLint, Linter, Rule, SourceCode } from "eslint"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { isAbsolute } from "node:path"
import type { Diagnostic } from "./diagnostics.ts"
import type { CheckedModule, PrecompilePluginOptions } from "./driver.ts"
import { realPathOf } from "./host.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"
import {
	resolvePrecompileOptions,
	settingsPathsOf,
	withSettingsFile
} from "./settings.ts"
import { precompileJsonSchema } from "./settingsValidators.ts"
import { createSyncPrecompiler } from "./worker.ts"

type LintPrecompiler = {
	request: ReturnType<typeof createSyncPrecompiler>
	// the settings files as they were when the thread read them
	settingsStamp: string
}

const maxPrecompilers = 4

// each configuration needs a thread of its own, apart from ESLint's, bounded
// as an LRU so long-running editor servers across config edits don't leak workers
const precompilersByOptions = new Map<string, LintPrecompiler>()

export const closePrecompilers = (): void => {
	for (const entry of precompilersByOptions.values()) closeQuietly(entry)
	precompilersByOptions.clear()
}

const closeQuietly = (entry: LintPrecompiler): void => {
	try {
		entry.request("close")
	} catch {
		// worker may already have stopped; avoid aborting the current lint pass
	}
}

const touchPrecompiler = (key: string, entry: LintPrecompiler): void => {
	precompilersByOptions.delete(key)
	precompilersByOptions.set(key, entry)
	while (precompilersByOptions.size > maxPrecompilers) {
		const oldest = precompilersByOptions.entries().next().value
		if (!oldest) break
		precompilersByOptions.delete(oldest[0])
		closeQuietly(oldest[1])
	}
}

// what each settings file holds, or that it is missing. A thread reads them
// once to set its options, and they aren't files it reads through the host, so
// nothing else tells it one has since changed or been removed. They're read by
// content, as an edit may keep a file's size and, on a filesystem with coarse
// timestamps, its mtime too.
const settingsStampOf = (cwd: string): string =>
	settingsPathsOf(cwd)
		.map(path => {
			try {
				return `${path}:${createHash("sha256").update(readFileSync(path)).digest("base64")}`
			} catch {
				return `${path}:missing`
			}
		})
		.join(",")

const settingsErrorModule = (id: string, error: unknown): CheckedModule => ({
	diagnostics: [
		{
			severity: "error",
			rule: "parse",
			file: id,
			start: 0,
			end: 0,
			line: 1,
			column: 1,
			message: error instanceof Error ? error.message : String(error),
			reasons: [],
			hint: undefined
		}
	],
	sites: [],
	schemaKeys: []
})

const check = (
	opts: PrecompilePluginOptions,
	source: string,
	id: string
): CheckedModule => {
	const key = JSON.stringify(opts)
	const settingsStamp = settingsStampOf(opts.cwd ?? process.cwd())
	const existing = precompilersByOptions.get(key)
	// a file read for an earlier lint may have changed the configuration, as may
	// ark.json or package.json
	let entry = existing
	if (entry) {
		let stale = entry.settingsStamp !== settingsStamp
		if (!stale) {
			try {
				stale = Boolean(entry.request("refresh"))
			} catch {
				stale = true
			}
		}
		if (stale) {
			precompilersByOptions.delete(key)
			closeQuietly(entry)
			entry = undefined
		}
	}
	if (!entry) {
		let precompilerOptions: PrecompilePluginOptions
		try {
			precompilerOptions = withEnvironment(withSettingsFile(opts), {
				production: isProductionEnv(),
				testing: false
			})
			resolvePrecompileOptions(precompilerOptions)
		} catch (e) {
			return settingsErrorModule(id, e)
		}
		entry = {
			request: createSyncPrecompiler({ precompilerOptions }),
			settingsStamp
		}
	}
	touchPrecompiler(key, entry)
	return (
		(entry.request("lint", source, id) as CheckedModule | undefined) ??
		check(opts, source, id)
	)
}

// both rules read one result for each file a lint run parses
const checkedBySource = new WeakMap<SourceCode, Record<string, CheckedModule>>()

const filenameOf = (filename: string): string =>
	isAbsolute(filename) ? realPathOf(filename) : filename

const checkOnce = (context: Rule.RuleContext): CheckedModule => {
	const { sourceCode } = context
	const opts = {
		...context.options[0],
		cwd: context.options[0]?.cwd ?? context.cwd
	}
	const key = JSON.stringify(opts)
	let checked = checkedBySource.get(sourceCode)
	if (!checked) checkedBySource.set(sourceCode, (checked = {}))
	return (checked[key] ??= check(
		opts,
		sourceCode.text,
		filenameOf(context.filename)
	))
}

const reporterOf = (
	severity: Diagnostic["severity"],
	description: string
): Rule.RuleModule => ({
	meta: {
		type: "problem",
		docs: { description },
		// written from what ark.json takes, so the rule takes every option it does
		schema: [precompileJsonSchema]
	},
	create: context => ({
		"Program:exit": () => {
			const result = checkOnce(context)
			const file = filenameOf(context.filename)
			for (const diagnostic of result.diagnostics) {
				if (diagnostic.file !== file || diagnostic.severity !== severity)
					continue
				context.report({
					loc: {
						start: context.sourceCode.getLocFromIndex(diagnostic.start),
						end: context.sourceCode.getLocFromIndex(diagnostic.end)
					},
					message: [
						diagnostic.message,
						...diagnostic.reasons,
						...(diagnostic.hint ? [diagnostic.hint] : [])
					].join("\n")
				})
			}
		}
	})
})

export const plugin: ESLint.Plugin = {
	meta: { name: "@ark/aot" },
	rules: {
		precompilable: reporterOf(
			"error",
			"Report what fails the build, like arktype definitions that cannot be precompiled, with the reasons why"
		),
		warnings: reporterOf(
			"warning",
			"Report what the build warns about, like a problem allowUnsafe builds past"
		)
	}
}

export const configs: Record<string, Linter.Config> = {
	recommended: {
		// ESLint lints only JavaScript unless a configuration names other files
		files: ["**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}"],
		plugins: { "@ark/aot": plugin },
		rules: {
			"@ark/aot/precompilable": "error",
			"@ark/aot/warnings": "warn"
		}
	}
}
