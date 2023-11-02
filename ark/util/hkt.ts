import type { Fn } from "./functions.js"
import type { conform } from "./generics.js"

/** A small set of HKT utility types based on https://github.com/poteat/hkt-toolbelt */
export namespace Hkt {
	export declare const key: unique symbol
	export type key = typeof key

	export abstract class Kind<f extends Fn = Fn> {
		declare readonly [key]: unknown
		abstract f: f
	}

	export type apply<
		hkt extends Kind,
		args extends Parameters<hkt["f"]>[0]
	> = ReturnType<
		(hkt & {
			readonly [key]: args
		})["f"]
	>

	export interface Reify extends Kind {
		f(In: conform<this[key], Kind>): reify<typeof In>
	}

	export const reify = <def extends Kind>(def: def) => def.f as reify<def>

	export type reify<hkt extends Kind> = hkt & {
		<In extends Parameters<hkt["f"]>[0]>(In: In): Hkt.apply<hkt, In>
	}
}
