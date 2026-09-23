import { throwParseError, type dict } from "@ark/util"
import type { BaseNode } from "../node.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { Discriminant, Union } from "../roots/union.ts"
import type { BaseScope } from "../scope.ts"
import type { Disjoint } from "./disjoint.ts"
import type { NodeKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"
import { $ark } from "./registry.ts"
import type { ToJsonSchema } from "./toJsonSchema.ts"

/**
 * The relational half of the schema language: how two sets relate, rather
 * than what one contains. Routed through this table instead of the nodes so
 * that an artifact which never compares two types never ships the algebra.
 *
 * `arksets` installs an implementation on import. Without one, parsed nodes
 * stay unreduced, unions compile indiscriminated, and operations that need a
 * relational answer, and JSON Schema generation, which ships with it, throw
 * {@link missingSetEngineMessage}.
 */
export interface SetEngine {
	/** `l & r`, or a {@link Disjoint} explaining why the result is empty */
	intersect(l: BaseNode, r: BaseNode, $: BaseScope): BaseNode | Disjoint | null
	/** `l |> r`, or a {@link Disjoint} if no branch of l can pipe to r */
	pipe(l: BaseNode, r: BaseNode, $: BaseScope): BaseNode | Disjoint | null
	/**
	 * Reduce a parsed inner to a canonical node if one exists, returning
	 * `undefined` if the inner is already canonical.
	 */
	reduce(
		kind: NodeKind,
		inner: dict,
		$: BaseScope
	): BaseNode | Disjoint | undefined
	/** Find a path by which the union's branches can be told apart, if any */
	discriminate(node: Union.Node): Discriminant | null
	/** Generate a JSON Schema for a root node (interchange ships with the algebra) */
	toJsonSchema(node: BaseRoot, opts: ToJsonSchema.Options): JsonSchema
}

/** The installed {@link SetEngine}, or throw naming the import that provides one */
export const sets = (): SetEngine =>
	$ark.sets ?? throwParseError(missingSetEngineMessage)

export const missingSetEngineMessage =
	'set algebra is not installed (import "arksets" to install it)'

export type missingSetEngineMessage = typeof missingSetEngineMessage
