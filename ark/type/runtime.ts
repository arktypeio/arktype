import type {
	JsonSchema,
	RootApply,
	StandardJSONSchemaV1,
	StandardSchemaV1
} from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	ArkErrors,
	enInfo,
	errorsOf,
	FirstIssues,
	issuesOf,
	mergeIssues,
	messageOf,
	problemOf,
	runtimeConfig,
	supportedJsonSchemaTargets,
	throwOnDefault,
	validateStandardJsonSchemaTarget,
	type ArkError,
	type ArkErrorCode,
	type ArkErrorInput,
	type ArkIssue,
	type CompactApply,
	type FailHandler,
	type FailureContext,
	type FailureSite,
	type InternalTraversal,
	type SiteContext,
	type Traversal
} from "@ark/schema/runtime"
import {
	dateGetTime,
	getBuiltinNameOfConstructor,
	hasDomain,
	prototypeOf,
	stringifyPath,
	throwError,
	throwParseError,
	type Fn,
	type inferred,
	type JsonStructure
} from "@ark/util"
import { InternalTypedFn } from "./fn.ts"
import type { introspectionMembers } from "./standalone.ts"
import type { ArrayType } from "./variants/array.ts"
import type { DateType } from "./variants/date.ts"
import type { NumberType } from "./variants/number.ts"
import type { ObjectType } from "./variants/object.ts"
import type { StringType } from "./variants/string.ts"

// a bundle with code splitting drops a star export from another package
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
	addErrors,
	addMorphErrs,
	aliasVisits,
	allowsAcyclic,
	allowsInBranch,
	allowsInBranchBy,
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	applyIssues,
	applyRejected,
	ArkErrors,
	arrayIndexMatcher,
	callMorph,
	computeDefaultValueMorph,
	configure,
	configuredWriterOf,
	copyOf,
	describeCollapsibleDate,
	describePredicate,
	disallowed,
	enInfo,
	enterApplied,
	enterResolution,
	execMorph,
	exitResolution,
	exitApplied,
	FirstIssues,
	FirstIssueTraversal,
	fixConfig,
	foundErrors,
	fixConfigured,
	holdsOnlyIndices,
	keepOwn,
	InternalTraversal,
	matchesRepeated,
	mergeTransformed,
	pipe,
	pipeApplied,
	pipeChecked,
	pipeTransformed,
	printKind,
	rejected,
	rejects,
	runtimeConfig,
	runtimeScope,
	throwIssues,
	throwOnDefault,
	TransformErrors,
	transformed,
	transformedInApply,
	transformIfAllowed,
	transformResolution,
	transformsValid,
	Traversal,
	TraversalError,
	tryMorph,
	writeDomainActual,
	writeLengthActual,
	writeMinLengthActual,
	writeNotEqualActual,
	writeProblem,
	writeProtoActual,
	writeUnitActual,
	writeUnitProblem,
	type ArkError
} from "@ark/schema/runtime"
export {
	baseNameOf,
	functionNameOf,
	isIpv4,
	isIpv6,
	isIso8601,
	isNumericString,
	isPlainObjectOrArray,
	isUuid,
	isValidDate,
	isWellFormedInteger,
	jsTypeOfDescriptions,
	liftArray,
	ParseError,
	printable,
	throwParseError,
	timeOf
} from "@ark/util"
export * from "./checkers.ts"
export * from "./keywords/functions.ts"

export interface ValidatorAttributes {
	meta: ArkEnv.meta
	expression?: string
	description?: string
	json?: JsonStructure
	toJSON?: () => JsonStructure
	toJsonSchema?: () => JsonSchema
	"~standard"?: Pick<StandardJSONSchemaV1.Props, "jsonSchema">
}

export type IntrospectionMember = (typeof introspectionMembers)[number]

// each precompiled module imports it, so another version's runtime fails to link
export const precompiledForArktype_2_2_9 = true

// captured at load so a program can't replace them; each alone to tree-shake
export const assign = Object.assign
export const is = Object.is
export const freeze = Object.freeze
export const setPrototypeOf = Object.setPrototypeOf

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

	// a build without the expression member has none to print
	toString(): string {
		return this.expression ? `Type<${this.expression}>` : "Type"
	}
}

