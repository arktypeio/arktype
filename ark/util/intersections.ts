import type { domainOf } from "./domain.js"
import type { andPreserveUnknown, conform } from "./generics.js"
import type { Hkt } from "./hkt.js"
import type { requiredKeyOf, valueOf } from "./records.js"

export interface AndPreserveUnknown extends Hkt.Kind {
	f: (
		args: conform<this[Hkt.key], [unknown, unknown]>
	) => andPreserveUnknown<(typeof args)[0], (typeof args)[1]>
}

type ArrayIntersectionMode = "values" | "parameters"

export type intersectArrays<
	l extends readonly unknown[],
	r extends readonly unknown[],
	operator extends Hkt.Kind = AndPreserveUnknown
> = intersectParametersRecurse<l, r, [], operator, "values">

export type intersectParameters<
	l extends readonly unknown[],
	r extends readonly unknown[],
	operator extends Hkt.Kind = AndPreserveUnknown
> = intersectParametersRecurse<l, r, [], operator, "parameters">

type intersectParametersRecurse<
	l extends readonly unknown[],
	r extends readonly unknown[],
	prefix extends readonly unknown[],
	intersector extends Hkt.Kind,
	mode extends ArrayIntersectionMode
> = [parseNextElement<l, mode>, parseNextElement<r, mode>] extends [
	infer lState extends ElementParseResult,
	infer rState extends ElementParseResult
]
	? shouldRecurse<lState, rState, mode> extends true
		? intersectParametersRecurse<
				lState["tail"],
				rState["tail"],
				[
					...prefix,
					// the intersection is optional iff both elements are optional
					...(lState["optional"] | rState["optional"] extends true
						? [Hkt.apply<intersector, [lState["head"], rState["head"]]>?]
						: [Hkt.apply<intersector, [lState["head"], rState["head"]]>])
				],
				intersector,
				mode
		  >
		: // once both arrays have reached their fixed end or a variadic element, return the final result
		  [
				...prefix,
				...(lState["tail"] extends readonly []
					? rState["tail"] extends readonly []
						? []
						: // if done and non-empty, we've reached a variadic element
						  // (or it's just a normal array, since number[] === [...number[]])
						  mode extends "parameters"
						  ? rState["tail"]
						  : []
					: rState["tail"] extends readonly []
					  ? mode extends "parameters"
							? lState["tail"]
							: []
					  : // if we've reached a variadic element in both arrays, intersect them
					    Hkt.apply<intersector, [lState["head"], rState["head"]]>[])
		  ]
	: never

type shouldRecurse<
	lState extends ElementParseResult,
	rState extends ElementParseResult,
	mode extends ArrayIntersectionMode
> = [lState["done"], rState["done"]] extends [true, true]
	? false
	: mode extends "parameters"
	  ? true
	  : // for values, we should stop recursing immediately if we reach the end of a fixed-length array
	    [true, readonly []] extends
					| [lState["done"], lState["tail"]]
					| [rState["done"], rState["tail"]]
	    ? false
	    : true

type ElementParseResult = {
	head: unknown
	optional: boolean
	tail: readonly unknown[]
	done: boolean
}

type parseNextElement<
	params extends readonly unknown[],
	mode extends ArrayIntersectionMode
> = params extends readonly []
	? {
			// A longer array is assignable to a shorter one when treated as
			// parameters, but not when treated as values
			head: mode extends "values" ? never : unknown
			optional: true
			tail: []
			done: true
	  }
	: params extends readonly [(infer head)?, ...infer tail]
	  ? [tail, params] extends [params, tail]
			? {
					head: head
					optional: true
					tail: tail
					done: true
			  }
			: {
					// Inferring parms often results in optional adding `|undefined`,
					// so the goal here is to counteract that. If this
					// causes problems, it should be removed.
					head: [] extends params ? Exclude<head, undefined> : head
					optional: [] extends params ? true : false
					tail: tail
					done: false
			  }
	  : never

export type isDisjoint<l, r> = l & r extends never
	? true
	: domainOf<l> & domainOf<r> extends never
	  ? true
	  : [l, r] extends [object, object]
	    ? true extends valueOf<{
					[k in Extract<
						keyof l & keyof r,
						requiredKeyOf<l> | requiredKeyOf<r>
					>]: isDisjoint<l[k], r[k]>
	      }>
				? true
				: false
	    : false
