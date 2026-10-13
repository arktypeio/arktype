import type {
	BaseRoot,
	JsonSchema,
	RootApply,
	StandardJSONSchemaV1,
	StandardSchemaV1
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	ArkErrors,
	errorsOf,
	mergeIssues,
	runtimeConfig,
	supportedJsonSchemaTargets,
	validateStandardJsonSchemaTarget,
	type CompactApply,
	type FailHandler,
	type InternalTraversal,
	type Traversal
} from "@ark/schema/runtime"
import {
	dateGetTime,
	getBuiltinNameOfConstructor,
	hasDomain,
	prototypeOf,
	throwError,
	throwParseError,
	type Fn,
	type inferred,
	type JsonStructure
} from "@ark/util"
import { InternalTypedFn } from "./fn.ts"
import type { FoldedMember, introspectionMembers } from "./standalone.ts"
import type { ArrayType } from "./variants/array.ts"
import type { DateType } from "./variants/date.ts"
import type { NumberType } from "./variants/number.ts"
import type { ObjectType } from "./variants/object.ts"
import type { StringType } from "./variants/string.ts"

// a bundle with code splitting drops a star export from another package
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
	addErrors,
	addTransformErrors,
	aliasVisits,
	allowsAcyclic,
	allowsInBranch,
	allowsInBranchBy,
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	applyRejected,
	ArkErrors,
	arrayIndexMatcher,
	callMorph,
	computeDefaultValueMorph,
	configure,
	copyOf,
	describePredicate,
	enterApplied,
	enterResolution,
	exitResolution,
	exitApplied,
	FirstIssues,
	FirstIssueTraversal,
	fixConfig,
	fixConfigured,
	InternalTraversal,
	isAbsent,
	mergeTransformed,
	pipe,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	runtimeConfig,
	runtimeScope,
	throwOnDefault,
	TransformErrors,
	transformed,
	transformedInApply,
	transformIfAllowed,
	transformResolution,
	transformsValid,
	Traversal,
	TraversalError,
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
	throwParseError
} from "@ark/util"
export * from "./keywords/functions.ts"

export interface ValidatorAttributes {
	meta: ArkEnv.meta
	// what a build's introspection option bakes, each a getter throwing from the shared prototype unless it lists it
	expression?: string
	description?: string
	json?: JsonStructure
	toJSON?: () => JsonStructure
	toJsonSchema?: () => JsonSchema
	"~standard"?: Pick<StandardJSONSchemaV1.Props, "jsonSchema">
}

export type IntrospectionMember = (typeof introspectionMembers)[number]

// captured when the runtime loads, so a program replacing them later can't keep an artifact from freezing what it creates, each declared alone since a bundle keeps every name a destructuring declares
export const assign = Object.assign
export const defineProperties = Object.defineProperties
export const freeze = Object.freeze
export const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors
export const is = Object.is
export const setPrototypeOf = Object.setPrototypeOf

// read only by the factories of what references a validator, Module, Scope or Generic, so kept off what a program can read
const holesByValue = new WeakMap<
	object,
	[id: string, holes: readonly unknown[]]
>()

const throwOnFail: ArkErrors.Handler = errors => errors.throw()

/**
 * #### a Type precompiled to validate without arktype, frozen with what it holds
 */
export interface Validator {
	(
		data: unknown,
		pipedFromCtx?: Traversal,
		onFail?: ArkErrors.Handler | null
	): unknown
}

