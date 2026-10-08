import type { ESLint, Linter, Rule } from "eslint"
import { resolve, sep } from "node:path"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import { precompileModule, type PrecompileOptions } from "./precompile.ts"

export interface PrecompileRuleOptions
	extends PrecompileOptions,
		NodeHostOptions {}

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
					mode: { enum: ["standalone", "cache"] },
					config: { type: "string" },
					conditions: { type: "array", items: { type: "string" } },
					tsconfig: { type: "string" }
				},
				additionalProperties: false
			}
		]
	},
	create: context => ({
		"Program:exit": () => {
			const opts: PrecompileRuleOptions | undefined = context.options[0]
			const result = precompileModule(
				context.sourceCode.text,
				context.filename,
				createNodeHost(opts),
				{ ...opts, config: opts?.config && resolve(context.cwd, opts.config) }
			)
			for (const diagnostic of result.diagnostics) {
				if (diagnostic.file !== context.filename) continue
				context.report({
					loc: {
						start: context.sourceCode.getLocFromIndex(diagnostic.start),
						end: context.sourceCode.getLocFromIndex(diagnostic.end)
					},
					message: [diagnostic.message, ...diagnostic.reasons, diagnostic.hint]
						.join("\n")
						.split(`${context.cwd}${sep}`)
						.join("")
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
