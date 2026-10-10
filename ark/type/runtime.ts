import type { BaseRoot, Locale, RootApply, StandardSchemaV1 } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	afterWriters,
	ArkErrors,
	beforeWriters,
	discriminantWriters,
	divisorWriters,
	domainWriters,
	exactLengthWriters,
	intersectionWriters,
	maxLengthWriters,
	maxWriters,
	minLengthWriters,
	minWriters,
	patternWriters,
	protoWriters,
	requiredWriters,
	runtimeConfig,
	undeclaredWriters,
	unionWriters,
	unitWriters,
	writePredicateActual,
	writePredicateExpected,
	writePredicateProblem,
	writeProblem,
	type ErrorWritersByCode,
	type Traversal
} from "@ark/schema/runtime"
import {
	arityOf,
	Callable,
	functionNameOf,
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
import type { StringType } from "./variants/string.ts"

// a bundle with code splitting drops a star export from another package
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
	afterWriters,
	aliasVisits,
	allowsAcyclic,
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	ArkErrors,
	arrayIndexMatcher,
	beforeWriters,
	byAncestorPath,
	byPath,
	computeDefaultValueMorph,
	configure,
	copyOf,
	describePredicate,
	discriminantWriters,
	divisorWriters,
	domainWriters,
	exactLengthWriters,
	errorFromContext,
	fixConfig,
	flatByPath,
	flatProblemsByPath,
	InternalTraversal,
	intersectionWriters,
	isAbsent,
	isArkErrorResult,
	maxLengthWriters,
	maxWriters,
	mergeTransformed,
	messageIn,
	minLengthWriters,
	minWriters,
	patternWriters,
	protoWriters,
	raising,
	registerErrorBuilder,
	requiredWriters,
	runtimeConfig,
	runtimeScope,
	scopeConfig,
	TransformErrors,
	Traversal,
	TraversalError,
	undeclaredWriters,
	unionWriters,
	unitWriters,
	type ArkError
} from "@ark/schema/runtime"
export {
	baseNameOf,
	functionNameOf,
	isValidDate,
	jsTypeOfDescriptions,
	liftArray,
	ParseError,
	printable,
	printCompact
} from "@ark/util"
export { assertRuntimeVersion, claimEntry } from "./entry.ts"
export * from "./keywords/functions.ts"

// en as predicate's writers read it to write an error a keyword raised through ctx
const keywordLocale = {
	keywordPhrases: raisedErrorPhrases,
	problem: writeProblem
} as {} as Locale

/** predicate's writers in en, which write an error a keyword raised with its phrase */
export const predicateWriters: ErrorWritersByCode["predicate"] = {
	expected: writePredicateExpected,
	actual: (data, ctx) => writePredicateActual(data, ctx, keywordLocale),
	problem: ctx => writePredicateProblem(ctx, keywordLocale)
}

/** en's writers of every code, which a validator with callbacks registers since they can raise any */
export const allErrorWriters: ErrorWritersByCode = {
	after: afterWriters,
	before: beforeWriters,
	divisor: divisorWriters,
	domain: domainWriters,
	exactLength: exactLengthWriters,
	intersection: intersectionWriters,
	max: maxWriters,
	maxLength: maxLengthWriters,
	min: minWriters,
	minLength: minLengthWriters,
	pattern: patternWriters,
	predicate: predicateWriters,
	proto: protoWriters,
	required: requiredWriters,
	union: unionWriters,
	unit: unitWriters,
	undeclared: undeclaredWriters,
	discriminant: discriminantWriters
}

export interface ValidatorAttributes {
	expression: string
	description: string
	meta: ArkEnv.meta
}

// captured when the runtime loads, so a program replacing them later can't keep an artifact from freezing what it creates
export const { assign, defineProperties, freeze, is, preventExtensions } =
	Object

