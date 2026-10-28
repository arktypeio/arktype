import type { ESLint, Linter, Rule, SourceCode } from "eslint"
import type { CheckedModule, PrecompilePluginOptions } from "./driver.ts"
import type { Diagnostic } from "./precompile.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"
import { withSettingsFile } from "./settings.ts"
import { createSyncPrecompiler } from "./worker.ts"

// each configuration needs a thread of its own, apart from ESLint's
const precompilersByOptions: Record<
	string,
	ReturnType<typeof createSyncPrecompiler>
> = {}

const check = (
	opts: PrecompilePluginOptions,
	source: string,
	id: string
): CheckedModule => {
	const key = JSON.stringify(opts)
	// a file read for an earlier lint may have changed the configuration
	if (precompilersByOptions[key]?.("refresh")) {
		precompilersByOptions[key]("close")
		delete precompilersByOptions[key]
	}
	const request = (precompilersByOptions[key] ??= createSyncPrecompiler({
		precompilerOptions: withEnvironment(withSettingsFile(opts), {
			production: isProductionEnv(),
			testing: false
		})
	}))
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
		schema: [
			{
				type: "object",
				properties: {
					preset: { enum: ["smallest", "introspectable"] },
					runtime: { enum: ["arktype"] },
					config: { anyOf: [{ type: "string" }, { const: false }] },
					members: {
						type: "object",
						properties: {
							assert: { type: "boolean" },
							meta: { type: "boolean" },
							"~standard": { type: "boolean" },
							methods: { type: "boolean" },
							expression: { type: "boolean" },
							description: { type: "boolean" },
							json: { type: "boolean" },
							toJSON: { type: "boolean" },
							toJsonSchema: { type: "boolean" },
							"~standard.jsonSchema": { type: "boolean" }
						},
						additionalProperties: false
					},
					creationChecks: { enum: ["types", "helpers", "none"] },
					errors: { enum: ["all", "first", "none"] },
					conditions: { type: "array", items: { type: "string" } },
					tsconfig: { type: "string" },
					freeze: { type: "boolean" },
					lazy: { type: "boolean" },
					mutatesInput: { enum: [false, true, "always"] },
					optimize: { enum: ["speed", "size"] },
					optimizeErrors: { enum: ["speed", "size"] },
					jsonInput: { type: "boolean" },
					bakedLimit: { type: "integer", minimum: 1 },
					shadow: { type: "boolean" },
					prune: { type: "boolean" },
					allowUnsafe: { type: "boolean" }
				},
				additionalProperties: false
			}
		]
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
