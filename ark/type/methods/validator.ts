import type { Predicate, PredicateCast } from "@ark/schema"
import type { applyConstraintSchema } from "../keywords/inference.ts"
import type { BaseType } from "./base.ts"
import type { instantiateType } from "./instantiate.ts"

/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {
	narrow<
		narrowed extends this["infer"] = never,
		r = [narrowed] extends [never] ?
			applyConstraintSchema<t, "predicate", Predicate>
		:	narrowed
	>(
		predicate: Predicate<this["infer"]> | PredicateCast<this["infer"], narrowed>
	): instantiateType<r, $>
}

export type { Type as ValidatorType }
