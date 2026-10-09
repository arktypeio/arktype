import { createHash } from "node:crypto"
import { createRequire } from "node:module"
import { join } from "node:path"
import type { KeyedModule, PrecompilePluginOptions } from "./driver.ts"
import { createSyncPrecompiler } from "./worker.ts"

export interface PrecompileJestOptions extends PrecompilePluginOptions {
	// a transformer to pass each precompiled module to, as jest's `transform` names one
	transformer?: string | [name: string, config: unknown] | undefined
}

export interface JestTransformOptions {
	configString: string
}

export interface JestTransformer {
	process(
		source: string,
		path: string,
		options: JestTransformOptions
	): { code: string }
	getCacheKey?(
		source: string,
		path: string,
		options: JestTransformOptions
	): string
}

interface JestPrecompilation {
	source: string
	code: string
	warnings: string[]
	key: string
}

export const createTransformer = (
	opts?: PrecompileJestOptions
): Required<JestTransformer> => {
	const [name, config] =
		typeof opts?.transformer === "string" ?
			[opts.transformer]
		:	(opts?.transformer ?? [])
	const loaded:
		| JestTransformer
		| { createTransformer(config: unknown): JestTransformer }
		| undefined =
		name &&
		createRequire(join(opts?.cwd ?? process.cwd(), "package.json"))(name)
	const next =
		loaded && "createTransformer" in loaded ?
			loaded.createTransformer(config)
		:	loaded
	// jest caches by file, so each module is keyed by the files in its forward closure
	const request = createSyncPrecompiler({
		precompilerOptions: opts ?? {},
		isKeyed: true
	})
	// what getCacheKey computed, for the call to process that follows it
	const precompilationsByPath: Record<string, JestPrecompilation> = {}
	const precompile = (
		source: string,
		path: string,
		options: JestTransformOptions
	): JestPrecompilation => {
		const {
			code = source,
			warnings,
			key
		} = request("transform", source, path) as KeyedModule
		return {
			source,
			code,
			warnings,
			key: createHash("sha256")
				.update(
					`${key}\0${JSON.stringify(opts)}\0${options.configString}\0${next?.getCacheKey?.(code, path, options)}`
				)
				.digest("hex")
		}
	}
	return {
		getCacheKey: (source, path, options) =>
			(precompilationsByPath[path] = precompile(source, path, options)).key,
		process: (source, path, options) => {
			const cached = precompilationsByPath[path]
			delete precompilationsByPath[path]
			const { code, warnings } =
				cached?.source === source ? cached : precompile(source, path, options)
			for (const warning of warnings) console.warn(warning)
			return next ? next.process(code, path, options) : { code }
		}
	}
}
