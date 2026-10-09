import type { BaseRoot, RootApply, StandardSchemaV1 } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { ArkErrors, runtimeLocale, type Traversal } from "@ark/schema/runtime"
import { Callable, throwError, type inferred } from "@ark/util"
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
export const { assign, freeze, preventExtensions } = Object

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
		attributes: ValidatorAttributes
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

export const writeUnavailableMemberMessage = <name extends string>(
	name: name
): writeUnavailableMemberMessage<name> =>
	`${name} is unavailable in a standalone validator, which runs without arktype, so using it requires building with runtime: "arktype"`

export type writeUnavailableMemberMessage<name extends string> =
	`${name} is unavailable in a standalone validator, which runs without arktype, so using it requires building with runtime: "arktype"`
