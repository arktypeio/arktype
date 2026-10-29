import type { ErrorDetail, MutatesInput } from "@ark/schema"
import { capitalize, printable } from "@ark/util"
import type { PrecompilePluginOptions } from "./driver.ts"
import {
	packageNameOf,
	printablePathOf,
	resolvesToRuntime,
	runtimeSpecifiers,
	type RuntimeVariant
} from "./host.ts"
import type { Rule } from "./diagnostics.ts"

export const writeUnreadableConfigMessage = (path: string): string =>
	`The config module ${path} can't be read. Name a module that exists as the build's config.`

export const writeUnansweredResolveMessage = (
	specifier: string,
	importer: string,
	timeout: number
): string =>
	`The bundler didn't resolve \`${specifier}\` from ${importer} within ${timeout / 1000}s, as where resolving it waits on arktype's precompiler, which waits on the answer: a plugin resolving it may load a module arktype's plugin transforms. The precompiler asks the bundler only for an import it can't resolve as TypeScript does, so add the alias it resolves through to tsconfig.json's \`paths\`.`

export const configuredThreadMessage =
	"arktype in this thread holds a configuration other than the build's, which it can't change once set, so the build must restart in a thread of its own. Restart the process that runs it."

export type configuredThreadMessage = typeof configuredThreadMessage

export const configurationConflictMessage =
	"configure() is given other values than arktype in this thread already applied"

export const configurationConflictReason =
	"a module the configuration reads was given anew, as when it's edited while the build runs or a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set"

// a bundler that knows its plugins names those ahead of arktype's in its place
export const conflictingPluginPhrase = "the plugin transforming it"

// a plugin's rewrite of the config module can't take effect in either order:
// ahead of arktype's, it conflicts with the module as read; behind it, the
// program configures arktype with other values than its build's and throws
export const writeConflictHint = (config: string): string =>
	`Restart the build to apply an edit to ${config}. If it wasn't edited, exclude it from ${conflictingPluginPhrase}, since the build configures arktype from the module as written and the program must configure it the same.`

export const writeConflictingPlugins = (names: string[]): string =>
	`${names.join(", ")}, ${names.length > 1 ? "one of which transforms" : "which transforms"} it`

