import { realpathSync } from "node:fs"
import { dirname, relative } from "node:path"
import {
	createKeyedPrecompiler,
	type KeyedModule,
	type PrecompilePluginOptions
} from "./driver.ts"
import { refuseDeclare } from "./declare.ts"
import {
	createNodeHost,
	reportDiagnostics,
	resolvesToRuntime,
	runtimeSpecifiers
} from "./host.ts"

export interface TurbopackLoaderContext {
	resourcePath: string
	getOptions(): PrecompilePluginOptions
	addDependency(file: string): void
	emitWarning(warning: Error): void
	// absent where a host can't resolve as Turbopack does
	getResolve?(): (context: string, request: string) => Promise<string>
	async?(): (error: Error | null, result?: string) => void
}

const precompilersByOptions: Record<
	string,
	(source: string, id: string) => KeyedModule
> = {}

// a webpack loader, called with its context as `this`
export default function (
	this: TurbopackLoaderContext,
	source: string
): string | undefined {
	const opts = this.getOptions()
	refuseDeclare(opts, "Turbopack")
	const precompile = (precompilersByOptions[JSON.stringify(opts)] ??=
		createKeyedPrecompiler(opts))
	const keyed = precompile(source, this.resourcePath)
	// before any error, so a fix to one of them reruns the loader
	for (const file of keyed.files)
		if (file !== this.resourcePath) this.addDependency(file)
	reportDiagnostics(keyed, warning => this.emitWarning(new Error(warning)))
	const code = keyed.code ?? source
	const specifiers = runtimeSpecifiers.filter(specifier =>
		new RegExp(`["']${specifier}["']`).test(source)
	)
	if (!specifiers.length || !this.getResolve || !this.async) return code
	const done = this.async()
	checkAliases(this.getResolve(), this.resourcePath, specifiers, opts).then(
		() => done(null, code),
		done
	)
}

// Turbopack resolves arktype as `resolveAlias` says, which the loader can't change
const checkAliases = async (
	resolve: (context: string, request: string) => Promise<string>,
	importer: string,
	specifiers: string[],
	opts: PrecompilePluginOptions
) => {
	const host = createNodeHost(opts)
	const runtime = host.resolve("arktype/runtime", importer)
	if (!runtime) return
	for (const specifier of specifiers) {
		const resolved = await resolve(dirname(importer), specifier)
		const isRuntime = realpathSync(resolved) === realpathSync(runtime)
		if (isRuntime !== resolvesToRuntime(specifier, opts)) {
			throw new Error(
				writeAliasMessage(
					specifier,
					isRuntime ? undefined : relative(opts.cwd ?? process.cwd(), resolved),
					opts
				)
			)
		}
	}
}

// `resolved` is where it resolves other than to arktype/runtime
export const writeAliasMessage = (
	specifier: string,
	resolved: string | undefined,
	opts: PrecompilePluginOptions | undefined
): string =>
	resolved === undefined ?
		`${specifier} resolves to arktype/runtime, where defining a Type throws. Remove its turbopack.resolveAlias, which ${opts?.shadow ? "shadow mode" : 'runtime: "arktype"'} doesn't use.`
	:	`${specifier} resolves to ${resolved} rather than arktype/runtime, where a standalone build's validators run. Add to turbopack.resolveAlias: ${JSON.stringify(
			Object.fromEntries(
				runtimeSpecifiers
					.filter(s => resolvesToRuntime(s, opts))
					.map(s => [s, "arktype/runtime"])
			)
		)}`
