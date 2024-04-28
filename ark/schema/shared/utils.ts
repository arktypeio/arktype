import {
	type array,
	flatMorph,
	isArray,
	isDotAccessible,
	type mutable,
	printable,
	type show
} from "@arktype/util"
import type { GenericSchema } from "../generic.js"
import type { Constraint, RawNode } from "../node.js"
import type { RawSchema } from "../schema.js"
import type { RawSchemaModule, RawSchemaScope } from "../scope.js"
import type { ArkTypeError } from "./errors.js"

export const makeRootAndArrayPropertiesMutable = <o extends object>(
	o: o
): makeRootAndArrayPropertiesMutable<o> =>
	// TODO: this cast should not be required, but it seems TS is referencing
	// the wrong parameters here?
	flatMorph(o as never, (k, v) => [k, isArray(v) ? [...v] : v]) as never

export type makeRootAndArrayPropertiesMutable<inner> = {
	-readonly [k in keyof inner]: inner[k] extends array | undefined ?
		mutable<inner[k]>
	:	inner[k]
} & unknown

export type internalImplementationOf<
	external,
	typeOnlyKey extends keyof external = never
> = {
	// ensure functions accept compatible numbers of args
	[k in Exclude<keyof external, typeOnlyKey>]: external[k] extends (
		(...args: infer args) => unknown
	) ?
		(...args: { [i in keyof args]: never }) => unknown
	:	unknown
}

export type TraversalPath = PropertyKey[]

export const pathToPropString = (path: TraversalPath): string => {
	const propAccessChain = path.reduce<string>(
		(s, k) =>
			typeof k === "string" && isDotAccessible(k) ?
				`${s}.${k}`
			:	`${s}[${printable(k)}]`,

		""
	)
	return propAccessChain[0] === "." ? propAccessChain.slice(1) : propAccessChain
}

export const arkKind = Symbol("ArkTypeInternalKind")

export interface ArkKinds {
	constraint: Constraint
	schema: RawSchema
	scope: RawSchemaScope
	generic: GenericSchema
	module: RawSchemaModule
	error: ArkTypeError
}

export type ArkKind = show<keyof ArkKinds>

export const addArkKind = <kind extends ArkKind>(
	value: Omit<ArkKinds[kind], typeof arkKind> & {
		[arkKind]?: kind
	},
	kind: kind
): ArkKinds[kind] =>
	Object.defineProperty(value, arkKind, {
		value: kind,
		enumerable: false
	}) as never

export type addArkKind<
	kind extends ArkKind,
	t extends Omit<ArkKinds[kind], typeof arkKind>
> = t & { [arkKind]: kind }

export const hasArkKind = <kind extends ArkKind>(
	value: unknown,
	kind: kind
): value is ArkKinds[kind] => (value as any)?.[arkKind] === kind

export const isNode = (value: unknown): value is RawNode =>
	hasArkKind(value, "schema") || hasArkKind(value, "constraint")

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")