export const writeStandaloneDependencyMessage = <name extends string>(
	name: name
): writeStandaloneDependencyMessage<name> =>
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Where it defines its Types statically, precompile it with this in ark.json (or package.json's "ark" key):\n  "precompile": { "dependencies": { "${name}": "aot" } }\nWhere it defines them from values known only at runtime, as from a database table, set "arktype" in place of "aot" to run it on arktype.`

export type writeStandaloneDependencyMessage<name extends string> =
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Where it defines its Types statically, precompile it with this in ark.json (or package.json's "ark" key):\n  "precompile": { "dependencies": { "${name}": "aot" } }\nWhere it defines them from values known only at runtime, as from a database table, set "arktype" in place of "aot" to run it on arktype.`

// Turbopack aliases arktype for every importer, so it can't run one on arktype
export const writeTurbopackDependencyMessage = (name: string): string =>
	`${name} imports arktype, which Turbopack resolves to arktype/runtime, where defining a Type throws. Where it defines its Types statically, precompile it with this in ark.json (or package.json's "ark" key):\n  "precompile": { "dependencies": { "${name}": "aot" } }\nWhere it defines them from values known only at runtime, as from a database table, build with webpack, which can run it on arktype, or with runtime: "arktype".`

export const writeVariantOption = (variant: RuntimeVariant): string =>
	variant === "lean" ? 'optimizeErrors: "size"' : 'errors: "none"'

// how to build without the runtime copy a variant loads
export const writeWithoutVariant = (variant: RuntimeVariant): string =>
	variant === "lean" ?
		'with optimizeErrors: "speed"'
	:	`without ${writeVariantOption(variant)}`

export const writeVariantImportMessage = (
	importer: string,
	specifier: string,
	variant: RuntimeVariant
): string =>
	`${importer} imports ${specifier}, which a build with ${writeVariantOption(variant)} can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own. Import what it reads from arktype, which a standalone build resolves to that runtime, or build ${writeWithoutVariant(variant)}.`

export const writeTextlessMessage = (path: string): string =>
	`${path} imports arktype but was loaded without @ark/aot/node's hooks, before register() ran or by a loader that compiles it itself, as tsx does in a CommonJS package, so a standalone build can't precompile it. Register them first, as with \`node --import ./register.ts\`, and let Node run the TypeScript rather than a loader like tsx.`

export const writeUncachedModuleMessage = (
	specifier: string,
	dir: string
): string =>
	`${specifier} was written by a build whose cache kept it in ${dir}, where it no longer is. Delete the bundler's cache to rebuild it.`

const loadedAtRuntime =
	"to be loaded at runtime rather than bundled with the runtime the program's precompiled validators use, so the program can load a copy of arktype that isn't theirs, e.g. one whose `type.errors` isn't the class of their errors"

export const writeExternalizedMessage = (
	specifier: string,
	option: string
): string =>
	`The build's \`${option}\` option leaves ${specifier} ${loadedAtRuntime}. Remove ${packageNameOf(specifier)} from \`${option}\`.`

export const writeBundledExternalMessage = (specifier: string): string =>
	`The bundle leaves ${specifier} ${loadedAtRuntime}. Bundle arktype: remove it from the bundler's \`external\` option, or, where a tool leaves dependencies external, have it bundle arktype, as tsup does with \`noExternal: ["arktype"]\` and tsdown with \`deps: { alwaysBundle: [/^arktype(\\/|$)/] }\`.`

export const writeUnwrittenModuleMessage = (specifier: string): string =>
	`${specifier} is imported by a module this build didn't precompile, as one a cache kept from an earlier build is. Keep that cache from storing the modules @ark/aot transforms, or delete it.`

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
					.filter(
						s =>
							packageNameOf(s) === packageNameOf(specifier) &&
							resolvesToRuntime(s, opts)
					)
					.map(s => [s, "arktype/runtime"])
			)
		)}`

// `resolved` is where @ark/schema/runtime resolves other than to the build's copy
export const writeRuntimeAliasMessage = (
	resolved: string,
	variant: RuntimeVariant | undefined
): string =>
	variant ?
		`@ark/schema/runtime resolves to ${resolved} rather than @ark/schema/runtime/${variant}, which a build with ${writeVariantOption(variant)} loads in its place. Add to turbopack.resolveAlias: ${JSON.stringify({ "@ark/schema/runtime": `@ark/schema/runtime/${variant}` })}, and install @ark/schema if your package manager doesn't hoist it, as pnpm doesn't.`
	:	`@ark/schema/runtime resolves to ${resolved}, a copy for a build with errors: "none" or optimizeErrors: "size". Remove its turbopack.resolveAlias.`

export const writeNodeVersionMessage = (
	name: string,
	version: string
): string =>
	`${name} needs Node ${version} or later (this is ${process.versions.node})`

export const unbundledMessage =
	"precompile.esbuild() needs bundle: true, as a precompiled module imports the validators the bundle includes"

// the fix, then the escape hatch, as in "Remove it, or set allowUnsafe: ..."
export const withAllowUnsafe = (fix: string): string =>
	`${fix.replace(/\.$/, "")}, or set allowUnsafe: true to build anyway, with a warning.`

export const writePrecompiledDependencyMessage = (name: string): string =>
	`${name} imports arktype/runtime, so it ships validators precompiled for one version of arktype, which may not be this build's. Have it publish its source with "ark": { "aot": true } in its package.json, so this build precompiles it.`

export const writeUntransformedImportMessage = (
	file: string,
	specifier: string,
	cwd: string
): string =>
	writeUnprecompiledMessage(
		printablePathOf(cwd, file),
		specifier,
		"it can't precompile a module that isn't JavaScript or TypeScript. Move what it reads off arktype into a .ts module it imports: define its Types there, and check for errors with a function exported from there, like `export const isInvalid = (out: unknown) => out instanceof type.errors`."
	)

