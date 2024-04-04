import type { array } from "./arrays.js"
import type { domainOf } from "./domain.js"
import type { andPreserveUnknown, conform } from "./generics.js"
import type { Hkt } from "./hkt.js"
import type { requiredKeyOf, valueOf } from "./records.js"

export interface AndPreserveUnknown extends Hkt.Kind {
	f: (
		args: conform<this[Hkt.key], [unknown, unknown]>
	) => andPreserveUnknown<(typeof args)[0], (typeof args)[1]>
}

type SequenceIntersectionKind = "array" | "parameters"

export type intersectArrays<
	l extends array,
	r extends array,
	operator extends Hkt.Kind = AndPreserveUnknown
> = intersectSequences<l, r, [], [], operator, "array">

export type intersectParameters<
	l extends array,
	r extends array,
	operator extends Hkt.Kind = AndPreserveUnknown
> = intersectSequences<l, r, [], [], operator, "parameters">

type intersectSequences<
	l extends array,
	r extends array,
	prefix extends array,
	postfix extends array,
	intersector extends Hkt.Kind,
	kind extends SequenceIntersectionKind
> = [parseNextElement<l, kind>, parseNextElement<r, kind>] extends [
	infer lState extends ElementParseResult,
	infer rState extends ElementParseResult
]
	? shouldRecurse<lState, rState, kind> extends true
		? intersectSequences<
				lState["rest"],
				rState["rest"],
				[
					...prefix,
					// the intersection is optional iff both elements are optional
					...("head" extends lState["source"] | rState["source"]
						? lState["optional"] | rState["optional"] extends true
							? [
									Hkt.apply<
										intersector,
										[lState["head"], rState["head"]]
									>?
								]
							: [
									Hkt.apply<
										intersector,
										[lState["head"], rState["head"]]
									>
								]
						: [])
				],
				[
					...("last" extends lState["source"] | rState["source"]
						? [
								Hkt.apply<
									intersector,
									[lState["last"], rState["last"]]
								>
							]
						: []),
					...postfix
				],
				intersector,
				kind
			>
		: // once both arrays have reached their fixed end or a variadic element, return the final result
			[
				...prefix,
				...(lState["rest"] extends readonly []
					? rState["rest"] extends readonly []
						? []
						: // if done and non-empty, we've reached a variadic element
							// (or it's just a normal array, since number[] === [...number[]])
							kind extends "parameters"
							? rState["rest"]
							: []
					: rState["rest"] extends readonly []
						? kind extends "parameters"
							? lState["rest"]
							: []
						: // if we've reached a variadic element in both arrays, intersect them
							Hkt.apply<
								intersector,
								[lState["head"], rState["head"]]
							>[]),
				...postfix
			]
	: never

type shouldRecurse<
	lState extends ElementParseResult,
	rState extends ElementParseResult,
	kind extends SequenceIntersectionKind
> = [lState["source"], rState["source"]] extends [null, null]
	? false
	: kind extends "parameters"
		? true
		: // for values, we should stop recursing immediately if we reach the end of a fixed-length array
			[null, readonly []] extends
					| [lState["source"], lState["rest"]]
					| [rState["source"], rState["rest"]]
			? false
			: true

type ElementParseResult = {
	head: unknown
	last: unknown
	source: "head" | "last" | null
	optional: boolean
	rest: array
}

type result<from extends ElementParseResult> = from

type parseNextElement<
	elements extends array,
	kind extends SequenceIntersectionKind
> = elements extends readonly []
	? result<{
			// A longer array is assignable to a shorter one when treated as
			// parameters, but not when treated as values
			head: kind extends "array" ? never : unknown
			last: kind extends "array" ? never : unknown
			source: null
			optional: true
			rest: []
		}>
	: elements extends readonly [(infer head)?, ...infer tail]
		? [tail, elements] extends [elements, tail]
			? result<{
					head: head
					last: unknown
					source: null
					optional: true
					rest: tail
				}>
			: // when inferring head/tail from the left, TS gives unknown for a tuple with a
				// non-trailing variadic element, e.g. [...0[], 1]. if we see a result
				// that looks like that, try inferring init/last from the right instead
				[[unknown, unknown[]], elements] extends [
						[head, tail],
						[...infer init, (infer last)?]
					]
				? result<{
						head: init[0]
						last: last
						source: "last"
						optional: [] extends elements ? true : false
						rest: init
					}>
				: result<{
						// Inferring params often results in optional adding `|undefined`,
						// so the goal here is to counteract that. If this
						// causes problems, it should be removed.
						head: [] extends elements
							? Exclude<head, undefined>
							: head
						last: tail[tail["length"]]
						source: "head"
						optional: [] extends elements ? true : false
						rest: tail
					}>
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