// a Standard Schema consumer prefixes each message with its path, so a pathed issue needs none
export const standardResultOf = (
	out: unknown
): StandardSchemaV1.Result<unknown> =>
	out instanceof ArkErrors ?
		{
			issues: (out._i ? (out.issues as ArkIssue[]) : out._).map(issue =>
				(
					issue.path.length &&
					(issue.message === undefined || issue.message === messageOf(issue))
				) ?
					{ ...issue, message: problemOf(issue) }
				:	((issue.message ??= messageOf(issue)), issue)
			) as StandardSchemaV1.Issue[]
		}
	:	{ value: out }

// shorter at each site than a literal
export const siteOf = ((
	code: ArkErrorCode,
	description?: string,
	message?: string
): SiteContext => ({ code, description, x: message })) satisfies Fn

// a key's site where its value isn't a basis, expecting the value's brief where missing
export const requiredSiteOf = ((description?: string): FailureSite => ({
	m: { code: "required", description }
})) satisfies Fn

// a key's site, expecting what its basis does unless the basis is described apart
export const keySiteOf = ((
	code: ArkErrorCode,
	description?: string,
	missing = description
): FailureSite => ({
	v: siteOf(code, description),
	m: { code: "required", description: missing }
})) satisfies Fn

// a library reading a JSON Schema the build left out fails saying how to keep
// it; "jsonSchema" in it stays false
export const withoutJsonSchema = <standard extends object>(
	standard: standard
): standard =>
	new Proxy(standard, {
		get: (target, k) =>
			k === "jsonSchema" ?
				throwError(
					'~standard.jsonSchema isn\'t baked into this validator, which a library converting it to JSON Schema reads. Set "members": { "~standard.jsonSchema": true } under "precompile" in ark.json (or package.json\'s "ark" key).'
				)
			:	Reflect.get(target, k)
	})

// parenthesized (kept by `satisfies`) to compile as the module loads
export const createValidator = ((
	rootApply: RootApply,
	allows: (data: unknown) => boolean,
	attributes: ValidatorAttributes,
	id: string,
	holes?: readonly unknown[]
): Validator => {
	// a meta's onFail (e.g. a matcher's) overrides the configured one
	const configuredOnFail = attributes.meta.onFail ?? runtimeConfig.onFail
	const validator: Validator = setPrototypeOf(
		((
			data: unknown,
			pipedFromCtx?: Traversal,
			onFail: FailHandler | null = configuredOnFail
		) => {
			if (!pipedFromCtx) return rootApply(data, onFail)
			return rootApply(data, pipedInto(pipedFromCtx))
		}) satisfies Fn,
		freeze(Validator.prototype)
	)
	// an own arrow function, since it is often detached, e.g. when passing to tRPC
	validator.assert = freeze((data: unknown, pipedFromCtx?: Traversal) =>
		validator(data, pipedFromCtx, throwOnDefault)
	)
	assign(validator, attributes)
	validator.allows = freeze(allows)
	const standard = freeze({
		vendor: "arktype",
		version: 1,
		validate: freeze((input: unknown) => standardResultOf(validator(input))),
		...attributes["~standard"]
	})
	validator["~standard"] =
		attributes["~standard"] ? standard : withoutJsonSchema(standard)
	return holdHoles(freeze(validator), id, holes)
}) satisfies Fn

// make returns the validator itself, so each site calls it directly
export const createValidatorWith = ((
	make: (parts: readonly Fn[], onFail: FailHandler | null) => Fn,
	parts: readonly Fn[],
	id: string,
	attributes: ValidatorAttributes = { meta: emptyMeta },
	holes?: readonly unknown[]
): Validator => {
	const validator: Validator = setPrototypeOf(
		make(parts, attributes.meta.onFail ?? runtimeConfig.onFail),
		freeze(Validator.prototype)
	)
	validator.assert = freeze((data: unknown, pipedFromCtx?: Traversal) =>
		validator(data, pipedFromCtx, throwOnDefault)
	)
	assign(validator, attributes)
	validator.allows = freeze(parts[0] as never)
	const standard = freeze({
		vendor: "arktype",
		version: 1,
		validate: freeze((input: unknown) => standardResultOf(validator(input))),
		...attributes["~standard"]
	})
	validator["~standard"] =
		attributes["~standard"] ? standard : withoutJsonSchema(standard)
	return holdHoles(freeze(validator), id, holes)
}) satisfies Fn

