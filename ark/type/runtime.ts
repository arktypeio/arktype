import type { BaseRoot, RootApply, StandardSchemaV1 } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ArkErrors, runtimeLocale, type Traversal } from "@ark/schema/runtime"
import {
	arityOf,
	Callable,
	getBuiltinNameOfConstructor,
	hasDomain,
	printable,
	prototypeOf,
	throwError,
	type inferred
} from "@ark/util"
import { raisedErrorPhrases } from "./keywords/functions.ts"
import type { ArrayType } from "./variants/array.ts"
import type { DateType } from "./variants/date.ts"
import type { NumberType } from "./variants/number.ts"
import type { ObjectType } from "./variants/object.ts"
import type { TypeParser } from "./type.ts"
import type { StringType } from "./variants/string.ts"

// a bundle with code splitting drops a star export from another package
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
	aliasVisits,
	allowsAcyclic,
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	ArkError,
	ArkErrors,
	arrayIndexMatcher,
	copyNodeContexts,
	copyOf,
	describePredicate,
	isAbsent,
	isArkErrorResult,
	mergeTransformed,
	runtimeConfig,
	runtimeScope,
	TransformErrors,
	Traversal,
	TraversalError
} from "@ark/schema/runtime"
export {
	baseNameOf,
	functionNameOf,
	isValidDate,
	jsTypeOfDescriptions,
	liftArray,
	ParseError,
	printable
} from "@ark/util"
export { assertRuntimeVersion, claimEntry } from "./entry.ts"
export * from "./keywords/functions.ts"

// the predicate writers read a keyword's phrase for an error it raised
Object.assign(runtimeLocale.keywordPhrases, raisedErrorPhrases)

export interface ValidatorAttributes {
	expression: string
	description: string
	meta: ArkEnv.meta
}

// captured when the runtime loads, so a program replacing them later can't keep an artifact from freezing what it creates
export const { assign, freeze, is, preventExtensions } = Object

// read only by the factories of Types that reference a validator, so kept off what a program can read
const holesByValidator = new WeakMap<
	object,
	[id: string, holes: readonly unknown[]]
>()

const throwOnFail: ArkErrors.Handler = errors => errors.throw()

/**
 * #### a Type precompiled to validate without arktype, frozen with what it holds
 */
export class Validator extends Callable<
	(
		data: unknown,
		pipedFromCtx?: Traversal,
		onFail?: ArkErrors.Handler | null
	) => unknown
> {
	expression: string
	description: string
	meta: ArkEnv.meta
	allows: (data: unknown) => boolean
	"~standard": StandardSchemaV1.Props

	constructor(
		rootApply: RootApply,
		node: BaseRoot,
		attributes: ValidatorAttributes,
		// its content address, which a factory receiving it checks
		id: string,
		holes: readonly unknown[] = []
	) {
		super(
			(
				data: unknown,
				pipedFromCtx?: Traversal,
				onFail: ArkErrors.Handler | null = null
			) =>
				pipedFromCtx ? pipedFromCtx.pipe(node, data) : rootApply(data, onFail),
			{ bind: null }
		)
		this.expression = attributes.expression
		this.description = attributes.description
		this.meta = attributes.meta
		this.allows = freeze(node.allows)
		this["~standard"] = freeze({
			vendor: "arktype",
			version: 1,
			validate: freeze((input: unknown) => {
				const out = this(input)
				return out instanceof ArkErrors ? out : { value: out }
			})
		})
		freeze(this.assert)
		freeze(this)
		holesByValidator.set(this, [id, freeze(holes)])
	}

	// defined as an arrow function since it is often detached, e.g. when passing to tRPC
	assert = (data: unknown, pipedFromCtx?: Traversal): unknown =>
		this(data, pipedFromCtx, throwOnFail)

	traverse(
		data: unknown,
		pipedFromCtx?: Traversal
	): ArkErrors | {} | null | undefined {
		return this(data, pipedFromCtx, null) as never
	}

	from(input: unknown): unknown {
		return this.assert(input)
	}

	toString(): string {
		return `Type<${this.expression}>`
	}
}

type typeOnlyMember =
	| typeof inferred
	| "t"
	| "infer"
	| "inferIn"
	| "inferOut"
	| "inferIntrospectableOut"
	| "Symbol"

