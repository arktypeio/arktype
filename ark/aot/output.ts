import {
	noIssueFeatures,
	precompileStandalone,
	precompileStandaloneModules,
	writeFixConfig,
	writeLazyRead,
	type Configured,
	type StandaloneExport,
	type StandaloneModules,
	type StandaloneOptions
} from "arktype/internal/standalone.ts"
import MagicString from "magic-string"
import type {
	ImportDeclarationSpecifier,
	MemberExpression,
	Node,
	Program,
	Span
} from "oxc-parser"
import { reasonsOf } from "./diagnostics.ts"
import { contains } from "./graph.ts"
import type { SourceModule } from "./module.ts"
import type { Site } from "./sites.ts"
import { minifiedSizeOf } from "./runtimeSize.ts"
import { exportNameOf, type Binding } from "./scope.ts"
import { combinesChecks, smallerOf } from "./smaller.ts"

export const noValidators: StandaloneModules = {
	code: "",
	modules: {},
	folds: {},
	checking: [],
	values: [],
	calls: {},
	issues: noIssueFeatures
}

// one bad export refuses a whole artifact, so retry each alone
export const writeValidators = (
	exportsByName: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	refusalsByName: Record<string, string[]>,
	inline: boolean
): StandaloneModules => {
	const write = (names: string[], combines = true): StandaloneModules => {
		const exports = Object.fromEntries(
			names.map(name => [name, exportsByName[name]])
		)
		return (inline ? precompileStandalone : precompileStandaloneModules)(
			exports,
			combines ? opts : { ...opts, combines: false }
		)
	}
	let names = Object.keys(exportsByName)
	let written: StandaloneModules
	try {
		written = write(names)
	} catch {
		names = names.filter(name => {
			try {
				write([name])
				return true
			} catch (e) {
				refusalsByName[name] = reasonsOf(e)
				return false
			}
		})
		// e.g. every export under a configured locale
		if (!names.length) return noValidators
		written = write(names)
	}
	// a program choosing for its modules has chosen checkers
	return combinesChecks(opts) && opts.combines === undefined ?
			smallerOf(written, () => write(names, false), minifiedSizeOf)
		:	written
}

// fixes the configuration as a failed definition does
export const writeParseErrorThrower = (
	message: string,
	configured: Configured,
	progress: Site["progress"]
): string =>
	`import * as runtime from "arktype/runtime"\n\nfunction throwParseError(${progress ? "progress" : ""}) {\n\t${progress ? `runtime.checkProgress(progress, ${progress[0]}, ${JSON.stringify(progress[1])})\n\t` : ""}${writeFixConfig(configured)}\n\tthrow new runtime.ParseError(${JSON.stringify(message)})\n}\n\nexport { throwParseError as default }\n`

// the runtime's own where nothing was fingerprinted
export const writeConfigFixer = (configured: Configured): string =>
	configured ?
		`import * as runtime from "arktype/runtime"\n\nfunction fixConfig() {\n\t${writeFixConfig(configured)}\n}\n\nexport { fixConfig as default }\n`
	:	`import { fixConfig } from "arktype/runtime"\n\nexport { fixConfig as default }\n`

export const writeUnitTable = (units: Record<string, string>): string =>
	`import { registerPrecompiledUnits } from "arktype/internal/precompiled.js"\n\nregisterPrecompiledUnits({ ${Object.entries(
		units
	)
		.map(([key, unit]) => `${JSON.stringify(key)}: ${unit}`)
		.join(", ")} })\n`

// each module runs in a function atop its importer
export const inlineModules = (
	module: SourceModule,
	s: MagicString,
	prefix: string,
	modules: Record<string, string>,
	imports: Record<string, Record<string, string>>,
	moduleOf: (specifier: string, source: string) => SourceModule
): string => {
	const importsBySource: Record<string, InlinedImport> = {}
	let declarations = ""
	let loaders = 0
	for (const specifier in imports) {
		const inlined = moduleOf(specifier, modules[specifier])
		const locals = imports[specifier]
		const names = Object.keys(locals)
		const call = inlinedCallOf(inlined, names, module, prefix, importsBySource)
		if (!names.length) {
			declarations += `;${call};\n`
			continue
		}
		// declared, so a cycle can call them before the body runs
		const exports = `${prefix}$exports${loaders}`
		const load = `${prefix}$load${loaders++}`
		declarations += `var ${exports};\nfunction ${load}() {\nreturn ${writeLazyRead(exports, call)}\n}\n${names
			.map(
				name =>
					`function ${locals[name]}(...args) {\nreturn ${load}()[${JSON.stringify(name)}](...args)\n}\n`
			)
			.join("")}${load}();\n`
	}
	if (!declarations) return ""
	// on the right, so after the imports written there
	s.prependRight(importsEndOf(module.program), `\n${declarations}`)
	return Object.entries(importsBySource)
		.map(([source, { namespace, isPassed, locals }]) => {
			const from = JSON.stringify(source)
			const named = Object.entries(locals).map(
				([name, local]) => `${name} as ${local}`
			)
			let written = isPassed ? `\nimport * as ${namespace} from ${from}` : ""
			if (named.length)
				written += `\nimport { ${named.join(", ")} } from ${from}`
			return written || `\nimport ${from}`
		})
		.join("")
}

