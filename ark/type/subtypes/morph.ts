import type { Predicate, PredicateCast } from "@ark/schema"
import type { applyConstraint, Out } from "../ast.js"
import type { BaseType } from "./base.js"

// t can't be constrained to MorphAst here because it could be a union including some
// non-morph branches
/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {
	narrow<narrowed extends this["infer"] = never>(
		predicate: Predicate<this["infer"]> | PredicateCast<this["infer"], narrowed>
	): Type<
		(
			[narrowed] extends [never] ?
				applyConstraint<this["tOut"], "predicate", Predicate>
			:	narrowed
		) extends infer o ?
			(In: this["tIn"]) => Out<o>
		:	never,
		$
	>
}

export type { Type as MorphType }
