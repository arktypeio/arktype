import {
	precompileModule,
	renderDiagnostic,
	type PrecompileHost,
	type PrecompileOptions,
	type PrecompileResult
} from "@ark/precompile"
import { hasArkKind } from "@ark/schema"
import { posix } from "node:path"

export const memoryHost = (files: Record<string, string>): PrecompileHost => ({
	resolve: (specifier, importer) =>
		specifier.startsWith(".") ?
			posix.join(posix.dirname(importer), specifier)
		:	undefined,
	readFile: path => files[path]
})

export const precompile = (
	source: string,
	files: Record<string, string> = {},
	opts?: PrecompileOptions
): PrecompileResult =>
	precompileModule(
		source,
		"/main.ts",
		memoryHost({ ...files, "/main.ts": source }),
		opts
	)

// each site's status, with the expression of the value it folds to or the reasons it is rejected
export const statusesOf = (
	source: string,
	files?: Record<string, string>,
	opts?: PrecompileOptions
): string[] =>
	precompile(source, files, opts).sites.map(site =>
		[
			`${site.line}:${site.column} ${site.status}${
				site.parseError ? ` (${site.parseError.message})`
				: hasArkKind(site.value, "root") ? ` ${site.value.expression}`
				: ""
			}`,
			...site.reasons
		].join("\n  ")
	)

export const diagnosticsOf = (
	source: string,
	files?: Record<string, string>,
	opts?: PrecompileOptions
): string[] => precompile(source, files, opts).diagnostics.map(renderDiagnostic)
