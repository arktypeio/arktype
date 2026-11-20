import type { ESLint, Linter, Rule, SourceCode } from "eslint"
import { statSync } from "node:fs"
import type { Diagnostic } from "./diagnostics.ts"
import type { CheckedModule, PrecompilePluginOptions } from "./driver.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"
import { settingsPathsOf, withSettingsFile } from "./settings.ts"
import { precompileJsonSchema } from "./settingsValidators.ts"
import { createSyncPrecompiler } from "./worker.ts"

type LintPrecompiler = {
	request: ReturnType<typeof createSyncPrecompiler>
	// the settings files as they were when the thread read them
	settingsStamp: string
}

// each configuration needs a thread of its own, apart from ESLint's
const precompilersByOptions: Record<string, LintPrecompiler> = {}

// where each settings file was last written, or that it is missing. A thread
// reads them once to set its options, and they aren't files it reads through
// the host, so nothing else tells it one has since changed or been removed.
const settingsStampOf = (cwd: string): string =>
	settingsPathsOf(cwd)
		.map(path => {
			try {
				const { mtimeMs, size } = statSync(path)
				return `${mtimeMs}:${size}`
			} catch {
				return "missing"
			}
		})
		.join(",")

const check = (
	opts: PrecompilePluginOptions,
	source: string,
	id: string
): CheckedModule => {
	const key = JSON.stringify(opts)
	const settingsStamp = settingsStampOf(opts.cwd ?? process.cwd())
	const existing = precompilersByOptions[key]
	// a file read for an earlier lint may have changed the configuration, as may
	// ark.json or package.json
	if (
		existing &&
		(existing.settingsStamp !== settingsStamp || existing.request("refresh"))
	) {
		existing.request("close")
		delete precompilersByOptions[key]
	}
	const { request } = (precompilersByOptions[key] ??= {
		request: createSyncPrecompiler({
			precompilerOptions: withEnvironment(withSettingsFile(opts), {
				production: isProductionEnv(),
				testing: false
			})
		}),
		settingsStamp
	})
	return (
		(request("lint", source, id) as CheckedModule | undefined) ??
		check(opts, source, id)
	)
}

// both rules read one result for each file a lint run parses
const checkedBySource = new WeakMap<SourceCode, Record<string, CheckedModule>>()

const checkOnce = (context: Rule.RuleContext): CheckedModule => {
	const { sourceCode } = context
	const opts = { ...context.options[0], cwd: context.cwd }
	const key = JSON.stringify(opts)
	let checked = checkedBySource.get(sourceCode)
	if (!checked) checkedBySource.set(sourceCode, (checked = {}))
	return (checked[key] ??= check(opts, sourceCode.text, context.filename))
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
			for (const diagnostic of result.diagnostics) {
				if (
					diagnostic.file !== context.filename ||
					diagnostic.severity !== severity
				)
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
