import type { array } from "./arrays.js"
import type { domainOf } from "./domain.js"
import type { andPreserveUnknown } from "./generics.js"
import type { Hkt } from "./hkt.js"
import type { propValueOf, requiredKeyOf } from "./records.js"

export interface AndPreserveUnknown extends Hkt<[unknown, unknown]> {
	return: andPreserveUnknown<this[0], this[1]>
}

type SequenceIntersectionKind = "array" | "parameters"

export type intersectArrays<
	l extends array,
	r extends array,
	operator extends Hkt = AndPreserveUnknown
> = intersectSequences<l, r, [], [], operator, "array">

export type intersectParameters<
	l extends array,
	r extends array,
	operator extends Hkt = AndPreserveUnknown
> = intersectSequences<l, r, [], [], operator, "parameters">

type intersectSequences<
	l extends array,
	r extends array,
	acc extends array,
	postfix extends array,
	operation extends Hkt,
	kind extends SequenceIntersectionKind
> =
	l extends readonly [] ?
		// a longer array is assignable to a shorter one when treated as
		// parameters, but not when treated as a tuple
		kind extends "array" ?
			[] extends r ?
				[...acc, ...postfix]
			:	never
		:	[...acc, ...r, ...postfix]
	: r extends readonly [] ?
		kind extends "array" ?
			[] extends l ?
				[...acc, ...postfix]
			:	never
		:	[...acc, ...l, ...postfix]
	: [l, r] extends (
		[
			readonly [(infer lHead)?, ...infer lTail],
			readonly [(infer rHead)?, ...infer rTail]
		]
	) ?
		// if either operand has a non-variadic element at index 0
		// and both operands do not have postfix elements
		// (which causes the inferred head to widen to unknown)
		["0", lHead, rHead] extends [keyof l | keyof r, l[0], r[0]] ?
			intersectSequences<
				lTail,
				rTail,
				[[], []] extends [l, r] ?
					[...acc, Hkt.apply<operation, [lHead, rHead]>?]
				:	[...acc, Hkt.apply<operation, [lHead, rHead]>],
				postfix,
				operation,
				kind
			>
		: l extends readonly [...infer lInit, infer lLast] ?
			r extends readonly [...infer rInit, infer rLast] ?
				intersectSequences<
					lInit,
					rInit,
					acc,
					[Hkt.apply<operation, [lLast, rLast]>, ...postfix],
					operation,
					kind
				>
			:	intersectSequences<
					lInit,
					r,
					acc,
					[Hkt.apply<operation, [lLast, r[number]]>, ...postfix],
					operation,
					kind
				>
		: r extends readonly [...infer rInit, infer rLast] ?
			intersectSequences<
				l,
				rInit,
				acc,
				[Hkt.apply<operation, [l[number], rLast]>, ...postfix],
				operation,
				kind
			>
		:	[...acc, ...Hkt.apply<operation, [lHead, rHead]>[], ...postfix]
	:	never

export type isDisjoint<l, r> =
	l & r extends never ? true
	: domainOf<l> & domainOf<r> extends never ? true
	: [l, r] extends [object, object] ?
		true extends (
			propValueOf<{
				[k in Extract<
					keyof l & keyof r,
					requiredKeyOf<l> | requiredKeyOf<r>
				>]: isDisjoint<l[k], r[k]>
			}>
		) ?
			true
		:	false
	:	false