interface InlinedImport {
	namespace: string
	// whether a module reads the namespace other than by its members
	isPassed: boolean
	locals: Record<string, string>
}

// a module's body as a call passing what it imports, returning what it exports
// by the names given; a global the inlining module declares is passed as itself
const inlinedCallOf = (
	inlined: SourceModule,
	names: string[],
	module: SourceModule,
	prefix: string,
	importsBySource: Record<string, InlinedImport>
): string => {
	const body = new MagicString(inlined.source)
	const params: string[] = []
	const args: string[] = []
	const localsByName: Record<string, string> = {}
	for (const statement of inlined.program.body) {
		if (statement.type === "ImportDeclaration") {
			const imported = (importsBySource[statement.source.value] ??= {
				namespace: `${prefix}$${Object.keys(importsBySource).length}`,
				isPassed: false,
				locals: {}
			})
			// imported by name, so a bundler can drop the exports none read
			const localOf = (name: string) =>
				(imported.locals[name] ??= `${imported.namespace}$${name}`)
			for (const binding of statement.specifiers) {
				if (binding.type !== "ImportNamespaceSpecifier") {
					params.push(binding.local.name)
					args.push(
						localOf(
							binding.type === "ImportSpecifier" ?
								exportNameOf(binding.imported)
							:	"default"
						)
					)
					continue
				}
				const members = membersReadOf(inlined, binding.local.name)
				if (members) {
					for (const { start, end, property } of members)
						body.overwrite(start, end, localOf(property.name))
					continue
				}
				imported.isPassed = true
				params.push(binding.local.name)
				args.push(imported.namespace)
			}
		} else if (statement.type === "ExportNamedDeclaration") {
			for (const binding of statement.specifiers) {
				localsByName[exportNameOf(binding.exported)] = exportNameOf(
					binding.local
				)
			}
		} else continue
		body.remove(statement.start, statement.end)
	}
	for (const { id, binding } of inlined.scopes.root.unresolved) {
		if (
			binding ||
			!(id.name in module.scopes.root.bindings) ||
			params.includes(id.name)
		)
			continue
		params.push(id.name)
		args.push(`globalThis.${id.name}`)
	}
	return `((${params.join(", ")}) => {\n${body.toString().trim()}\n${names.length ? `return { ${names.map(name => `${JSON.stringify(name)}: ${localsByName[name]}`).join(", ")} }\n` : ""}})(${args.join(", ")})`
}

type StaticMember = Extract<MemberExpression, { computed: false }>

const membersReadOf = (
	module: SourceModule,
	local: string
): StaticMember[] | undefined => {
	const members: StaticMember[] = []
	for (const { id } of module.scopes.root.bindings[local].references) {
		const member = id.parent
		if (
			member?.type !== "MemberExpression" ||
			member.computed ||
			member.object !== id
		)
			return
		members.push(member)
	}
	return members
}

// a comment between declarators can hold a comma
export const commaAfter = (source: string, from: number): number => {
	for (let i = from; ; i++) {
		if (source[i] === ",") return i
		if (source.startsWith("//", i)) i = source.indexOf("\n", i)
		else if (source.startsWith("/*", i)) i = source.indexOf("*/", i) + 1
	}
}

export const firstStatementOf = (program: Program): Program["body"][number] =>
	program.body.find(
		statement =>
			statement.type !== "ExpressionStatement" || !statement.directive
	)!

const runsNothing = (statement: Program["body"][number]): boolean => {
	const declaration =
		statement.type === "ExportNamedDeclaration" ?
			statement.declaration
		:	statement
	if (!declaration) return true
	switch (declaration.type) {
		case "FunctionDeclaration":
		case "TSDeclareFunction":
		case "TSInterfaceDeclaration":
		case "TSTypeAliasDeclaration":
			return true
		case "VariableDeclaration":
			return declaration.declarations.every(
				({ init }) => init?.type === "Literal"
			)
		default:
			return false
	}
}

const isImport = (statement: Program["body"][number]): boolean =>
	statement.type === "ImportDeclaration" ||
	statement.type === "ExportAllDeclaration" ||
	(statement.type === "ExportNamedDeclaration" && !!statement.source)

// where imports a module's code reads are written: after those it starts
// with, or its directives or hashbang. A bundler hoists imports, but
// TypeScript compiling to CommonJS ahead of it requires each where it stands,
// so one written after code that reads it is required too late
export const importsEndOf = (program: Program): number => {
	let end = program.hashbang?.end ?? 0
	for (const statement of program.body) {
		if (
			isImport(statement) ||
			(statement.type === "ExpressionStatement" && statement.directive)
		)
			end = statement.end
		else if (!runsNothing(statement)) break
	}
	return end
}