// e.g. esbuild's stdin, or a module a plugin loads from a virtual id
export const writeFilelessImportMessage = (
	id: string,
	specifier: string
): string =>
	writeUnprecompiledMessage(
		id.replace(/^\0/, ""),
		specifier,
		"it can't precompile a module with no file of its own. Define the Types it uses in a file it imports."
	)

// esbuild loads a module with the first plugin that returns its contents
export const writeLoadedFirstMessage = (
	file: string,
	specifier: string,
	cwd: string
): string =>
	writeUnprecompiledMessage(
		printablePathOf(cwd, file),
		specifier,
		"another plugin loaded it before precompile.esbuild() could. Put precompile.esbuild() ahead of that plugin."
	)

const writeUnprecompiledMessage = (
	name: string,
	specifier: string,
	reason: string
) =>
	`${name} imports ${specifier}, which a standalone build resolves to arktype/runtime, where defining a Type throws, as ${reason}`

export const versionHint =
	"A precompiled validator is written for the arktype it was built with. Install one version of each, so @ark/aot imports what the program does."

export const writeVersionHint = (arktype: string, aot: string): string =>
	`A precompiled validator is written for the arktype it was built with. Install the @ark/aot released with arktype ${arktype}, so it imports what the program does: npm i -D @ark/aot@${aot}`

export const copiesHint =
	"Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."

export const writeUnsureHint = (fix: string, annotation?: string): string =>
	annotation === undefined ?
		`If it isn't a Type, annotate it with its type. If it is, ${fix}.`
	:	`If it isn't a Type, annotate it with an interface or type literal declaring what it reads, since the build can't read \`${annotation}\`. If it is, ${fix}.`

export const derivedHint = `If it isn't a Type, read it off a value the build can tell from a Type, like a Module defined in a const as \`scope({ ... }).export()\`. If it is, build with runtime: "arktype".`

export const hintsByRule: Record<Exclude<Rule, "syntax">, string> = {
	R1: "Standalone builds construct every Type at build time. Make it static, or put // @ark-runtime on the line before it, so arktype defines it at runtime.",
	R2: "arktype runs this callback while defining the type, so the build computes its result. Make it a static helper: one expression, or consts and one `return`, in the static subset.",
	R3: "The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
	R4: `Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`,
	unsupported:
		"Standalone builds can't precompile every definition yet. Put // @ark-runtime on the line before it, so arktype defines it at runtime.",
	parse: "Fix the definition, which throws the same ParseError at runtime.",
	copies: copiesHint
}

const opaqueSchemaNote =
	"A Standard Schema other than a Type, like a Zod schema, needs no change."

export const opaqueSchemaHint = `${opaqueSchemaNote} If it's a Type, make it static so the build precompiles it with the site.`

export const writeOpaqueParameterHint = (
	fn: string,
	param: string,
	definition: string | undefined
): string =>
	`${opaqueSchemaNote} If it's a Type, ${writeGenericFix(fn, param, definition)}`

export const cacheHint =
	'With runtime: "arktype", arktype defines this at runtime.'

export const frozenHint = `Keep what you attach in an object of your own, or build with runtime: "arktype".`

export const unresolvedHint =
	"If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it."

export const markerHint =
	"Put // @ark-runtime right before a definition arktype should run, or remove it."

export const islandHint = `A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".`

export const runtimeImportHint = `Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: "arktype".`

export const dynamicImportHint = `Import it with an import declaration, so the build precompiles what it defines, or build with runtime: "arktype".`

export const nodePackageHint = `Read arktype's nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".`

export const writeSchemaExportHint = (name: string): string =>
	`Import ${name} from arktype, which a standalone build resolves to its runtime${name === "ArkErrors" ? ", or read type.errors" : ""}.`

export const localeHint = `Write errors in a locale in a definition marked // @ark-runtime, or build with runtime: "arktype".`

// e.g. `{ plan: type("'free' | 'pro'").default("free") }`
export const writeKeyedHint = (
	definition: string,
	key: string | undefined
): string =>
	`Write it at the key it's for, in place of the const: \`{ ${key ?? "key"}: ${definition} }\`.`