// introspection a build bakes only when asked, so otherwise absent as on any other validator
type bakedMember = "json" | "toJSON" | "toJsonSchema"

type unavailableMember = Exclude<
	keyof (ArrayType & DateType & NumberType & ObjectType & StringType),
	keyof Validator | keyof Function | typeOnlyMember | bakedMember
>

// each composes or introspects a node, which a standalone validator doesn't have
const unavailableMembers = {
	$: "property",
	and: "method",
	array: "method",
	as: "method",
	atLeast: "method",
	atLeastLength: "method",
	atMost: "method",
	atMostLength: "method",
	atOrAfter: "method",
	atOrBefore: "method",
	brand: "method",
	configure: "method",
	default: "method",
	describe: "method",
	distribute: "method",
	divisibleBy: "method",
	earlierThan: "method",
	equals: "method",
	exactlyLength: "method",
	exclude: "method",
	extends: "method",
	extract: "method",
	filter: "method",
	get: "method",
	ifEquals: "method",
	ifExtends: "method",
	in: "property",
	internal: "property",
	intersect: "method",
	keyof: "method",
	laterThan: "method",
	lessThan: "method",
	lessThanLength: "method",
	map: "method",
	matching: "method",
	merge: "method",
	moreThan: "method",
	moreThanLength: "method",
	narrow: "method",
	omit: "method",
	onDeepUndeclaredKey: "method",
	onUndeclaredKey: "method",
	optional: "method",
	or: "method",
	out: "property",
	overlaps: "method",
	partial: "method",
	pick: "method",
	pipe: "method",
	precompilation: "property",
	props: "property",
	readonly: "method",
	required: "method",
	select: "method",
	to: "method"
} satisfies Record<unavailableMember, "method" | "property">

for (const [name, kind] of Object.entries(unavailableMembers)) {
	const throwUnavailable = () => throwError(writeUnavailableMemberMessage(name))
	Object.defineProperty(
		Validator.prototype,
		name,
		kind === "method" ? { value: throwUnavailable } : { get: throwUnavailable }
	)
}

// every validator shares it, so replacing one of its methods would change them all
for (const k of Reflect.ownKeys(Validator.prototype)) {
	const { value, get } = Object.getOwnPropertyDescriptor(
		Validator.prototype,
		k
	)!
	if (k !== "constructor") freeze(value ?? get)
}
freeze(Validator.prototype)

// each parses or composes a Type, which the runtime can't
const unavailableStatics = {
	$: 1,
	and: 1,
	Array: 1,
	arrayIndex: 1,
	bigint: 1,
	boolean: 1,
	Date: 1,
	declare: 1,
	define: 1,
	enumerated: 1,
	false: 1,
	fn: 1,
	generic: 1,
	hkt: 1,
	instanceOf: 1,
	Key: 1,
	keywords: 1,
	match: 1,
	merge: 1,
	module: 1,
	never: 1,
	null: 1,
	number: 1,
	object: 1,
	or: 1,
	pipe: 1,
	raw: 1,
	Record: 1,
	schema: 1,
	scope: 1,
	string: 1,
	symbol: 1,
	true: 1,
	undefined: 1,
	unit: 1,
	unknown: 1,
	valueOf: 1
} satisfies Record<Exclude<keyof TypeParser, "errors">, 1>

const typeFacade = assign(
	() => throwError(writeUnavailableMemberMessage("type")),
	{ errors: ArkErrors }
)

for (const name in unavailableStatics) {
	Object.defineProperty(typeFacade, name, {
		get: () => throwError(writeUnavailableMemberMessage(`type.${name}`))
	})
}

export const type: { (): never; errors: typeof ArkErrors } = freeze(typeFacade)

export type HoleKind = "function" | "class" | "symbol"

