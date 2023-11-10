import type { Fn } from "./functions.ts"
import type { conform } from "./generics.ts"
import type { join } from "./lists.ts"

export type stringifyUnion<t extends string> = join<unionToTuple<t>, ", ">

export type unionToTuple<t> = unionToTupleRecurse<t, []> extends infer result
	? conform<result, t[]>
	: never

type unionToTupleRecurse<
	t,
	result extends unknown[]
> = getLastBranch<t> extends infer current
	? [t] extends [never]
		? result
		: unionToTupleRecurse<Exclude<t, current>, [current, ...result]>
	: never

type getLastBranch<t> = intersectUnion<
	t extends unknown ? (x: t) => void : never
> extends (x: infer branch) => void
	? branch
	: never

export type intersectUnion<t> = (
	t extends unknown ? (_: t) => void : never
) extends (_: infer intersection) => void
	? intersection
	: never

// Based on: https://tsplay.dev/WvydBm
export type overloadOf<
	f extends Fn,
	givenArgs extends readonly unknown[] = readonly unknown[]
> = Exclude<
	collectSignatures<
		// The "() => never" signature must be hoisted to the "front" of the
		// intersection, for two reasons: a) because recursion stops when it is
		// encountered, and b) it seems to prevent the collapse of subsequent
		// "compatible" signatures (eg. "() => void" into "(a?: 1) => void"),
		// which gives a direct conversion to a union.
		(() => never) & f,
		givenArgs,
		unknown
	>,
	f extends () => never ? never : () => never
>

type collectSignatures<
	f,
	givenArgs extends readonly unknown[],
	result
> = result & f extends (...args: infer args) => infer returns
	? result extends f
		? never
		:
				| collectSignatures<
						f,
						givenArgs,
						Pick<f, keyof f> & result & ((...args: args) => returns)
				  >
				| (args extends givenArgs ? (...args: args) => returns : never)
	: never
