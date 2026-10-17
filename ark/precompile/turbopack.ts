import {
	createKeyedPrecompiler,
	type KeyedModule,
	type PrecompilePluginOptions
} from "./driver.ts"
import { refuseDeclare } from "./declare.ts"
import { reportDiagnostics } from "./host.ts"

export interface TurbopackLoaderContext {
	resourcePath: string
	getOptions(): PrecompilePluginOptions
	addDependency(file: string): void
	emitWarning(warning: Error): void
}

const precompilersByOptions: Record<
	string,
	(source: string, id: string) => KeyedModule
> = {}

// a webpack loader is its module's default export, called with its context as `this`
export default function (this: TurbopackLoaderContext, source: string): string {
	const opts = this.getOptions()
	refuseDeclare(opts, "Turbopack")
	const precompile = (precompilersByOptions[JSON.stringify(opts)] ??=
		createKeyedPrecompiler(opts))
	const keyed = precompile(source, this.resourcePath)
	// before any error, so a fix to one of them reruns the loader
	for (const file of keyed.files)
		if (file !== this.resourcePath) this.addDependency(file)
	reportDiagnostics(keyed, warning => this.emitWarning(new Error(warning)))
	return keyed.code ?? source
}