// read only by the factories of Types that reference a validator, so kept off what a program can read
const holesByValidator = new WeakMap<
	object,
	[id: string, holes: readonly unknown[], names: readonly unknown[]]
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
		id: string,
		holes: readonly unknown[] = []
	) {
		// the configuration is fixed before any validator is created
		const configuredOnFail = runtimeConfig.onFail
		super(
			(
				data: unknown,
				pipedFromCtx?: Traversal,
				onFail: ArkErrors.Handler | null = configuredOnFail
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
		holesByValidator.set(this, [
			id,
			freeze(holes),
			holes.map(functionNameOfHole)
		])
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

// what a Type has that a validator lacks, so reading it reads undefined
export type unavailableMember = Exclude<
	keyof (ArrayType & DateType & NumberType & ObjectType & StringType),
	keyof Validator | keyof Function | typeOnlyMember | bakedMember
>

// every validator shares it, so replacing one of its methods would change them all
for (const k of Reflect.ownKeys(Validator.prototype)) {
	const { value, get } = Object.getOwnPropertyDescriptor(
		Validator.prototype,
		k
	)!
	if (k !== "constructor") freeze(value ?? get)
}
freeze(Validator.prototype)

// arktype's parser, of which the runtime has only the class of the errors a validator returns
export const type: { errors: typeof ArkErrors } = /* @__PURE__ */ freeze({
	errors: ArkErrors
})

export type ModuleMembers = { [k: string]: true | ModuleMembers }

// arktype's keyword Modules create each Type when it's first read, so reading the Module fixes no configuration
export const lazyModule = (
	members: ModuleMembers,
	load: () => Record<string, unknown>
): object => {
	const descriptors: PropertyDescriptorMap = {}
	for (const k in members) {
		const member = members[k]
		let module: object | undefined
		descriptors[k] = {
			enumerable: true,
			get:
				member === true ?
					() => load()[k]
				:	() => (module ??= lazyModule(member, () => load()[k] as never))
		}
	}
	return freeze(defineProperties({}, descriptors))
}

export type HoleKind = "function" | "class" | "symbol"

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

export const checkIdentity = (
	value: unknown,
	expected: unknown,
	label: string,
	expectedLabel: string
): void => {
	if (value !== expected)
		throwError(writeIdentityMismatchMessage(label, expectedLabel))
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

export const holesOf = (
	validator: unknown,
	id: string,
	label: string,
	// omitted when it prints a hole's name, which is known only once received
	expressionOf?: () => string
): readonly unknown[] => {
	const created = holesByValidator.get(validator as object)
	if (created?.[0] !== id) {
		const actual = describeValue(validator)
		const expected =
			expressionOf ? `Type<${expressionOf()}>` : "the Type it was at build"
		return throwError(
			writeCreationMismatchMessage(
				label,
				// a Type's expression leaves out what can differ, like a predicate
				actual === expected ? `another ${actual}` : actual,
				expected
			)
		)
	}
	// its strings print its holes' names as they were when it was created, which a factory reading them again would miss
	const [, holes, names] = created
	for (let i = 0; i < holes.length; i++) {
		const name = functionNameOfHole(holes[i])
		if (name !== names[i]) {
			throwError(
				writeRenamedHoleMessage(
					label,
					i,
					JSON.stringify(name),
					JSON.stringify(names[i])
				)
			)
		}
	}
	return holes
}

// a hole is held weakly, as arktype holds a Type it may return again, so a function created for one call doesn't outlive it
class InternTable {
	value: unknown = undefined
	private readonly tablesByObject = new WeakMap<object, InternTable>()
	// a symbol is a WeakMap key only in engines since ES2023
	private readonly tablesByValue = new Map<unknown, InternTable>()

	next(hole: unknown): InternTable {
		const tables =
			hasDomain(hole, "object") ? this.tablesByObject : this.tablesByValue
		let next = tables.get(hole as never)
		if (!next) tables.set(hole as never, (next = new InternTable()))
		return next
	}
}

export const internTable = (): InternTable => new InternTable()

const valuesByAddress = new Map<string, unknown>()

// arktype holds one object under its address wherever a program reaches it, so every artifact creating it reads the first
export const addressed = <value>(
	address: string,
	create: () => value
): value => {
	let value = valuesByAddress.get(address)
	if (value === undefined) valuesByAddress.set(address, (value = create()))
	return value as value
}

// a meta is created where it's read, since a literal is cheaper than a function creating it
export const addressedMeta = (address: string, meta: object): object => {
	let held = valuesByAddress.get(address)
	if (held === undefined) valuesByAddress.set(address, (held = freeze(meta)))
	return held as object
}

// arktype returns the Type it created before for one definition and the same holes, so its factory does too
export const intern = <value>(
	table: InternTable,
	holes: readonly unknown[],
	create: () => value
): value => {
	for (const hole of holes) table = table.next(hole)
	return (table.value ??= create()) as value
}

const functionNameOfHole = (hole: unknown) =>
	typeof hole === "function" ? functionNameOf(hole) : undefined

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

const describeValue = (value: unknown) =>
	isValidator(value) ? String(value) : printable(value)

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

export const writeIdentityMismatchMessage = <
	label extends string,
	expectedLabel extends string
>(
	label: label,
	expectedLabel: expectedLabel
): writeIdentityMismatchMessage<label, expectedLabel> =>
	`${label} is not ${expectedLabel}, which it was at build`

export type writeIdentityMismatchMessage<
	label extends string,
	expectedLabel extends string
> = `${label} is not ${expectedLabel}, which it was at build`

export const writeRenamedHoleMessage = <
	label extends string,
	index extends number,
	name extends string,
	createdName extends string
>(
	label: label,
	index: index,
	name: name,
	createdName: createdName
): writeRenamedHoleMessage<label, index, name, createdName> =>
	`${label}'s hole ${index} is a function named ${name}, but was named ${createdName} when ${label} was created`

export type writeRenamedHoleMessage<
	label extends string,
	index extends number,
	name extends string,
	createdName extends string
> = `${label}'s hole ${index} is a function named ${name}, but was named ${createdName} when ${label} was created`
