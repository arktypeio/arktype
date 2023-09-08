import type { Fn } from "./functions.js"
import type { conform } from "./generics.js"

// export declare abstract class Hkt<f extends Fn = Fn> {
// 	abstract readonly [Hkt.key]: unknown
// 	f: f
// }

export interface Hkt<f extends Fn = Fn> {
	readonly [Hkt.key]: unknown
	f: f
}

/** A small set of HKT utility types based on https://github.com/poteat/hkt-toolbelt */
export namespace Hkt {
	export declare const key: unique symbol

	export type key = typeof key

	export type apply<
		hkt extends Record<k, Fn>,
		args extends Parameters<hkt[k]>[0],
		k extends string = "f"
	> = ReturnType<
		(hkt & {
			readonly [key]: args
		})[k]
	>

	export type inputOf<
		hkt extends Record<k, Fn>,
		k extends string = "f"
	> = Parameters<hkt[k]>[0]

	export type reify<hkt extends Record<k, Fn>, k extends string = "f"> = hkt & {
		<In extends inputOf<hkt, k>>(
			In: narrow<In>
		): apply<hkt, In, k> extends Hkt
			? reify<apply<hkt, In, k>>
			: apply<hkt, In, k>
	}

	export interface Reify extends Hkt {
		f(In: conform<this[key], Hkt>): reify<typeof In>
	}

	type Narrowable =
		| string
		| number
		| bigint
		| boolean
		| undefined
		| null
		| Fn
		| Hkt
		| readonly Narrowable[]
		| {
				[key: string]: Narrowable
		  }

	export type narrow<
		t,
		base = conform<t, Narrowable> | [...conform<t, Narrowable[]>]
	> = base extends readonly unknown[] ? { [i in keyof t]: narrow<t[i]> } : base

	export interface Narrow extends Hkt {
		f(In: this[key]): narrow<typeof In>
	}
}
