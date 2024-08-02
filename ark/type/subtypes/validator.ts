import type { Predicate, PredicateCast } from "@ark/schema"
import type { applyConstraint } from "../ast.js"
import type { Type as BaseType, instantiateType } from "../type.js"

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {
	narrow<narrowed extends this["infer"] = never>(
		predicate: Predicate<this["infer"]> | PredicateCast<this["infer"], narrowed>
	): instantiateType<
		[narrowed] extends [never] ? applyConstraint<t, "predicate", Predicate>
		:	narrowed,
		$
	>
}

export type { Type as ValidatorType }