// what a factory's code depends on in a hole it receives, described the same way at build
export const describeHole = (
	hole: unknown,
	kind: HoleKind,
	classes: Record<string, unknown> = {}
): string => {
	if (kind === "symbol" || typeof hole !== "function" || isValidator(hole))
		return describeValue(hole)
	const builtinName = getBuiltinNameOfConstructor(hole)
	if (builtinName) return `the builtin ${builtinName}`
	if (kind === "function") {
		const arity = arityOf(hole)
		return `a function of ${
			arity === 0 ? "no parameters"
			: arity === 1 ? "1 parameter"
			: "2 or more parameters"
		}`
	}
	const { prototype } = hole
	if (!hasDomain(prototype, "object")) return "a function without a prototype"
	// arktype compares a class with the builtins and the other classes a definition holds
	const ancestors: string[] = []
	for (
		let ancestor = prototypeOf(prototype);
		ancestor;
		ancestor = prototypeOf(ancestor)
	) {
		const { constructor } = ancestor
		const ancestorName =
			typeof constructor === "function" &&
			constructor.prototype === ancestor &&
			getBuiltinNameOfConstructor(constructor)
		if (ancestorName) ancestors.push(ancestorName)
		for (const label in classes) {
			if ((classes[label] as Function).prototype === ancestor)
				ancestors.push(label)
		}
	}
	return ancestors.length ?
			`a class extending ${ancestors.join(", ")}`
		:	"a class"
}

// how a definition reads an object: its prototype and keys, or the instant or pattern it holds
export const describeShape = (value: unknown): string => {
	if (!hasDomain(value, "object")) return describeValue(value)
	if (value instanceof Date) return `a Date at ${getTime.call(value)}`
	if (value instanceof RegExp) return `the RegExp ${value}`
	if (Array.isArray(value)) return `an array of length ${value.length}`
	const prototype = prototypeOf(value)
	return prototype === Object.prototype || prototype === null ?
			`${prototype ? "an object" : "a null-prototype object"} with keys ${printable(Reflect.ownKeys(value))}`
		:	describeValue(value)
}

export const checkFacts = (
	actual: string,
	expected: string,
	label: string
): void => {
	if (actual !== expected)
		throwError(writeCreationMismatchMessage(label, actual, expected))
}

export const checkInput = (
	value: unknown,
	expected: unknown,
	label: string
): void => {
	if (!is(value, expected)) {
		throwError(
			writeCreationMismatchMessage(
				label,
				describeValue(value),
				printable(expected)
			)
		)
	}
}

// the holes a referenced validator was created with, if it was created from the content the build read
export const holesOf = (
	validator: unknown,
	id: string,
	expected: string,
	label: string
): readonly unknown[] => {
	const created = holesByValidator.get(validator as object)
	return created?.[0] === id ?
			created[1]
		:	throwError(
				writeCreationMismatchMessage(label, describeValue(validator), expected)
			)
}

// where a test driver's modules register what they export, by module and export name
const helpersKey = Symbol.for("arktype.helpers")

// a mock is another function, and a module a test runner replaced registered nothing, so either fails
export const checkHelper = (
	helper: unknown,
	file: string,
	name: string,
	label: string
): void => {
	const registered = (
		Reflect.get(globalThis, helpersKey) as
			| Record<string, Record<string, unknown>>
			| undefined
	)?.[file]
	if (!registered || !(name in registered) || registered[name] !== helper) {
		throwError(
			writeCreationMismatchMessage(
				label,
				describeValue(helper),
				`the function ${file} exports as \`${name}\``
			)
		)
	}
}

const { getTime } = Date.prototype

const isValidator = (value: unknown) => holesByValidator.has(value as object)

// a symbol's description is printed in the messages of a Type keyed by it
const describeValue = (value: unknown) =>
	isValidator(value) ? String(value) : printable(value)

export const writeUnavailableMemberMessage = <name extends string>(
	name: name
): writeUnavailableMemberMessage<name> =>
	`${name} is unavailable in a standalone validator, which runs without arktype, so using it requires building with runtime: "arktype"`

export type writeUnavailableMemberMessage<name extends string> =
	`${name} is unavailable in a standalone validator, which runs without arktype, so using it requires building with runtime: "arktype"`

export const writeCreationMismatchMessage = <
	label extends string,
	actual extends string,
	expected extends string
>(
	label: label,
	actual: actual,
	expected: expected
): writeCreationMismatchMessage<label, actual, expected> =>
	`${label} is ${actual}, but was precompiled as ${expected}`

export type writeCreationMismatchMessage<
	label extends string,
	actual extends string,
	expected extends string
> = `${label} is ${actual}, but was precompiled as ${expected}`