// what every validator inherits, as the prototype createValidator gives the function it creates
export class Validator {
	declare expression: string
	declare description: string
	declare meta: ArkEnv.meta
	declare allows: (data: unknown) => boolean
	declare assert: (data: unknown, pipedFromCtx?: Traversal) => unknown
	declare "~standard": StandardSchemaV1.Props

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

export const createValidator = (
	rootApply: RootApply,
	node: BaseRoot,
	attributes: ValidatorAttributes,
	id: string,
	holes: readonly unknown[] = []
): Validator => {
	// the configuration is fixed before any validator is created, though a Type's meta can name its own, as a matcher asserting its default does
	const configuredOnFail = attributes.meta.onFail ?? runtimeConfig.onFail
	const validator: Validator = setPrototypeOf(
		(
			data: unknown,
			pipedFromCtx?: Traversal,
			onFail: FailHandler | null = configuredOnFail
		) => {
			if (!pipedFromCtx) return rootApply(data, onFail)
			const out = rootApply(data, null)
			if (!(out instanceof ArkErrors)) return out
			const errors = errorsOf(pipedFromCtx)
			// arktype's errors take what it writes as they take a morph's returned errors, even from another copy of arktype, and a validator's traversal merges the errors it returns
			if (!errors._merge) return out
			errors._merge(out, pipedFromCtx.path)
			return errors
		},
		Validator.prototype
	)
	// an own arrow function, since it is often detached, e.g. when passing to tRPC
	validator.assert = freeze((data: unknown, pipedFromCtx?: Traversal) =>
		validator(data, pipedFromCtx, throwOnFail)
	)
	// defined rather than assigned, since the shared prototype has only a getter for each
	defineProperties(validator, getOwnPropertyDescriptors(attributes))
	validator.allows = freeze(node.allows)
	validator["~standard"] = freeze({
		vendor: "arktype",
		version: 1,
		validate: freeze((input: unknown) => {
			const out = validator(input)
			return out instanceof ArkErrors ? out : { value: out }
		}),
		...attributes["~standard"]
	})
	return holdHoles(freeze(validator), id, holes)
}

type ValidatorParts = [
	rootApply: RootApply,
	node: BaseRoot,
	attributes: ValidatorAttributes,
	id: string
]

const copiesByParts = /* @__PURE__ */ new WeakMap<ValidatorParts, InternTable>()

// a factory whose Type's code holds nothing it receives constructs the validator written once, keyed by the functions it receives, once for each
export const rekeyed = (
	parts: ValidatorParts,
	holes: readonly unknown[]
): Validator => {
	let copies = copiesByParts.get(parts)
	if (!copies) copiesByParts.set(parts, (copies = new InternTable()))
	return intern(copies, holes, () => createValidator(...parts, holes))
}

type typeOnlyMember =
	| typeof inferred
	| "t"
	| "infer"
	| "inferIn"
	| "inferOut"
	| "inferIntrospectableOut"
	| "Symbol"

// what a Type has that a validator lacks, so reading it reads undefined
export type unavailableMember = Exclude<
	keyof (ArrayType & DateType & NumberType & ObjectType & StringType),
	keyof Validator | keyof Function | typeOnlyMember | IntrospectionMember
>

// a member the build's introspection option doesn't list throws where it's read, as it can't be written at runtime
for (const k of [
	"expression",
	"description",
	"json",
	"toJSON",
	"toJsonSchema"
] satisfies FoldedMember[]) {
	Object.defineProperty(Validator.prototype, k, {
		get: () => throwError(writeUnlistedMemberMessage(k))
	})
}

// arktype's prototypes are per node kind, so a method replaced on the one every validator shares would change Types of other kinds
freeze(Validator.prototype)

// a target's is 0 where the validator doesn't bake its schema
export const bakedJsonSchema = (
	write: () => JsonSchema,
	byTarget: readonly ((() => JsonSchema) | 0)[]
): ((opts?: { target?: unknown }) => JsonSchema) =>
	freeze((opts?: { target?: unknown }) => {
		// arktype merges the keys a for...in loop reads
		const keys: string[] = []
		for (const k in opts) keys.push(k)
		if (!keys.length) return write()
		const written =
			keys.length === 1 &&
			keys[0] === "target" &&
			byTarget[supportedJsonSchemaTargets.indexOf(opts!.target as never)]
		return written ? written() : throwError(bakedJsonSchemaOptionsMessage)
	})

type JsonSchemaWritersByTarget = readonly (() => JsonSchema)[]

export const bakedStandardJsonSchema = (
	input: JsonSchemaWritersByTarget,
	output: JsonSchemaWritersByTarget
): StandardJSONSchemaV1.Converter =>
	freeze({
		input: freeze((opts: StandardJSONSchemaV1.Options) =>
			writeStandardJsonSchema(input, opts)
		),
		output: freeze((opts: StandardJSONSchemaV1.Options) =>
			writeStandardJsonSchema(output, opts)
		)
	})

const writeStandardJsonSchema = (
	writers: JsonSchemaWritersByTarget,
	opts: StandardJSONSchemaV1.Options
) => {
	const i = supportedJsonSchemaTargets.indexOf(
		validateStandardJsonSchemaTarget(opts.target)
	)
	if (opts.libraryOptions && Object.keys(opts.libraryOptions).length)
		throwError(bakedJsonSchemaOptionsMessage)
	return writers[i]() as Record<string, unknown>
}

class ToJsonSchemaError extends Error {
	readonly name = "ToJsonSchemaError"
	readonly code: string
	readonly context: object