// writes imports where the module's code can read them
export const writeImportsAhead = (
	s: MagicString,
	program: Program,
	imports: string,
	at = importsEndOf(program)
): void => {
	if (!imports) return
	const lineEnd = s.original.indexOf("\n", at)
	const rest = s.original.slice(at, lineEnd === -1 ? undefined : lineEnd)
	// minified code can continue the import's line
	s.prependLeft(at, rest.trim() ? `${imports}\n` : imports)
}

// entries whose exports only sites read, so a standalone build drops them
const prunedSpecifiers: unknown[] = ["arktype", "arktype/codecs"]

// an import only folded sites read becomes e.g. `import "arktype"`, as does
// arktype's export imported through a module re-exporting it, which no type
// stripping drops and may be one arktype/runtime lacks. Returns each written bare
// or dropped, as one written bare imports its module
export const pruneArktypeImports = (
	module: SourceModule,
	folded: Span[],
	s: MagicString,
	importsArktype: (specifier: ImportDeclarationSpecifier) => boolean
): Set<Node> => {
	const pruned = new Set<Node>()
	// e.g. `import "arktype"`, written once however many imports it replaces
	const bare = new Set<unknown>()
	for (const statement of module.program.body) {
		if (
			statement.type !== "ImportDeclaration" ||
			statement.importKind === "type"
		)
			continue
		const isArktype = prunedSpecifiers.includes(statement.source.value)
		const kept = statement.specifiers.filter(specifier => {
			const references =
				module.scopes.bindingsById.get(specifier.local)?.references ?? []
			return (
				references.some(({ id }) => !folded.some(site => contains(site, id))) ||
				// one nothing reads stays unresolved, as a host resolving each import costs
				(!isArktype && (!references.length || !importsArktype(specifier)))
			)
		})
		if (kept.length === statement.specifiers.length) continue
		if (!kept.length) pruned.add(statement)
		if (kept.length || !bare.has(statement.source.value)) {
			if (!kept.length) bare.add(statement.source.value)
			s.overwrite(
				statement.start,
				statement.source.end,
				writeImport(kept, statement.source.value, module)
			)
			continue
		}
		// the line break before it goes too, keeping what's written around it
		const start =
			s.original[statement.start - 1] === "\n" ?
				statement.start - 1
			:	statement.start
		s.overwrite(start, statement.end, "", { contentOnly: true })
	}
	return pruned
}

// a re-export of what arktype/runtime lacks fails to link, though what imports
// it reads it only in sites, so it's dropped; a read outside one is refused there
export const pruneArktypeReexports = (
	module: SourceModule,
	s: MagicString,
	isRuntimeExport: (name: string) => boolean
): void => {
	for (const statement of module.program.body) {
		if (
			statement.type !== "ExportNamedDeclaration" ||
			statement.source?.value !== "arktype" ||
			statement.exportKind === "type"
		)
			continue
		const kept = statement.specifiers.filter(
			({ local, exportKind }) =>
				exportKind === "type" || isRuntimeExport(exportNameOf(local))
		)
		if (kept.length === statement.specifiers.length) continue
		s.overwrite(
			statement.start,
			statement.source.end,
			kept.length ?
				`export { ${kept.map(specifier => module.textOf(specifier)).join(", ")} } from "arktype"`
			:	`import "arktype"`
		)
	}
}

// TypeScript drops imports only folded sites read, so re-add them bare, ahead of
// a validator's imports written after them, as they may run the config module
export const keepImportedModules = (
	module: SourceModule,
	folded: Span[],
	kept: Span[],
	passed: Binding[],
	pruned: ReadonlySet<Node>,
	s: MagicString
): void => {
	for (const statement of module.program.body) {
		if (
			statement.type !== "ImportDeclaration" ||
			prunedSpecifiers.includes(statement.source.value) ||
			pruned.has(statement) ||
			statement.importKind === "type"
		)
			continue
		const values = statement.specifiers.filter(
			specifier =>
				specifier.type !== "ImportSpecifier" || specifier.importKind !== "type"
		)
		const bindings = values.flatMap(
			specifier => module.scopes.bindingsById.get(specifier.local) ?? []
		)
		const references = bindings.flatMap(binding => binding.references)
		if (
			references.length &&
			references.every(
				({ id }) =>
					folded.some(span => contains(span, id)) &&
					!kept.some(span => contains(span, id))
			) &&
			!bindings.some(binding => passed.includes(binding))
		) {
			s.prependRight(
				statement.start,
				`import ${module.textOf({ start: statement.source.start, end: statement.end })}\n`
			)
		}
	}
}

const writeImport = (
	specifiers: ImportDeclarationSpecifier[],
	source: string,
	module: SourceModule
) => {
	const clauses: string[] = []
	const named: string[] = []
	for (const specifier of specifiers) {
		if (specifier.type === "ImportSpecifier")
			named.push(module.textOf(specifier))
		else clauses.push(module.textOf(specifier))
	}
	if (named.length) clauses.push(`{ ${named.join(", ")} }`)
	return clauses.length ?
			`import ${clauses.join(", ")} from ${JSON.stringify(source)}`
		:	`import ${JSON.stringify(source)}`
}
