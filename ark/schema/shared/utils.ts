import {
	flatMorph,
	isArray,
	isDotAccessible,
	printable,
	throwParseError,
	type array,
	type mutable,
	type requireKeys,
	type show
} from "@ark/util"
import type { BaseConstraint } from "../constraint.js"
import type { GenericRoot } from "../generic.js"
import type { BaseNode } from "../node.js"
import type { BaseRoot } from "../roots/root.js"
import type { InternalBaseScope, InternalRootModule } from "../scope.js"
import type { ArkError } from "./errors.js"

export const makeRootAndArrayPropertiesMutable = <o extends object>(
	o: o
): makeRootAndArrayPropertiesMutable<o> =>
	// this cast should not be required, but it seems TS is referencing
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

export type PathToPropStringOptions<stringifiable = PropertyKey> = requireKeys<
	{
		stringifySymbol?: (s: symbol) => string
		stringifyNonKey?: (o: Exclude<stringifiable, PropertyKey>) => string
	},
	stringifiable extends PropertyKey ? never : "stringifyNonKey"
>

export const pathToPropString = <stringifiable>(
	path: array<stringifiable>,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: PathToPropStringOptions]
	:	NoInfer<[opts: PathToPropStringOptions<stringifiable>]>
): string => {
	const stringifySymbol = opts?.stringifySymbol ?? printable
	const propAccessChain = path.reduce<string>((s, k) => {
		switch (typeof k) {
			case "string":
				return isDotAccessible(k) ? `${s}.${k}` : `${s}[${JSON.stringify(k)}]`
			case "number":
				return `${s}[${k}]`
			case "symbol":
				return `${s}[${stringifySymbol(k)}]`
			default:
				if (opts?.stringifyNonKey)
					return `${s}[${opts.stringifyNonKey(k as never)}]`
				throwParseError(
					`${printable(k)} must be a PropertyKey or stringifyNonKey must be passed to options`
				)
		}
	}, "")
	return propAccessChain[0] === "." ? propAccessChain.slice(1) : propAccessChain
}

export type arkKind = typeof arkKind

export const arkKind: unique symbol = Symbol("ArkTypeInternalKind")

export interface ArkKinds {
	constraint: BaseConstraint
	root: BaseRoot
	scope: InternalBaseScope
	generic: GenericRoot
	module: InternalRootModule
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
