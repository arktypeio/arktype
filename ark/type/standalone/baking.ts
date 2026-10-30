import {
	hasArkKind,
	type BaseRoot,
	type BaseScope,
	type ErrorDetail,
	type GenericRoot,
	type MutatesInput
} from "@ark/schema"
import { arkKindOf } from "@ark/util"
import type { TypedFn } from "../fn.ts"
import type { Generic } from "../generic.ts"
import type { type } from "../keywords/keywords.ts"
import type { Module } from "../module.ts"
import type { HoleKind, IntrospectionMember } from "../runtime.ts"
import type { Scope } from "../scope.ts"
import { combines } from "./combinators.ts"
import { defaultBakedLimit } from "./values.ts"

export type ExportedValue = type.Any | Module | Scope<any> | Generic | TypedFn

export type Foldable = BaseRoot | ExportedValue | BaseScope | GenericRoot

export type StandaloneExport =
	| ExportedValue
	| StandaloneFactory
	| StandaloneIntrospection
	| StandaloneBake

export const introspectionMembers = [
	"expression",
	"description",
	"json",
	"toJSON",
	"toJsonSchema",
	"~standard.jsonSchema"
] as const

export type FoldedMember = Exclude<IntrospectionMember, "~standard.jsonSchema">

export const defaultMembers = [
	"assert",
	"meta",
	"~standard",
	"methods"
] as const

export type ValidatorMember =
	| (typeof defaultMembers)[number]
	| IntrospectionMember

export type ValidatorMembers = { [member in ValidatorMember]?: boolean }

export interface StandaloneIntrospection {
	member: FoldedMember
	type: BaseRoot
	data: unknown
	params: FactoryParam[]
	defaultChecks?: readonly DefaultCheck[]
	thrown?: unknown
}

// a function baking members into the validator of a Type another module
// creates, or into each of a module namespace's, by export name
export interface StandaloneBake extends BakedMembers {
	bakes: BaseRoot | Record<string, BaseRoot>
}

export interface StandaloneFactory {
	type: ExportedValue
	params: FactoryParam[]
	internedBy?: number | undefined
	defaultChecks?: readonly DefaultCheck[]
}

export type FactoryParam = HoleParam | InputParam | HelperParam | ProgressParam

export type DefaultCheck = [
	node: BaseRoot,
	value: unknown,
	key: PropertyKey | null
]

export interface HoleParam {
	kind: HoleKind
	label: string
	value: unknown
	// created by the site's module, so no mock can replace it
	isOwn?: boolean
}

export interface InputParam {
	kind: "input"
	label: string
	reads: [path: PropertyKey[], value: unknown][]
}

export interface HelperParam {
	kind: "helper"
	label: string
	file: string
	name: string
}

export interface ProgressParam {
	kind: "progress"
	label: string
	at: number
}

export type Configured = ConfiguredModule | false | undefined

export type Checks = "types" | "helpers" | "none"

export type Optimization = "speed" | "size"

export interface ConfiguredModule {
	fingerprint: string
	path: string
	config: string
}

export interface StandaloneOptions {
	configured?: Configured
	members?: ValidatorMembers | undefined
	// runs arktype's writers, refusing code that reads mutable state
	bake?: (<t>(write: () => t) => t) | undefined
	errors?: ErrorDetail | undefined
	freeze?: boolean | undefined
	lazy?: boolean | undefined
	// "none" trusts received Types to be the ones built
	checks?: Checks | undefined
	mutatesInput?: MutatesInput | undefined
	optimize?: Optimization | undefined
	// trust data to hold only own, enumerable keys, as JSON.parse's output does
	jsonInput?: boolean | undefined
	// declare functions, so an import cycle can call them early
	hoisted?: boolean | undefined
	// export as values what a site would call a function only to read
	values?: boolean | undefined
	// exports a site reads as its module loads, which a lazy build creates in place
	readOnLoad?: readonly string[] | undefined
	// false where a detailed size build compiles nodes rather than writing checkers
	combines?: boolean | undefined
	// where a size build writes checkers, write common intersections as one call each
	shapes?: boolean | undefined
	// false where nothing calls a validator, so each failure's errors are read
	called?: boolean | undefined
	/** @internal the chars a site's baked introspection may total */
	bakedLimit?: number | undefined
	// false where nothing reads a validator's .allows
	readsAllows?: boolean | undefined
	// false where no call passes a second argument, a traversal to pipe into
	piped?: boolean | undefined
	// introspection members an export bakes besides those members sets, as
	// code the build read reads them off it
	baked?: Record<string, BakedMembers> | undefined
}