	constructor(code: string, message: string, context: object) {
		super(message)
		this.code = code
		this.context = context
	}

	hasCode(code: string): boolean {
		return this.code === code
	}
}

export const throwJsonSchemaError = (
	code: string,
	message: string,
	context: object
): never => {
	throw new ToJsonSchemaError(code, message, context)
}

export const throwUnbaked = (reason: string): never =>
	throwError(writeUnbakedMessage(reason))

// arktype's own wrapper, so its name, members and expression are those arktype gives the function the program passes
export const typedFn = (
	raw: Fn,
	params: Validator,
	returns: Validator
): InternalTypedFn =>
	freeze(new InternalTypedFn(raw, params as never, returns as never))

// arktype's parser, of which the runtime has only the class of the errors a validator returns
export const type: { errors: typeof ArkErrors } = /* @__PURE__ */ freeze({
	errors: ArkErrors
})

// a root whose Apply is compact reports what fails into the errors it returns, so a program whose roots all are loads no Traversal
export const applyErrors = (
	node: { traverseApply: CompactApply },
	data: unknown,
	config: unknown,
	onFail: ArkErrors.Handler | null,
	Ctx: new (data: unknown, config: unknown) => ArkErrors | InternalTraversal
): unknown => {
	const ctx = new Ctx(data, config)
	node.traverseApply(data, ctx)
	const errors = ctx instanceof ArkErrors ? ctx : ctx._errors
	return (
		!errors?.count ? data
		: onFail ? onFail(errors)
		: errors
	)
}

export type HoleKind = "function" | "class" | "symbol"

// a function's parameter count, 0, 1 or 2 or more, which arktype tells functions apart by, or what describes another hole
export type HoleFact = string | number

export const factOfHole = (
	hole: unknown,
	kind: HoleKind = "function",
	classes: Record<string, unknown> = {}
): HoleFact => {
	if (kind === "symbol" || typeof hole !== "function" || isValidator(hole))
		return describeValue(hole)
	// a builtin's count is read like any other function's
	if (kind === "function") return Math.min(hole.length, 2)
	const builtinName = getBuiltinNameOfConstructor(hole)
	if (builtinName) return `the builtin ${builtinName}`
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
	if (value instanceof Date) return `a Date at ${dateGetTime.call(value)}`
	if (value instanceof RegExp) return `the RegExp ${value}`
	if (Array.isArray(value)) return `an array of length ${value.length}`
	const prototype = prototypeOf(value)
	return prototype === Object.prototype || prototype === null ?
			`${prototype ? "an object" : "a null-prototype object"} with keys ${Reflect.ownKeys(value).map(String).join(", ")}`
		:	describeValue(value)
}

export const checkFacts = (
	actual: HoleFact,
	expected: HoleFact,
	label: string
): void => {
	if (actual !== expected) {
		throwError(
			writeCreationMismatchMessage(
				label,
				describeFact(actual),
				describeFact(expected)
			)
		)
	}
}

export const describeFact = (fact: HoleFact): string =>
	typeof fact === "string" ? fact : (
		`a function of ${
			fact === 0 ? "no parameters"
			: fact === 1 ? "1 parameter"
			: "2 or more parameters"
		}`
	)

export const checkIdentity = (
	value: unknown,
	expected: unknown,
	label: string,
	expectedLabel: string
): void => {
	if (value !== expected)
		throwError(writeIdentityMismatchMessage(label, expectedLabel))
}

// a default's checked Type and value, keyed by their content and the functions they hold
export type DefaultKey = [id: string, holes: readonly unknown[]]

const checkedDefaultOf = ([id, holes]: DefaultKey): InternTable => {
	let table = checkedDefaults.next(id)
	for (const hole of holes) table = table.next(hole)
	return table
}

// arktype checks a default on a narrowed Type where it creates the node holding it, throwing its errors in en as a ParseError
export const checkDefault = (
	validator: Validator,
	value: unknown,
	key: PropertyKey | null,
	defaultKey: DefaultKey
): void => {
	const checked = checkedDefaultOf(defaultKey)
	if (checked.value) return
	const out = validator.traverse(value)
	if (out instanceof ArkErrors) {
		if (key === null) throwParseError(`Default ${out.summary}`)
		const atPath = new ArkErrors()
		mergeIssues(atPath, out, [key])
		throwParseError(`Default for ${atPath.summary}`)
	}
	checked.value = true
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
				describeValue(expected)
			)
		)
	}
}

