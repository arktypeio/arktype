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
 * The relational half of the schema language.
 *
 * A node describes a set. Everything that reasons about the relationship
 * between two sets- intersection, reduction to canonical form, discrimination
 * of a union's branches- is routed through this interface rather than living
 * on the nodes themselves, so that an artifact which never compares two types
 * never ships the algebra.
 *
 * `arksets` installs an implementation on import. If it is absent:
 *
 * - parsed nodes are left unreduced
 * - unions compile without a discriminant
 * - operations that require a relational answer, and JSON Schema generation,
 *   throw {@link writeMissingSetEngineMessage}
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
	/**
	 * Generate a JSON Schema for a root node.
	 *
	 * Interchange is not algebra, but it ships in the same package, so it
	 * rides on the same engine rather than warranting a second one.
	 */
	toJsonSchema(node: BaseRoot, opts: ToJsonSchema.Options): JsonSchema
}

/**
 * The installed {@link SetEngine}, or throw naming the operation that
 * required it.
 */
export const sets = (operation: string): SetEngine =>
	$ark.sets ?? throwParseError(writeMissingSetEngineMessage(operation))

export const writeMissingSetEngineMessage = <operation extends string>(
	operation: operation
): writeMissingSetEngineMessage<operation> =>
	`${operation} requires set algebra (import "arksets" to install it)`

export type writeMissingSetEngineMessage<operation extends string> =
	`${operation} requires set algebra (import "arksets" to install it)`
