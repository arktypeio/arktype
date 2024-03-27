import type { ArkTypeError, UnknownNode } from "@arktype/schema"
import type { Module, Scope } from "./scope.js"
import type { Generic } from "./type.js"

export const arkKind = Symbol("ArkTypeInternalKind")

export type ArkKinds = {
	node: UnknownNode
	scope: Scope
	generic: Generic
	module: Module
	error: ArkTypeError
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
