import {
	flatMorph,
	isArray,
	isDotAccessible,
	printable,
	type array,
	type mutable,
	type show
} from "@arktype/util"
import type { BaseConstraint } from "../constraint.js"
import type { GenericRoot } from "../generic.js"
import type { BaseNode } from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { RawRootModule, RawRootScope } from "../scope.js"
import type { ArkError } from "./errors.js"

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

export type PathToPropStringOptions = {
	stringifySymbol?: (s: symbol) => string
}

export const pathToPropString = (
	path: TraversalPath,
	opts?: PathToPropStringOptions
): string => {
	const stringifySymbol = opts?.stringifySymbol ?? printable
	const propAccessChain = path.reduce<string>(
		(s, k) =>
			typeof k === "symbol" ? `${s}[${stringifySymbol(k)}]`
			: typeof k === "string" && isDotAccessible(k) ? `${s}.${k}`
			: `${s}[${printable(k)}]`,
		""
	)
	return propAccessChain[0] === "." ? propAccessChain.slice(1) : propAccessChain
}

export const arkKind: unique symbol = Symbol("ArkTypeInternalKind")

export interface ArkKinds {
	constraint: BaseConstraint
	root: BaseRoot
	scope: RawRootScope
	generic: GenericRoot
	module: RawRootModule
	error: ArkError
}

export type ArkKind = show<keyof ArkKinds>

export const hasArkKind = <kind extends ArkKind>(
	value: unknown,
	kind: kind
): value is ArkKinds[kind] => (value as any)?.[arkKind] === kind

export const isNode = (value: unknown): value is BaseNode =>
	hasArkKind(value, "root") || hasArkKind(value, "constraint")

// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608
// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred: unique symbol = Symbol("inferred")
