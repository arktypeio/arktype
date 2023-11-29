// ideally this could be just declared since it is not used at runtime,
// but it doesn't play well with typescript-eslint: https://github.com/typescript-eslint/typescript-eslint/issues/4608

import type { returnOf } from "@arktype/util"
import type { UnknownNode } from "../base.js"
import type { ModuleNode } from "../scope.js"

// easiest solution seems to be just having it declared as a value so it doesn't break when we import at runtime
export const inferred = Symbol("inferred")

export const arkKind = Symbol("ArkTypeInternalKind")

export const isNode = (o: unknown): o is UnknownNode =>
	(o as any)?.[arkKind] === "node"

export type cast<to> = {
	[inferred]?: to
}

export type Preinferred = cast<unknown>

declare global {
	export interface InternalArkConfig {
		kinds(): {
			node: UnknownNode
			moduleNode: ModuleNode
		}
	}
}

export type inferArkKind<
	kind extends keyof returnOf<InternalArkConfig["kinds"]>
> = returnOf<InternalArkConfig["kinds"]>[kind]

export type ArkKinds = returnOf<InternalArkConfig["kinds"]>

export type ArkKind = keyof ArkKinds

export const addArkKind = <kind extends ArkKind>(
	value: Omit<ArkKinds[kind], arkKind> & { [arkKind]?: kind },
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
