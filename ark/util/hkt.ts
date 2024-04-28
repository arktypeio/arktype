import type { conform } from "./generics.js"

export type instantiate<
	hkt extends Hkt.Instantiable,
	args extends Parameters<hkt[Hkt.instantiate]>[0]
> = ReturnType<
	(hkt & {
		readonly [Hkt.args]: args
	})[Hkt.instantiate]
>

/** A small set of HKT utility types based on https://github.com/poteat/hkt-toolbelt */
export namespace Hkt {
	export declare const args: unique symbol
	export type args = typeof args

	export declare const instantiate: unique symbol
	export type instantiate = typeof instantiate

	export abstract class Kind<
		hkt extends (...args: any[]) => unknown = (...args: any[]) => unknown
	> {
		declare readonly [args]: unknown
		abstract readonly hkt: hkt
	}

	export abstract class Instantiable {
		declare readonly [args]: unknown;

		abstract readonly [instantiate]: (...args: never[]) => Instantiable
	}

	export type apply<
		hkt extends Kind,
		args extends Parameters<hkt["hkt"]>[0]
	> = ReturnType<
		(hkt & {
			readonly [args]: args
		})["hkt"]
	>

	export interface Reify extends Kind {
		hkt(In: conform<this[args], Kind>): reify<typeof In>
	}

	export const reify = <def extends Kind>(def: def): reify<def> =>
		def.hkt as never

	export type reify<hkt extends Kind> = <
		const In extends Parameters<hkt["hkt"]>[0]
	>(
		In: In
	) => Hkt.apply<hkt, In>

	export abstract class UnaryKind<
		hkt extends (In: never) => unknown = (In: any) => unknown
	> {
		declare readonly [args]: unknown
		abstract readonly hkt: hkt
	}

	type validatePipedKinds<
		kinds extends UnaryKind[],
		Out = Parameters<kinds[0]["hkt"]>[0]
	> =
		kinds extends (
			readonly [infer head extends UnaryKind, ...infer tail extends UnaryKind[]]
		) ?
			Out extends Parameters<head["hkt"]>[0] ?
				[kinds[0], ...validatePipedKinds<tail, Hkt.apply<head, Out>>]
			:	[Kind<(In: Out) => unknown>, ...tail]
		:	[]

	type inferPipedReturn<kinds extends UnaryKind[], Out> =
		kinds extends (
			readonly [infer head extends UnaryKind, ...infer tail extends UnaryKind[]]
		) ?
			inferPipedReturn<tail, Hkt.apply<head, Out>>
		:	Out

	export type pipe<kinds extends UnaryKind[]> = <
		In extends Parameters<kinds[0]["hkt"]>[0]
	>(
		In: In
	) => inferPipedReturn<kinds, In>

	export const pipe =
		<
			kinds extends UnaryKind[],
			validatedKinds extends UnaryKind[] = validatePipedKinds<kinds>
		>(
			...kinds: {
				[i in keyof kinds]: conform<
					kinds[i],
					validatedKinds[i & keyof validatedKinds]
				>
			}
		): pipe<kinds> =>
		In =>
			kinds.reduce(
				(out, kind) => (kind as Hkt.UnaryKind<(_: any) => any>).hkt(out),
				In
			)
}
