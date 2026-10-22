import type { ErrorDetail, MutatesInput } from "@ark/schema"
import { printable } from "@ark/util"
import type { Rule } from "./precompile.ts"

export const writeUnreadableConfigMessage = (path: string): string =>
	`the config module ${path} can't be read`

export const configuredThreadMessage =
	"arktype in this thread holds a configuration other than the build's, which it can't change once set, so the build must restart in a thread of its own"

export type configuredThreadMessage = typeof configuredThreadMessage

export const configurationConflictMessage =
	"configure() is given other values than arktype in this thread already applied"

export const configurationConflictReason =
	"a module the configuration reads was given anew, as when a plugin ahead of arktype's transforms it, and arktype can't change its configuration once set"

export const writeStandaloneDependencyMessage = <name extends string>(
	name: name
): writeStandaloneDependencyMessage<name> =>
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Have it publish its source with "arktype": { "precompile": true } in its package.json, so this build precompiles it.`

export type writeStandaloneDependencyMessage<name extends string> =
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws. Have it publish its source with "arktype": { "precompile": true } in its package.json, so this build precompiles it.`

export const versionHint =
	"A precompiled validator is written for the arktype it was built with. Install one version of each, so @ark/aot imports what the program does."

export const copiesHint =
	"Types and errors from one copy aren't recognized by another. Install one version of each, e.g. with your package manager's dedupe or overrides."

export const writeUnsureHint = (fix: string): string =>
	`If it isn't a Type, annotate it with its type. If it is, ${fix}.`

export const derivedHint = `If it isn't a Type, read it off a value the build can tell from a Type, like a Module defined in a const as \`scope({ ... }).export()\`. If it is, build with runtime: "arktype".`

export const hintsByRule: Record<Exclude<Rule, "syntax">, string> = {
	R1: `Standalone builds construct every Type at build time. Make it static, or build with runtime: "arktype".`,
	R2: "arktype runs this callback while defining the type, so the build computes its result. Make it a static helper: one expression or one `return` in the static subset.",
	R3: "The configuration is fixed before the first Type is created. Call configure() once, with a static argument, in the build's `config` module.",
	R4: `Standalone builds do not ship arktype. Use it inside a precompiled definition, or build with runtime: "arktype".`,
	unsupported: `Standalone builds can't precompile every definition yet. Build with runtime: "arktype".`,
	parse: "Fix the definition, or it throws the same ParseError at runtime.",
	copies: copiesHint
}

export const opaqueSchemaHint =
	"A Standard Schema other than a Type, like a Zod schema, needs no change. If it's a Type, make it static so the build precompiles it with the site."

export const cacheHint =
	'With runtime: "arktype", arktype defines this at runtime.'

export const frozenHint = `Keep what you attach in an object of your own, or build with runtime: "arktype".`

export const unresolvedHint =
	"If a bundler alias resolves it, add the alias to tsconfig.json's `paths` or name that tsconfig as the build's `tsconfig`, so the build can check it."

export const markerHint =
	"Put // @ark-runtime right before a definition arktype should run, or remove it."

export const islandHint = `A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".`

export const runtimeImportHint = `Read it only in a definition the build precompiles or one marked // @ark-runtime, or build with runtime: "arktype".`

export const nodePackageHint = `Read arktype's nodes in a definition marked // @ark-runtime, or build with runtime: "arktype".`

export const writeSchemaExportHint = (name: string): string =>
	`Import ${name} from arktype, which a standalone build resolves to its runtime${name === "ArkErrors" ? ", or read type.errors" : ""}.`

export const localeHint = `Write errors in a locale in a definition marked // @ark-runtime, or build with runtime: "arktype".`

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

// reasons a standalone build refuses a site, with how to fix each
const textHints: [pattern: RegExp, hint: string][] = [
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
		/writer, which reads each branch's errors/,
		`A standalone validator keeps no union branch's errors. Configure the text as a string, or build with runtime: "arktype".`
	]
]

export const configuredHintOf = (reasons: string[]): string | undefined => {
	const option = reasons
		.map(reason => /^arktype is configured with (\w+)/.exec(reason)?.[1])
		.find(option => option !== undefined)
	if (option !== undefined)
		return `A standalone validator returns what arktype does as the program configures it. Build with the ${option} arktype is configured with.`
	return textHints.find(([pattern]) =>
		reasons.some(reason => pattern.test(reason))
	)?.[1]
}

export const islandValueMessage = (text: string): string =>
	`\`${text}\` is a runtime island's Type, which a precompiled site can't receive`