// a module's progress is `undefined` before its body runs
export const checkProgress = (
	progress: number | undefined,
	at: number,
	name: string
): void => {
	if (progress === undefined || progress < at)
		throw new ReferenceError(`Cannot access '${name}' before initialization`)
}

export const checkFunction = (value: unknown, label: string): void => {
	if (typeof value !== "function") {
		throwError(
			writeCreationMismatchMessage(label, describeValue(value), "a function")
		)
	}
}

// e.g. a Scope's stand-in, whose holes the factory of each Type defined in it takes
export const holdHoles = <value extends object>(
	value: value,
	id: string,
	holes: readonly unknown[] = []
): value => {
	holesByValue.set(value, [id, freeze(holes)])
	return value
}

export const holesOf = (
	holder: unknown,
	id: string,
	label: string,
	kind: "Type" | "Module" | "Scope" | "Generic" = "Type"
): readonly unknown[] => {
	const created = holesByValue.get(holder as object)
	if (created?.[0] !== id) {
		// described by its kind rather than printed, so a bundle receiving Types ships no printer; the label names the binding
		const actual =
			isValidator(holder) ?
				Reflect.getOwnPropertyDescriptor(holder, "expression") ?
					`another ${holder}`
				:	"another Type"
			: created ? `another ${kind}`
			: holder === null ? "null"
			: typeof holder === "object" ? "an object"
			: holder === undefined ? "undefined"
			: `a ${typeof holder}`
		return throwError(
			writeCreationMismatchMessage(label, actual, `the ${kind} it was at build`)
		)
	}
	return created[1]
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

const checkedDefaults = /* @__PURE__ */ new InternTable()

// a factory returns what it created before for the same holes, since creating it at each call is many times slower
export const intern = <value>(
	table: InternTable,
	holes: readonly unknown[],
	create: () => value,
	// defaults the definition reaches, which a definition creating the Type first may not have checked
	defaults: readonly DefaultKey[] = []
): value => {
	for (const hole of holes) table = table.next(hole)
	if (
		table.value !== undefined &&
		defaults.some(key => !checkedDefaultOf(key).value)
	)
		create()
	return (table.value ??= create()) as value
}

const helpersKey = /* @__PURE__ */ Symbol.for("arktype.helpers")

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

const isValidator = (value: unknown) => value instanceof Validator

// an object is described by its kind, as printing it would ship a serializer, and so is a validator lacking its expression
const describeValue = (value: unknown) =>
	isValidator(value) ?
		Reflect.getOwnPropertyDescriptor(value, "expression") ?
			String(value)
		:	"a Type"
	: typeof value === "string" ? JSON.stringify(value)
	: typeof value === "function" ? "a function"
	: value !== null && typeof value === "object" ? "an object"
	: String(value)

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

export const writeUnlistedMemberMessage = <member extends string>(
	member: member
): writeUnlistedMemberMessage<member> =>
	`${member} isn't in the build's introspection option`

export type writeUnlistedMemberMessage<member extends string> =
	`${member} isn't in the build's introspection option`

export const bakedJsonSchemaOptionsMessage =
	"a standalone validator's JSON Schema is written at build under the program's configuration, so it takes no options but a target whose schema it bakes. Configure them with configure({ toJsonSchema }), or build with runtime: \"arktype\"."

export type bakedJsonSchemaOptionsMessage = typeof bakedJsonSchemaOptionsMessage

export const writeUnbakedMessage = <reason extends string>(
	reason: reason
): writeUnbakedMessage<reason> =>
	`${reason}. Build with runtime: "arktype" to write it where it's read.`

export type writeUnbakedMessage<reason extends string> =
	`${reason}. Build with runtime: "arktype" to write it where it's read.`

export const emptyMeta: ArkEnv.meta = /* @__PURE__ */ freeze({})

// a node's json is shared by every node whose json prints the same, so it's frozen through
export const deepFreeze = <t>(value: t): t => {
	if (value && typeof value === "object")
		for (const k in freeze(value)) deepFreeze(value[k])
	return value
}
