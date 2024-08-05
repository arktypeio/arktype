/** A small set of HKT utility types based on https://github.com/gvergnaud/hotscript
 *  See https://github.com/gvergnaud/hotscript/blob/main/src/internals/core/Core.ts
 */
export namespace Hkt {
	export declare const args: unique symbol
	export type args = typeof args

	export interface Kind {
		[args]: unknown
		args: this[args] extends infer args extends unknown[] ? args : never
		0: this[args] extends [infer arg, ...any] ? arg : never
		1: this[args] extends [any, infer arg, ...any] ? arg : never
		2: this[args] extends [any, any, infer arg, ...any] ? arg : never
		3: this[args] extends [any, any, any, infer arg, ...any] ? arg : never
		out: unknown
	}

	export type apply<hkt extends Kind, args extends unknown[]> = (hkt & {
		[args]: args
	})["out"]
}