// a standalone validator returns what arktype does as the program configures it
export const writeConfiguredOptionHint = (
	option: string,
	// e.g. `"first"`
	configured: string
): string =>
	`Build with the ${option} arktype is configured with, in ark.json: { "precompile": { "${option}": ${configured} } }`

export const writeStaticHint = (
	dynamic: string | undefined
): string | undefined =>
	dynamic &&
	`Replace \`${dynamic}\` with a value the build can read, like a literal or a const holding one, or put // @ark-runtime on the line before the definition, so arktype defines it at runtime.`

export const writeNoConfigHint = (path: string): string =>
	`Name this module as the build's config in ark.json: { "precompile": { "config": ${JSON.stringify(/^\.{0,2}\//.test(path) ? path : `./${path}`)} } }`

// a standalone validator's issues stay apart at one path, where arktype
// merges them into an intersection, so only these have an exact rewrite
const errorReaderRewrites: Record<string, (errors: string) => string> = {
	byPath: errors =>
		`Object.fromEntries(${errors}.issues.map(issue => [issue.path.join("."), issue]))`,
	flatByPath: errors =>
		`Object.groupBy(${errors}.issues, issue => issue.path.join("."))`
}

export const writeErrorReaderHint = (name: string, errors: string): string =>
	name in errorReaderRewrites ?
		`Write it as \`${errorReaderRewrites[name](errors)}\`, whose keys join each path with ".", where arktype writes an index as [0], or build with runtime: "arktype".`
	:	`Read \`${errors}.issues\`, each with its path and message, as in \`for (const { path, message } of ${errors}.issues)\`, or build with runtime: "arktype".`

// a standalone validator writes its errors only in English
export const writeMessageInHint = (issue: string): string =>
	`Read \`${issue}.message\`, which a standalone validator writes in English, or build with runtime: "arktype" to write it in a locale.`

export const writeErrorsMismatchMessage = (
	configured: ErrorDetail,
	built: ErrorDetail
): string =>
	`arktype is configured with errors: "${configured}", where the build's errors are "${built}"`

export const writeMutatesInputMismatchMessage = (
	configured: MutatesInput,
	built: MutatesInput
): string =>
	`arktype is configured with mutatesInput: ${printable(configured)}, where the build's mutatesInput is ${printable(built)}`

// e.g. `const nullable = type("<t>", "t | null")` for `<t>(T: Type<t>) => T.or("null")`
const writeGenericFix = (
	fn: string,
	param: string,
	definition: string | undefined
): string =>
	`make ${fn} a Generic, which the build precompiles where it's called: \`const ${fn} = type("<t>", ${definition ?? "def"})\`${definition ? "" : `, with "t" in def where it reads \`${param}\``}.`

export const writeGenericHint = (
	fn: string,
	param: string,
	definition: string | undefined,
	isAnnotated: boolean,
	unreadAnnotation?: string
): string =>
	capitalize(writeGenericFix(fn, param, definition)) +
	(unreadAnnotation !== undefined ?
		` If \`${param}\` isn't a Type, annotate it with an interface or type literal declaring what it reads, since the build can't read \`${unreadAnnotation}\`.`
	: isAnnotated ? ""
	: ` If \`${param}\` isn't a Type, annotate it with its type.`)

export const writeHelperCallHint = (fn: string): string =>
	`Call ${fn} directly, with arguments the build can read, like literals and consts, so it precompiles each call.`

// e.g. a helper whose body runs an `if` before it returns
const unstaticHelperPattern =
	/^`(.+)` \(.+\) is not a static helper: it (?:runs|ends with)/

export const isUnstaticHelperReason = (reason: string): boolean =>
	unstaticHelperPattern.test(reason)

const writeHelperBodyFix = (fn: string): string =>
	`write ${fn} as one expression, or as consts and one \`return\`, so the build precompiles each call with the values it's passed`

export const writeOpaqueHelperHint = (reasons: string[]): string => {
	const fn = reasons
		.map(reason => unstaticHelperPattern.exec(reason)?.[1])
		.find(fn => fn)
	return fn ?
			`${opaqueSchemaNote} If it's a Type, ${writeHelperBodyFix(fn)}.`
		:	opaqueSchemaHint
}

