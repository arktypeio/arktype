import type { ErrorDetail, MutatesInput } from "@ark/schema"
import { capitalize, printable } from "@ark/util"
import type { Rule } from "./precompile.ts"

export const writeUnreadableConfigMessage = (path: string): string =>
	`the config module ${path} can't be read. Name a module that exists as the build's config.`

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

export const writeConflictHint = (config: string): string =>
	`Restart the build to apply an edit to ${config}. If it wasn't edited, put arktype's plugin ahead of ${conflictingPluginPhrase}.`

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

export const versionHint =
	"A precompiled validator is written for the arktype it was built with. Install one version of each, so @ark/aot imports what the program does."

export const writeVersionHint = (arktype: string, aot: string): string =>
	`A precompiled validator is written for the arktype it was built with. Install the @ark/aot released with arktype ${arktype}, so it imports what the program does: npm i -D @ark/aot@${aot}`

export const copiesHint =
	"Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."

export const writeUnsureHint = (fix: string): string =>
	`If it isn't a Type, annotate it with its type. If it is, ${fix}.`

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

export const writeErrorReaderHint = (errors: string): string =>
	`Read \`${errors}.issues\`, each with its path and message, as in \`for (const { path, message } of ${errors}.issues)\`, or build with runtime: "arktype".`

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
	isAnnotated: boolean
): string =>
	capitalize(writeGenericFix(fn, param, definition)) +
	(isAnnotated ? "" : (
		` If \`${param}\` isn't a Type, annotate it with its type.`
	))

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
