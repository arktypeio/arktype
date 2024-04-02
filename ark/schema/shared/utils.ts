import {
	flatMorph,
	isArray,
	literalPropAccess,
	type array,
	type mutable
} from "@arktype/util"
import type { Node } from "../base.js"

export const makeRootAndArrayPropertiesMutable = <o extends object>(
	o: o
): makeRootAndArrayPropertiesMutable<o> =>
	// TODO: this cast should not be required, but it seems TS is referencing
	// the wrong parameters here?
	flatMorph(o as never, (k, v) => [k, isArray(v) ? [...v] : v]) as never

export type makeRootAndArrayPropertiesMutable<inner> = {
	-readonly [k in keyof inner]: inner[k] extends array | undefined
		? mutable<inner[k]>
		: inner[k]
} & unknown

export type TraversalPath = PropertyKey[]

export const pathToPropString = (path: TraversalPath): string => {
	const propAccessChain = path.reduce<string>(
		(s, segment) => s + literalPropAccess(segment),
		""
	)
	return propAccessChain[0] === "." ? propAccessChain.slice(1) : propAccessChain
}

export const arkKind = Symbol("ArkTypeInternalKind")

declare global {
	export interface ArkKinds {
		node: Node
	}
}

export type ArkKind = keyof ArkKinds

export const addArkKind = <kind extends ArkKind>(
	value: Omit<ArkKinds[kind], arkKind> & {
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
	t extends Omit<ArkKinds[kind], arkKind>
> = t & { [arkKind]: kind }

export type arkKind = typeof arkKind

export const hasArkKind = <kind extends ArkKind>(
	value: unknown,
	kind: kind
): value is ArkKinds[kind] => (value as any)?.[arkKind] === kind
