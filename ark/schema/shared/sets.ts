import { throwParseError, type dict } from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { Discriminant, Union } from "../roots/union.ts"
import type { BaseScope } from "../scope.ts"
import type { Disjoint } from "./disjoint.ts"
import type { NodeKind, RootKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"
import { $ark } from "./registry.ts"
import type { ToJsonSchema } from "./toJsonSchema.ts"

// installed by arksets, so code that never relates two types never ships the algebra
export interface SetEngine {
	intersect: InternalNodeIntersection<BaseScope>
	pipe: InternalNodeIntersection<BaseScope>
	reduce(
		kind: NodeKind,
		inner: dict,
		$: BaseScope
	): BaseNode | Disjoint | undefined
	discriminate(node: Union.Node): Discriminant | null
	toJsonSchema(node: BaseRoot, opts: ToJsonSchema.Options): JsonSchema
	toJsonSchemaRecurse(node: BaseRoot, ctx: ToJsonSchema.Context): JsonSchema
}

export type InternalNodeIntersection<ctx> = <
	l extends BaseNode,
	r extends BaseNode
>(
	l: l,
	r: r,
	ctx: ctx
) => l["kind"] | r["kind"] extends RootKind ? BaseRoot | Disjoint
:	BaseNode | Disjoint | null

export const sets = (): SetEngine =>
	$ark.sets ?? throwParseError(missingSetEngineMessage)

export const missingSetEngineMessage =
	'Set algebra is not installed (import "arksets" to install it)'

export type missingSetEngineMessage = typeof missingSetEngineMessage
