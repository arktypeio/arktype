import type { ESLint, Linter, Rule } from "eslint"
import type { CheckedModule } from "./driver.ts"
import type { NodeHostOptions } from "./host.ts"
import type { PrecompileOptions } from "./precompile.ts"
import { createSyncPrecompiler } from "./worker.ts"

export interface PrecompileRuleOptions
	extends PrecompileOptions,
		NodeHostOptions {}

// arktype in ESLint's thread can't take a configuration, and each configuration needs a thread of its own
const precompilersByOptions = new Map<
	string,
	ReturnType<typeof createSyncPrecompiler>
>()

const check = (
	opts: PrecompileRuleOptions,
	source: string,
	id: string
): CheckedModule => {
	const key = JSON.stringify(opts)
	let request = precompilersByOptions.get(key)
	// a file read for an earlier one may have changed since, and the worker keeps the configuration it applied first
	if (request?.("refresh")) {
		request("close")
		request = undefined
	}
	if (!request) {
		request = createSyncPrecompiler({ precompilerOptions: opts })
		precompilersByOptions.set(key, request)
	}
	return (
		(request("lint", source, id) as CheckedModule | undefined) ??
		check(opts, source, id)
	)
}

const precompilable: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Report arktype definitions that cannot be precompiled, with the reasons why"
		},
		schema: [
			{
				type: "object",
				properties: {
					runtime: { enum: ["arktype"] },
					config: { type: "string" },
					define: { type: "object" },
					conditions: { type: "array", items: { type: "string" } },
					tsconfig: { type: "string" }
				},
				additionalProperties: false
			}
		]
	},
	create: context => ({
		"Program:exit": () => {
			const result = check(
				{ ...context.options[0], cwd: context.cwd },
				context.sourceCode.text,
				context.filename
			)
			for (const diagnostic of result.diagnostics) {
				if (diagnostic.file !== context.filename) continue
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
}

export const plugin: ESLint.Plugin = {
	meta: { name: "@ark/precompile" },
	rules: { precompilable }
}

export const configs: Record<string, Linter.Config> = {
	recommended: {
		plugins: { "@ark/precompile": plugin },
		rules: { "@ark/precompile/precompilable": "warn" }
	}
}