type ValidatorArgs = [
	pipedFromCtx?: Traversal | undefined,
	onFail?: FailHandler | null | undefined
]

// a validator called with a traversal adds its errors there
const pipedInto =
	(ctx: Traversal): FailHandler =>
	errors =>
		ctx.piped(errors)

export const pipedIntoUndetailed = (
	pipedFromCtx: Traversal,
	out: unknown
): unknown => {
	if (!(out instanceof ArkErrors)) return out
	const errors = errorsOf(pipedFromCtx)
	if (errors._merge) errors._merge(out, pipedFromCtx.path)
	else {
		for (const issue of out._)
			errors._.push({ ...issue, path: [...pipedFromCtx.path, ...issue.path] })
	}
	return errors
}

// a non-compact root apply's validator, declaring only data
export const callingRootApply = ((
	[, rootApply]: readonly Fn[],
	configuredOnFail: FailHandler | null
): Fn =>
	((data: unknown, ...args: ValidatorArgs) =>
		!args.length ? rootApply(data, configuredOnFail)
		: args[0] ? rootApply(data, pipedInto(args[0]))
		: rootApply(
				data,
				args[1] === undefined ? configuredOnFail : args[1]
			)) satisfies Fn) satisfies Fn

type ValidatorParts = [
	rootApply: RootApply,
	allows: (data: unknown) => boolean,
	attributes: ValidatorAttributes,
	id: string
]

const copiesByParts = /* @__PURE__ */ new WeakMap<ValidatorParts, InternTable>()

// a folded factory's validator, interned by the holes received
export const rekeyed = (
	parts: ValidatorParts,
	holes: readonly unknown[]
): Validator => {
	let copies = copiesByParts.get(parts)
	if (!copies) copiesByParts.set(parts, (copies = new InternTable()))
	return intern(copies, holes, () => createValidator(...parts, holes))
}

type TypeOnlyMember =
	| typeof inferred
	| "t"
	| "infer"
	| "inferIn"
	| "inferOut"
	| "inferIntrospectableOut"
	| "Symbol"

// what a Type has that a validator lacks, so reading it reads undefined
export type UnavailableMember = Exclude<
	keyof (ArrayType & DateType & NumberType & ObjectType & StringType),
	keyof Validator | keyof Function | TypeOnlyMember | IntrospectionMember
>

