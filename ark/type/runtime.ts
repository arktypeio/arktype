import type { BaseRoot, RootApply, StandardSchemaV1 } from "@ark/schema"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	ArkErrors,
	resolvedConfig,
	runtimeLocale,
	type Traversal
} from "@ark/schema/runtime"
import { Callable, throwError, type inferred } from "@ark/util"
import { raisedErrorPhrases } from "./keywords/functions.ts"
import type { ArrayType } from "./variants/array.ts"
import type { DateType } from "./variants/date.ts"
import type { NumberType } from "./variants/number.ts"
import type { ObjectType } from "./variants/object.ts"
import type { StringType } from "./variants/string.ts"

// a bundle with code splitting drops a star export from another package
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export {
	abiVersion,
	aliasVisits,
	allowsAcyclic,
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	applyMember,
	applyResolution,
	applyValue,
	ArkError,
	ArkErrors,
	arrayIndexMatcher,
	assertAbiVersion,
	copyOf,
	isAbsent,
	isArkErrorResult,
	maxAliasDepth,
	maxAliasVisits,
	mergeTransformed,
	resolvedConfig,
	runtimeLocale,
	TransformErrors,
	Traversal,
	TraversalError,
	traverseKey,
	writeAbiVersionMismatchMessage
} from "@ark/schema/runtime"
export {
	isValidDate,
	jsTypeOfDescriptions,
	liftArray,
	ParseError,
	printable
} from "@ark/util"
export * from "./keywords/functions.ts"

// the predicate writers read a keyword's phrase for an error it raised
Object.assign(runtimeLocale.keywordPhrases, raisedErrorPhrases)

export interface ValidatorAttributes {
	expression: string
	description: string
	meta: ArkEnv.meta
}

const throwOnFail: ArkErrors.Handler = errors => errors.throw()

/**
 * A precompiled Type that validates without arktype.
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
	onFail: ArkErrors.Handler | null
	allows: (data: unknown) => boolean

	constructor(
		rootApply: RootApply,
		node: BaseRoot,
		attributes: ValidatorAttributes
	) {
		super(
			(
				data: unknown,
				pipedFromCtx?: Traversal,
				onFail: ArkErrors.Handler | null = this.onFail
			) =>
				pipedFromCtx ? pipedFromCtx.pipe(node, data) : rootApply(data, onFail),
			{ bind: null }
		)
		this.expression = attributes.expression
		this.description = attributes.description
		this.meta = attributes.meta
		this.onFail = this.meta.onFail ?? resolvedConfig.onFail
		this.allows = node.allows
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

	private _standard?: StandardSchemaV1.Props
	get "~standard"(): StandardSchemaV1.Props {
		return (this._standard ??= {
			vendor: "arktype",
			version: 1,
			validate: input => {
				const out = this(input)
				if (out instanceof ArkErrors) return out
				return { value: out }
			}
		})
	}

	toString(): string {
		return `Type<${this.expression}>`
	}
}

// a Type's members that exist only in its type
type typeOnlyMember =
	| typeof inferred
	| "t"
	| "infer"
	| "inferIn"
	| "inferOut"
	| "inferIntrospectableOut"
	| "Symbol"

type unavailableMember = Exclude<
	keyof (ArrayType & DateType & NumberType & ObjectType & StringType),
	keyof Validator | keyof Function | typeOnlyMember
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
	json: "property",
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
	to: "method",
	toJSON: "method",
	toJsonSchema: "method"
} satisfies Record<unavailableMember, "method" | "property">

for (const [name, kind] of Object.entries(unavailableMembers)) {
	const throwUnavailable = () => throwError(writeUnavailableMemberMessage(name))
	Object.defineProperty(
		Validator.prototype,
		name,
		kind === "method" ? { value: throwUnavailable } : { get: throwUnavailable }
	)
}

export const type: { (): never; errors: typeof ArkErrors } = Object.assign(
	() => throwError(writeUnavailableMemberMessage("type")),
	{ errors: ArkErrors }
)

export const writeUnavailableMemberMessage = <name extends string>(
	name: name
): writeUnavailableMemberMessage<name> =>
	`${name} is unavailable in a standalone validator, which runs without arktype. To use it, precompile with runtime: "arktype"`

export type writeUnavailableMemberMessage<name extends string> =
	`${name} is unavailable in a standalone validator, which runs without arktype. To use it, precompile with runtime: "arktype"`
