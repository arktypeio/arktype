import { throwError } from "@ark/util"
import { resolve } from "node:path"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import {
	Precompiler,
	renderDiagnostic,
	standaloneConfigurationMessage,
	type Diagnostic,
	type PrecompileOptions
} from "./precompile.ts"

export interface PrecompilePluginOptions
	extends PrecompileOptions,
		NodeHostOptions {}

export const createPrecompiler = (
	opts?: PrecompilePluginOptions
): Precompiler => {
	if (opts?.runtime !== "arktype" && opts?.config)
		throwError(standaloneConfigurationMessage)
	const cwd = opts?.cwd ?? process.cwd()
	return new Precompiler(createNodeHost(opts), {
		...opts,
		cwd,
		config: opts?.config && resolve(cwd, opts.config)
	})
}

// thrown together, so a host that shows one error for a module shows each
export const reportDiagnostics = (
	diagnostics: Diagnostic[],
	warn: (message: string) => void
): void => {
	const errors: string[] = []
	for (const diagnostic of diagnostics) {
		if (diagnostic.severity === "error")
			errors.push(renderDiagnostic(diagnostic))
		else warn(renderDiagnostic(diagnostic))
	}
	if (errors.length) throwError(errors.join("\n"))
}
