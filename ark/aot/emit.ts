import { throwError } from "@ark/util"
import { isAbsolute, relative, resolve } from "node:path"
import type * as ts from "typescript"
import {
	emittedFilesOf,
	formatDiagnostics,
	loadTypeScript,
	parseConfig,
	type TypeScript
} from "./declare.ts"
import type { PrecompilePluginOptions, TransformedModule } from "./driver.ts"
import {
	appendSourceMap,
	mapToSource,
	realPathOf,
	resolvedVariantOf,
	resolvesToRuntime,
	runtimeSpecifiers,
	type RuntimeVariant
} from "./host.ts"
import { writeVariantOption } from "./messages.ts"
import { withEnvironment } from "./presets.ts"
import {
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { createSyncPrecompiler } from "./worker.ts"

export interface EmittedModules {
	files: Record<string, string>
	errors: string[]
	warnings: string[]
}

export const emitPrecompiled = (
	opts?: PrecompilePluginOptions
): EmittedModules => {
	const cwd = resolve(opts?.cwd ?? ".")
	const set = withSettingsFile({ ...opts, cwd })
	refusePrune(set, "arktype-precompile")
	const resolved = resolvePrecompileOptions(set)
	const variant = resolvedVariantOf(resolved)
	if (variant) throwError(writeEmittedVariantMessage(variant))
	const ts = loadTypeScript(cwd)
	const diagnostics: ts.Diagnostic[] = []
	const result: EmittedModules = { files: {}, errors: [], warnings: [] }
	// arktype takes the program's configuration in a worker, as a build's does
	const request = createSyncPrecompiler({
		precompilerOptions: {
			...withEnvironment(set, {
				production: (process.env.NODE_ENV ?? "production") === "production",
				testing: false
			}),
			// no host serves the modules a precompiled module would import
			inline: true
		}
	})
	const rewrites = (specifier: string) =>
		runtimeSpecifiers.includes(specifier) &&
		resolvesToRuntime(specifier, resolved)
	try {
		const projects = [parseConfig(ts, cwd, set.tsconfig, diagnostics)]
		const visited = new Set(projects.map(configPathOf))
		for (const project of projects) {
			for (const reference of project.projectReferences ?? []) {
				const path = ts.resolveProjectReferencePath(reference)
				if (visited.has(path)) continue
				visited.add(path)
				projects.push(parseConfig(ts, cwd, path, diagnostics))
			}
			emitProject(ts, project, result, request, rewrites)
		}
	} finally {
		request("close")
	}
	const errors = diagnostics.filter(
		d => d.category === ts.DiagnosticCategory.Error
	)
	if (errors.length) result.errors.push(formatDiagnostics(ts, errors, cwd))
	return result
}

const isInside = (dir: string, file: string) => {
	const path = relative(dir, file)
	return !path.startsWith("..") && !isAbsolute(path)
}

const configPathOf = (config: ts.ParsedCommandLine) =>
	config.options.configFilePath as string

const emitProject = (
	ts: TypeScript,
	config: ts.ParsedCommandLine,
	result: EmittedModules,
	request: ReturnType<typeof createSyncPrecompiler>,
	rewrites: (specifier: string) => boolean
) => {
	if (!config.fileNames.length) return
	const { options } = config
	if (options.noEmit || options.emitDeclarationOnly)
		throwError(writeUnemittedMessage(resolve(configPathOf(config))))
	const emitOptions: ts.CompilerOptions = {
		...options,
		// tsc checks the program and emits its declarations
		noCheck: true,
		noEmitOnError: false,
		declaration: false,
		declarationMap: false,
		composite: false,
		incremental: false,
		// each map is written once it maps to the module's source
		sourceMap: !!(options.sourceMap || options.inlineSourceMap),
		inlineSourceMap: false
	}
	const host = ts.createCompilerHost(emitOptions)
	const { getSourceFile } = host
	const precompiled: Record<string, TransformedModule> = {}
	// the program precompiled modules are emitted from reuses the others
	const sourceFiles: Record<string, ts.SourceFile | undefined> = {}
	host.getSourceFile = (fileName, languageVersion, ...rest) =>
		fileName in precompiled ?
			ts.createSourceFile(
				fileName,
				precompiled[fileName].code!,
				languageVersion,
				true
			)
		:	(sourceFiles[fileName] ??= getSourceFile(
				fileName,
				languageVersion,
				...rest
			))
	const programOptions: ts.CreateProgramOptions = {
		rootNames: config.fileNames,
		options: emitOptions,
		host,
		...(config.projectReferences && {
			projectReferences: config.projectReferences
		})
	}
	const program = ts.createProgram(programOptions)
	const emitted: ts.SourceFile[] = []
	const { rootDir } = options
	for (const file of emittedFilesOf(program)) {
		// tsc fails on a module outside rootDir, as one resolved to its source
		if (rootDir && !isInside(rootDir, file.fileName)) continue
		const transformed = request(
			"transform",
			file.text,
			realPathOf(file.fileName)
		) as TransformedModule | undefined
		if (transformed) {
			result.errors.push(...transformed.errors)
			result.warnings.push(...transformed.warnings)
		}
		if (transformed?.code) precompiled[file.fileName] = transformed
		// only a module naming arktype imports what resolves to its runtime
		if (transformed?.code || file.text.includes("arktype")) emitted.push(file)
	}
	if (!emitted.length) return
	const precompiledProgram = ts.createProgram({
		...programOptions,
		oldProgram: program
	})
	for (const file of emitted) {
		let changed = file.fileName in precompiled
		const outputs: Record<string, string> = {}
		precompiledProgram.emit(
			precompiledProgram.getSourceFile(file.fileName),
			(fileName, text) => {
				outputs[fileName] = text
			},
			undefined,
			false,
			{
				before: changed ? [hoistImportsOf(ts)] : [],
				after: [
					rewriterOf(ts, rewrites, () => {
						changed = true
					})
				]
			}
		)
		if (!changed) continue
		for (const fileName in outputs) {
			if (fileName.endsWith(".map")) continue
			const code = outputs[fileName]
			const tscMap = outputs[`${fileName}.map`]
			const map =
				tscMap &&
				mapToSource(
					JSON.parse(tscMap),
					precompiled[file.fileName]?.map,
					file.text
				)
			if (map && options.inlineSourceMap) {
				result.files[fileName] = appendSourceMap(
					code.replace(/\n\/\/# sourceMappingURL=.*$/, ""),
					map
				)
			} else {
				result.files[fileName] = code
				if (map) result.files[`${fileName}.map`] = JSON.stringify(map)
			}
		}
	}
}

// tsc's CommonJS requires where the import was, but a precompiled module reads its imports first
const hoistImportsOf =
	(ts: TypeScript): ts.TransformerFactory<ts.SourceFile> =>
	context =>
	file => {
		// after its directives, like "use strict"
		const start = file.statements.findIndex(
			statement =>
				!ts.isExpressionStatement(statement) ||
				!ts.isStringLiteral(statement.expression)
		)
		if (start === -1) return file
		const body = file.statements.slice(start)
		return context.factory.updateSourceFile(file, [
			...file.statements.slice(0, start),
			...body.filter(ts.isImportDeclaration),
			...body.filter(statement => !ts.isImportDeclaration(statement))
		])
	}

const rewriterOf =
	(
		ts: TypeScript,
		rewrites: (specifier: string) => boolean,
		onRewrite: () => void
	): ts.TransformerFactory<ts.SourceFile> =>
	context => {
		const specifierOf = (node: ts.Node) =>
			ts.isImportDeclaration(node) || ts.isExportDeclaration(node) ?
				node.moduleSpecifier
			: (
				ts.isCallExpression(node) &&
				(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
					(ts.isIdentifier(node.expression) &&
						node.expression.text === "require"))
			) ?
				node.arguments[0]
			:	undefined
		const visit = (node: ts.Node): ts.Node => {
			const specifier = specifierOf(node)
			if (
				!specifier ||
				!ts.isStringLiteral(specifier) ||
				!rewrites(specifier.text)
			)
				return ts.visitEachChild(node, visit, context)
			onRewrite()
			return ts.visitEachChild(
				node,
				child =>
					child === specifier ?
						context.factory.createStringLiteral("arktype/runtime")
					:	visit(child),
				context
			)
		}
		return file => ts.visitEachChild(file, visit, context)
	}

export const writeEmittedVariantMessage = (variant: RuntimeVariant): string =>
	`A build with ${writeVariantOption(variant)} loads a copy of @ark/schema's runtime in place of the one arktype/runtime imports, which only a bundler or @ark/aot/node can do, so arktype-precompile --emit can't build with it${variant === "lean" ? '. Set optimizeErrors: "speed" to emit what optimize: "size" writes otherwise' : ""}`

export const writeUnemittedMessage = (tsconfig: string): string =>
	`${tsconfig} emits no JavaScript for arktype-precompile --emit to precompile. Name the tsconfig tsc builds with --tsconfig.`