export interface BakedMembers {
	members: readonly IntrospectionMember[]
	// true where the build lost track of what reads it, so may read any
	lost: boolean
}

export interface ValidatorReads {
	called: boolean
	readsAllows: boolean
	piped: boolean
}

export const wholeReads: ValidatorReads = {
	called: true,
	readsAllows: true,
	piped: true
}

export interface Baking extends ValidatorReads {
	members: ReadonlySet<ValidatorMember>
	bakedByRoot: ReadonlyMap<unknown, BakedMembers>
	write: <t>(write: () => t) => t
	firstIssue: boolean
	detailsErrors: boolean
	freezes: boolean
	readsConfig: boolean
	createsLazily: boolean
	// whether a validator compiles as its module loads
	compilesValidators: boolean
	checksTypes: boolean
	mutatesInput: MutatesInput | undefined
	jsonInput: boolean
	hoisted: boolean
	shortest: boolean
	flattens: boolean
	combines: boolean
	shapes: boolean
	// the hashes of roots a build writing checkers compiles anyway
	compiledInputs: ReadonlySet<string>
	// errors find their issues once read, for a call that may never read them
	defersIssues: boolean
	bakedLimit: number
	issues: IssueFeatures
}

export const writeFunction = (
	baking: Baking,
	name: string,
	params: string,
	body: string,
	isCalledOnLoad = true
): string =>
	baking.hoisted ? `function ${name}(${params}) {\n${body}\n}`
	: baking.shortest || !isCalledOnLoad ?
		`const ${name} = (${params}) => {\n${body}\n}`
	:	`const ${name} = ((${params}) => {\n${body}\n})`

// a validator's only attribute is its meta, which its creator is passed bare
export const holdsOnlyMeta = (members: ReadonlySet<ValidatorMember>): boolean =>
	members.has("meta") &&
	!introspectionMembers.some(member => members.has(member))

export const isCreatedByRuntime = (
	members: ReadonlySet<ValidatorMember>,
	baking: Baking
): boolean =>
	// an undetailed build's own create is smaller where it has few validators
	baking.detailsErrors &&
	baking.freezes &&
	baking.readsConfig &&
	baking.checksTypes &&
	defaultMembers.every(member => members.has(member))

// V8 compiles `=== undefined` to one comparison, where `??=` and `== null` test the map
export const writeLazyRead = (name: string, initial: string): string =>
	`(${name} === undefined ? (${name} = ${initial}) : ${name})`

export const writeValue = (
	hoisted: boolean,
	name: string,
	expression: string
): string =>
	hoisted ?
		`var ${name}Value\nfunction ${name}() {\n\treturn ${writeLazyRead(`${name}Value`, expression)}\n}`
	:	`const ${name} = /* @__PURE__ */ (() => ${expression})()`

// errors "none"'s root issue, found once read where it defers issues
export const invalidErrorsOf = (defersIssues: boolean): string =>
	defersIssues ?
		"const errors = new runtime.InvalidErrors(data)"
	:	`const errors = new runtime.ArkErrors()
	errors._ = [{ code: "predicate", path: [], data }]`

export const appliedSignature = "(data, onFail) => "

// errors "none" failures as [params, body]
export const failureSources = {
	invalid: [
		"data, onFail",
		(created: string) => `\t${created}
	return onFail ? onFail(errors) : errors`
	],
	invalidCall: [
		"data, args, onFail",
		(created: string) => `\t${created}
	if (args.length) {
		if (args[0]) return runtime.pipedIntoUndetailed(args[0], errors)
		if (args[1] !== undefined) onFail = args[1]
	}
	return onFail ? onFail(errors) : errors`
	],
	applyInvalid: [
		"data, ctx",
		`\tctx.addError({ code: "predicate", path: ctx.path.slice(), data })`
	],
	applyBy: [
		"allows",
		`\treturn (data, ctx) => {
		const depth = ctx.path.length
		if (allows(data, ctx)) return
		ctx.path.length = depth
		ctx.addError({ code: "predicate", path: ctx.path.slice(), data })
	}`
	]
} as const

/** what the issues of a program's validators may hold */
export interface IssueFeatures {
	reportsIndices: boolean
	bracketsKeys: boolean
	writesText: boolean
	readsKeySites: boolean
	runsArktype: boolean
}