// a target's is 0 where the validator doesn't bake its schema
export const bakedJsonSchema = (
	write: () => JsonSchema,
	byTarget: readonly ((() => JsonSchema) | 0)[],
	// no fallback wrote it, so a call's changes nothing
	ignoresFallback?: 1
): ((opts?: { target?: unknown }) => JsonSchema) =>
	freeze((opts?: { target?: unknown }) => {
		// arktype merges the keys a for...in loop reads
		const keys: string[] = []
		for (const k in opts) if (!ignoresFallback || k !== "fallback") keys.push(k)
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

// arktype's own wrapper, named as arktype names it
export const typedFn = (
	raw: Fn,
	params: Validator,
	returns: Validator
): InternalTypedFn =>
	freeze(new InternalTypedFn(raw, params as never, returns as never))

// only type.errors exists without the parser
export const type: { errors: typeof ArkErrors } = /* @__PURE__ */ freeze({
	errors: ArkErrors
})

// string.url's predicate in a size build, without isParsableUrl's fast path
export const canParseUrl = ((s: string): boolean =>
	URL.canParse(s)) satisfies Fn

// a site whose problem is configured, and maybe its message
export const problemSiteOf = ((
	code: ArkErrorCode,
	description: string | undefined,
	message: string | undefined,
	problem: string
): SiteContext => ({
	code,
	description,
	x: message,
	text: issue => {
		issue.problem = problem
	}
})) satisfies Fn

type Writer = string | Fn | undefined

const defineProperty = Object.defineProperty

// written once first read; keeps is 1 if the issue takes expected, 2 if problem
const writeIssue = (
	issue: ArkIssue,
	context: Record<string, unknown>,
	[expected, actual, problem, message]: readonly Writer[],
	keeps: number
): void => {
	const text: Record<string, unknown> = {
		expected: issue.expected,
		message: issue.message
	}
	if (keeps & 2) text.problem = issue.problem
	const writeText = () => {
		const error: Record<string, unknown> = {
			data: issue.data,
			path: issue.path,
			...context,
			propString: stringifyPath(issue.path)
		}
		const write = (writer: Writer, ...args: unknown[]): unknown =>
			typeof writer === "function" ? writer(...args, enInfo) : writer
		error.expected = context.expected ?? write(expected, error) ?? text.expected
		error.actual = context.actual ?? write(actual, issue.data, error)
		error.problem = context.problem ?? write(problem, error)
		if (keeps & 1) text.expected = error.expected
		if (keeps & 2) text.problem = error.problem
		text.message ??= write(message, error)
		for (const k in text) {
			defineProperty(issue, k, {
				value: text[k],
				writable: true,
				enumerable: true,
				configurable: true
			})
		}
	}
	for (const k in text) {
		defineProperty(issue, k, {
			get: () => (writeText(), issue[k as never]),
			enumerable: true,
			configurable: true
		})
	}
}

// a site whose text a function writes
export const writtenSiteOf = ((
	code: ArkErrorCode,
	description: string | undefined,
	context: Record<string, unknown>,
	writers: readonly Writer[],
	keeps = 0
): SiteContext => ({
	code,
	description,
	text: issue => writeIssue(issue, context, writers, keeps)
})) satisfies Fn

// a traversal writing the text configure() sets for a code a callback raises
export const raisingTraversalOf = (
	Base: typeof Traversal,
	writtenByCode: Record<string, [writers: readonly Writer[], keeps: number]>
): typeof Traversal =>
	class extends Base {
		protected override raise(input: ArkErrorInput): ArkError {
			const issue = super.raise(input)
			const written = writtenByCode[issue.code]
			if (written) {
				const context = { ...(input as object), path: issue.path }
				writeIssue(issue, context, ...written)
			}
			return issue
		}
	}

// passed no ctx (or filter's index), stops at its first failure
export const failsAt = ((
	ctx: FailureContext | undefined,
	site: FailureSite,
	data: unknown,
	key?: PropertyKey
): boolean | undefined => !ctx?._at || ctx._at(site, data, key)) satisfies Fn

// a discriminant deeper than one key misses below data, entering each key but the last
export const failsAtPath = ((
	ctx: FailureContext | undefined,
	site: FailureSite,
	data: unknown,
	[k, ...deeper]: PropertyKey[]
): boolean | undefined =>
	!ctx?._at ||
	(deeper.length ?
		ctx._in((value, ctx) => !failsAtPath(ctx, site, value, deeper), data, k)
	:	ctx._at(site, data, k))) satisfies Fn

export const failsIn = ((
	ctx: FailureContext | undefined,
	apply: CompactApply,
	data: unknown,
	key: PropertyKey,
	missing?: FailureSite
): boolean | undefined =>
	ctx?._at ?
		ctx._in(apply, data, key, missing)
	:	!(apply as Fn)((data as Record<PropertyKey, unknown>)[key])) satisfies Fn

// compact roots report into ArkErrors, loading no Traversal
export const applyErrors = (
	apply: CompactApply,
	data: unknown,
	config: unknown,
	onFail: ArkErrors.Handler | null,
	Ctx: new (data: unknown, config: unknown) => ArkErrors | InternalTraversal
): unknown => {
	const ctx = new Ctx(data, config)
	apply(data, ctx)
	const errors = ctx instanceof ArkErrors ? ctx : ctx._errors
	return (
		!errors?.count ? data
		: onFail ? onFail(errors)
		: errors
	)
}

export const applyNodeErrors = (
	node: { tApply: CompactApply },
	data: unknown,
	config: unknown,
	onFail: ArkErrors.Handler | null,
	Ctx: new (data: unknown, config: unknown) => ArkErrors | InternalTraversal
): unknown => applyErrors(node.tApply, data, config, onFail, Ctx)

// a root array's Apply from i, the first element `allows` rejected
const elementsFrom =
	(
		allows: (data: unknown) => boolean,
		apply: CompactApply,
		i: number,
		data: readonly unknown[]
	): CompactApply =>
	(_, ctx) => {
		for (let j = i; j < data.length; j++)
			if (!allows(data[j]) && ctx._in(apply, data, j)) return false
		return true
	}

export const applyElements = (
	allows: (data: unknown) => boolean,
	apply: CompactApply,
	i: number,
	data: readonly unknown[],
	args: ValidatorArgs,
	onFail: ArkErrors.Handler | null,
	Ctx: new (data: unknown, config: unknown) => ArkErrors | InternalTraversal
): unknown =>
	applyCallErrors(elementsFrom(allows, apply, i, data), data, args, onFail, Ctx)

export const applyCallErrors = (
	apply: CompactApply,
	data: unknown,
	args: ValidatorArgs,
	onFail: ArkErrors.Handler | null,
	Ctx: new (data: unknown, config: unknown) => ArkErrors | InternalTraversal
): unknown => {
	const ctx = new Ctx(data, runtimeConfig)
	apply(data, ctx)
	const errors = ctx instanceof ArkErrors ? ctx : ctx._errors
	if (!errors?.count) return data
	if (args.length) {
		if (args[0]) return args[0].piped(errors as never)
		if (args[1] !== undefined) onFail = args[1] as never
	}
	return onFail ? onFail(errors) : errors
}

type UnreadErrors = new (apply: CompactApply, data: unknown) => ArkErrors

// defined at a build's first failure, as defining it at load costs startup
type UnreadErrorsOf = () => UnreadErrors

const unreadOf = (Ctx: new () => ArkErrors): UnreadErrors => {
	class Unread {
		// named short, as every bundle reading errors writes them
		declare _a: CompactApply
		declare _d: unknown
		declare _f?: ArkIssue[]

		constructor(apply: CompactApply, data: unknown) {
			this._a = apply
			this._d = data
		}

		get _(): ArkIssue[] {
			return (this._f ??= issuesOf(this._a, this._d, new Ctx()))
		}
	}
	// a Ctx, built without the fields its constructor sets
	setPrototypeOf(Unread.prototype, Ctx.prototype)
	// keeps the prototype's own constructor, still not enumerable
	Unread.prototype.constructor = Ctx
	return Unread as never
}

let unreadArkErrors: UnreadErrors | undefined

export const UnreadArkErrors: UnreadErrorsOf = () =>
	(unreadArkErrors ??= unreadOf(ArkErrors))

// an Apply reporting into ArkErrors calls no user code, so its issues can wait
export const unreadErrors = (
	apply: CompactApply,
	data: unknown,
	onFail: ArkErrors.Handler | null,
	Ctx: UnreadErrorsOf
): unknown => {
	const errors = new (Ctx())(apply, data)
	return onFail ? onFail(errors) : errors
}

export const unreadCallErrors = (
	apply: CompactApply,
	data: unknown,
	args: ValidatorArgs,
	onFail: ArkErrors.Handler | null,
	Ctx: UnreadErrorsOf
): unknown => {
	const errors = new (Ctx())(apply, data)
	if (args.length) {
		if (args[0]) return args[0].piped(errors as never)
		if (args[1] !== undefined) onFail = args[1] as never
	}
	return onFail ? onFail(errors) : errors
}

export const emptyMeta: ArkEnv.meta = /* @__PURE__ */ freeze({})

let unreadFirstIssues: UnreadErrors | undefined

export const UnreadFirstIssues: UnreadErrorsOf = () =>
	(unreadFirstIssues ??= unreadOf(FirstIssues))

interface UnreadFields {
	_a?: CompactApply
	_d: unknown
	_f?: ArkIssue[]
	// the first issue, found alone
	_1?: WrittenIssue
}

type WrittenIssue = ArkErrors["issues"][number]

/**
 * The first of `errors.issues`. Errors finding their issues once read find
 * only it, walking their data until it fails.
 */
export const firstIssue = (errors: ArkErrors): WrittenIssue => {
	const unread = errors as ArkErrors & UnreadFields
	if (unread._1) return unread._1
	if (!unread._a || unread._f) return errors.issues[0]
	const ctx = new FirstIssues()
	issuesOf(unread._a, unread._d, ctx)
	return (unread._1 = ctx.issues[0])
}

// errors "none"'s failure, its one issue built once read
export const InvalidErrors: new (data: unknown) => ArkErrors =
	/* @__PURE__ */ (() => {
		class Invalid {
			declare _d: unknown
			declare _f?: ArkIssue[]

			constructor(data: unknown) {
				this._d = data
			}

			get _(): ArkIssue[] {
				return (this._f ??= [
					{ code: "predicate", path: [], data: this._d } as never
				])
			}
		}
		setPrototypeOf(Invalid.prototype, ArkErrors.prototype)
		// keeps the prototype's own constructor, still not enumerable
		Invalid.prototype.constructor = ArkErrors
		return Invalid as never
	})()

export const unreadElements = (
	allows: (data: unknown) => boolean,
	apply: CompactApply,
	i: number,
	data: readonly unknown[],
	args: ValidatorArgs,
	onFail: ArkErrors.Handler | null,
	Ctx: UnreadErrorsOf
): unknown =>
	unreadCallErrors(
		elementsFrom(allows, apply, i, data),
		data,
		args,
		onFail,
		Ctx
	)

export type HoleKind = "function" | "class" | "symbol"

// an arity (0, 1 or 2+) or a description
type HoleFact = string | number

export const factOfHole = (
	hole: unknown,
	kind: HoleKind = "function",
	classes: Record<string, unknown> = {}
): HoleFact => {
	if (kind === "symbol" || typeof hole !== "function" || isValidator(hole))
		return describeValue(hole)
	if (kind === "function") return Math.min(hole.length, 2)
	const builtinName = getBuiltinNameOfConstructor(hole)
	if (builtinName) return `the builtin ${builtinName}`
	const { prototype } = hole
	if (!hasDomain(prototype, "object")) return "a function without a prototype"
	// compared with the builtins and other classes the definition holds
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
	if (prototype !== Object.prototype && prototype !== null)
		return describeValue(value)
	const kind = prototype ? "object" : "null-prototype object"
	const keys = Reflect.ownKeys(value)
	return keys.length ?
			`${prototype ? "an" : "a"} ${kind} with keys ${keys.map(String).join(", ")}`
		:	`an empty ${kind}`
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

const describeFact = (fact: HoleFact): string =>
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

type DefaultKey = [id: string, holes: readonly unknown[]]

const checkedDefaultOf = ([id, holes]: DefaultKey): InternTable => {
	let table = checkedDefaults.next(id)
	for (const hole of holes) table = table.next(hole)
	return table
}

// checked once per key, thrown in en as a ParseError
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

// kept off the value so a program can't read it
const holesByValue = new WeakMap<
	object,
	[id: string, holes: readonly unknown[]]
>()

export const holdHoles = (<value extends object>(
	value: value,
	id: string,
	holes: readonly unknown[] = []
): value => {
	holesByValue.set(value, [id, freeze(holes)])
	return value
}) satisfies Fn

export const holesOf = ((
	holder: unknown,
	id: string,
	label: string,
	kind: "Type" | "Module" | "Scope" | "Generic" = "Type"
): readonly unknown[] => {
	const created = holesByValue.get(holder as object)
	if (created?.[0] !== id) {
		return throwError(
			writeCreationMismatchMessage(
				label,
				created ? `another ${kind}` : describeValue(holder),
				`the ${kind} it was at build`
			)
		)
	}
	return created[1]
}) satisfies Fn

// a factory's check of a value it receives
export const receiverOf = ((
	id: string,
	label: string,
	kind?: "Module" | "Scope" | "Generic"
) =>
	((holder: unknown): readonly unknown[] =>
		holesOf(holder, id, label, kind)) satisfies Fn) satisfies Fn

// held weakly so a call's functions don't outlive it
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

// returns what it created before for the same holes
export const intern = <value>(
	table: InternTable,
	holes: readonly unknown[],
	create: () => value,
	// defaults a Type created first may not have checked
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

// a mock, or a module a test runner replaced, fails
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

// described by kind, so a bundle ships no printer
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

export const bakedJsonSchemaOptionsMessage =
	'a standalone validator\'s JSON Schema takes only a target it was built with, and a fallback only where its schema needs none; configure({ toJsonSchema }) or build with runtime: "arktype"'

export type bakedJsonSchemaOptionsMessage = typeof bakedJsonSchemaOptionsMessage

export const writeUnbakedMessage = <reason extends string>(
	reason: reason
): writeUnbakedMessage<reason> =>
	`${reason}. Build with runtime: "arktype" to write it where it's read.`

export type writeUnbakedMessage<reason extends string> =
	`${reason}. Build with runtime: "arktype" to write it where it's read.`

// json is shared between nodes, so frozen deeply
export const deepFreeze = <t>(value: t): t => {
	if (value && typeof value === "object")
		for (const k in freeze(value)) deepFreeze(value[k])
	return value
}
