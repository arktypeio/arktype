import type { Predicate, PredicateCast } from "@ark/schema"
import type {
	applyConstraintSchema,
	inferPipe,
	Out,
	To
} from "../keywords/inference.ts"
import type { type } from "../keywords/keywords.ts"
import type { BaseType } from "./base.ts"

// t can't be constrained to MorphAst here because it could be a union including some
// non-morph branches
/** @ts-ignore cast variance */
interface Type<out t = unknown, $ = {}> extends BaseType<t, $> {
	to<const def, r = type.infer<def, $>>(
		def: type.validate<def, $>
	): Type<inferPipe<t, r>, $>

	narrow<
		narrowed extends this["infer"] = never,
		r = [narrowed] extends [never] ?
			applyConstraintSchema<this["inferBrandableOut"], "predicate", Predicate>
		:	narrowed
	>(
		predicate: Predicate<this["infer"]> | PredicateCast<this["infer"], narrowed>
	): Type<
		this["inferredOutIsIntrospectable"] extends true ?
			(In: this["inferBrandableIn"]) => To<r>
		:	(In: this["inferBrandableIn"]) => Out<r>,
		$
	>
}

export type { Type as MorphType }