export const noIssueFeatures: IssueFeatures = {
	reportsIndices: false,
	bracketsKeys: false,
	writesText: false,
	readsKeySites: false,
	runsArktype: false
}

export interface StandaloneModules {
	code: string
	modules: Record<string, string>
	// [shared function's export name, this factory's index]
	folds: Record<string, [name: string, index: number]>
	// exports that check on creation, so a bundler must keep them
	checking: string[]
	// exports a site reads rather than calls
	values: string[]
	// exports a site creates in place, as a call of names the code exports
	calls: Record<string, string[]>
	issues: IssueFeatures
}

// an input alike to an exported Type but not that node is compiled too, by hash
export const compiledInputsOf = (
	exports: Record<string, StandaloneExport>
): Set<string> => {
	const inputs = new Set<string>()
	for (const value of Object.values(exports)) {
		// as unknown: narrowing to BaseRoot is too deep for TypeScript
		const type: unknown =
			arkKindOf(value) !== undefined ? value
			: "member" in value || "bakes" in value ? undefined
			: (value as StandaloneFactory).type
		if (hasArkKind(type, "root") && type._in !== type && !combines(type))
			inputs.add(type._in.hash)
	}
	return inputs
}

const bakedByRootOf = (
	exports: Record<string, StandaloneExport>,
	baked: Record<string, BakedMembers> = {}
): Map<unknown, BakedMembers> => {
	const result = new Map<unknown, BakedMembers>()
	const add = (value: unknown, members: BakedMembers) => {
		if (hasArkKind(value, "module"))
			for (const entry of Object.values(value)) add(entry, members)
		if (!hasArkKind(value, "root")) return
		const prior = result.get(value)
		result.set(
			value,
			prior ?
				{
					members: [...prior.members, ...members.members],
					lost: prior.lost || members.lost
				}
			:	members
		)
	}
	for (const value of Object.values(exports)) {
		if (arkKindOf(value) !== undefined || !("bakes" in value)) continue
		const { bakes } = value
		const roots = hasArkKind(bakes, "root") ? [bakes] : Object.values(bakes)
		for (const root of roots) add(root, value)
	}
	for (const name in baked) {
		const value = exports[name]
		// as unknown: narrowing to BaseRoot is too deep for TypeScript
		const exported: unknown = value
		add(
			arkKindOf(exported) !== undefined ? exported
			: value && "type" in value ? value.type
			: undefined,
			baked[name]
		)
	}
	return result
}

// what a build writes, decided by its options
export const bakingOf = (
	exports: Record<string, StandaloneExport>,
	opts: StandaloneOptions,
	isModular: boolean
): Baking => {
	const members = opts.members ?? {}
	return {
		members: new Set([
			...defaultMembers.filter(member => members[member] !== false),
			...introspectionMembers.filter(member => members[member])
		]),
		bakedByRoot: bakedByRootOf(exports, opts.baked),
		write: opts.bake ?? (write => write()),
		firstIssue: opts.errors === "first",
		detailsErrors: opts.errors !== "none",
		freezes: opts.freeze !== false,
		readsConfig: opts.configured !== false,
		createsLazily: opts.lazy !== false || opts.hoisted === true,
		compilesValidators: Object.keys(exports).length === 1,
		checksTypes: opts.checks !== "none",
		mutatesInput: opts.mutatesInput,
		jsonInput: opts.jsonInput === true,
		hoisted: opts.hoisted === true,
		shortest: opts.optimize === "size",
		flattens: opts.optimize === "size" && opts.hoisted !== true && isModular,
		combines: opts.combines !== false,
		shapes: opts.shapes === true,
		compiledInputs:
			opts.optimize === "size" ? compiledInputsOf(exports) : new Set(),
		defersIssues: opts.optimize !== "size" && opts.called !== false,
		bakedLimit: opts.bakedLimit ?? defaultBakedLimit,
		called: opts.called !== false,
		readsAllows: opts.readsAllows !== false,
		piped: opts.piped !== false,
		issues: { ...noIssueFeatures }
	}
}

export const writeFixConfig = (configured: Configured): string =>
	configured === false ? ""
	: configured ?
		`runtime.fixConfigured(${JSON.stringify(configured.fingerprint)}, ${JSON.stringify(configured.path)}, ${JSON.stringify(configured.config)})`
	:	"runtime.fixConfig()"