// reasons a standalone build refuses a site, with how to fix each
const textHints: [
	pattern: RegExp,
	hint: string | ((...groups: string[]) => string)
][] = [
	[
		/^`(.+)` is a parameter of (.+) \(.+\); its value is known only at runtime$/,
		(param, fn) =>
			`Write the definition where ${fn === "a function" ? "that function" : fn} is called, with the value it passes for \`${param}\`, so the build precompiles each call.`
	],
	[unstaticHelperPattern, fn => `${capitalize(writeHelperBodyFix(fn))}.`],
	[
		/configures arktype as the function runs/,
		"Call configure() in the build's config module instead, so every Type is precompiled with what it sets."
	],
	[
		/^`(.+)` is read before its declaration/,
		name => `Declare \`${name}\` before the const that reads it.`
	],
	[
		/reads a definition that throws a ParseError$/,
		"Fix the definition it reads, which throws the same ParseError at runtime."
	],
	[
		/^`.+` is written at .+, so its value at the site is not known$/,
		"Write the value whole in its literal. Where it differs by case, define a Type for each case and choose one at runtime."
	],
	[
		/^`(.+)` is a package the build does not read, though (?:it|(.+)) imports arktype$/,
		(specifier, name = specifier) =>
			`Precompile ${name} with the program: in ark.json (or package.json's "ark" key), set "precompile": { "dependencies": { "${name}": "aot" } }, or "arktype" in place of "aot" where it defines Types from values known only at runtime.`
	],
	[
		/^it's passed to code the build can't see/,
		`Define it in a const that the program reads directly, so the build precompiles each read, or build with runtime: "arktype".`
	],
	[
		/^a scope's configured/,
		`A standalone validator writes text configured for a code only from configure(). Configure it there, or on each Type with .configure(), or build with runtime: "arktype".`
	],
	[
		/^a configured predicate \w+ that a narrow or morph raises/,
		`A standalone validator writes what a narrow or morph raises from what it passes to ctx.reject(). Pass the text there, or build with runtime: "arktype".`
	],
	[
		/^`(.+)` is a runtime island's Type, which a precompiled site can't receive$/,
		name =>
			`Precompile \`${name}\` too, by removing its // @ark-runtime where the build can, or mark this definition // @ark-runtime as well.`
	],
	[
		/^`(.+)` \(.+\) is shadowed where the site is written/,
		name =>
			`Rename the \`${name}\` declared around the site, which hides the one it reads.`
	],
	[
		/^`.+` \(.+\) is a static helper its module doesn't export through a binding/,
		"Export it by name, as `export const helper = ...`, and import that name, so a test driver can register it."
	],
	[
		/^the Standard Schema .+ can't be precompiled to a standalone validator$/,
		"Define the schema with ArkType, which the build precompiles, or put // @ark-runtime on the line before this definition, so arktype defines it at runtime."
	],
	[
		/writer, which reads each branch's errors/,
		`A standalone validator keeps no union branch's errors. Configure the text as a string, or build with runtime: "arktype".`
	]
]

export const configuredHintOf = (reasons: string[]): string | undefined => {
	const configured = reasons
		.map(reason =>
			/^arktype is configured with (\w+): (.+), where/.exec(reason)
		)
		.find(match => match)
	// a Scope's, which the program can leave to the build
	if (configured)
		return `${writeConfiguredOptionHint(configured[1], configured[2])}, or leave ${configured[1]} out of the Scope's configuration.`
	for (const [pattern, hint] of textHints) {
		for (const reason of reasons) {
			const match = pattern.exec(reason)
			if (match)
				return typeof hint === "string" ? hint : hint(...match.slice(1))
		}
	}
}

export const islandValueMessage = (text: string): string =>
	`\`${text}\` is a runtime island's Type, which a precompiled site can't receive`

export const unwrittenHint =
	'Move it into a .ts or .js module of its own that this one imports, which the build precompiles, or build with runtime: "arktype".'
