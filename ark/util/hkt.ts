import { noSuggest } from "./errors.ts"

const args = noSuggest("args")
type args = typeof args

export abstract class Hkt<constraints extends unknown[] = any> {
	declare [args]: unknown[]
	declare constraints: constraints
	declare args: this[args] extends infer args extends unknown[] ? args : never
	declare 0: this[args] extends [infer arg, ...any] ? arg : never
	declare 1: this[args] extends [any, infer arg, ...any] ? arg : never
	declare 2: this[args] extends [any, any, infer arg, ...any] ? arg : never
	declare 3: this[args] extends [any, any, any, infer arg, ...any] ? arg : never
	abstract body: unknown

	declare description?: string

	constructor() {}
}

/** A small set of HKT utility types based on https://github.com/gvergnaud/hotscript
 *  See https://github.com/gvergnaud/hotscript/blob/main/src/internals/core/Core.ts
 */
export declare namespace Hkt {
	export type constructor<constraints extends unknown[] = any> =
		new () => Hkt<constraints>

	export type args = typeof args

	export type apply<
		hkt extends Hkt,
		args extends { [i in keyof args]: hkt["constraints"][i] }
	> = (hkt & {
		[args]: args
	})["body"]
}
