import { throwError } from "@ark/util"
import {
	createKeyedPrecompiler,
	type KeyedModule,
	type PrecompilePluginOptions
} from "./driver.ts"

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
	const precompile = (precompilersByOptions[JSON.stringify(opts)] ??=
		createKeyedPrecompiler(opts))
	const { code, errors, warnings, files } = precompile(
		source,
		this.resourcePath
	)
	// Turbopack reruns a loader only when a file it reported changes, so they're reported before an error
	for (const file of files)
		if (file !== this.resourcePath) this.addDependency(file)
	for (const warning of warnings) this.emitWarning(new Error(warning))
	if (errors.length) throwError(errors.join("\n"))
	return code ?? source
}
