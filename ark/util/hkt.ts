import type { conform } from "./generics.js"

/** A small set of HKT utility types based on https://github.com/poteat/hkt-toolbelt */
export namespace Hkt {
	export declare const key: unique symbol
	export type key = typeof key

	export abstract class Kind<
		f extends (...args: any[]) => unknown = (...args: any[]) => unknown
	> {
		declare readonly [key]: unknown
		abstract readonly f: f
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

	export type reify<hkt extends Kind> = <
		const In extends Parameters<hkt["f"]>[0]
	>(
		In: In
	) => Hkt.apply<hkt, In>

	export abstract class UnaryKind<
		f extends (In: never) => unknown = (In: any) => unknown
	> {
		declare readonly [key]: unknown
		abstract readonly f: f
	}

	type validatePipedKinds<
		kinds extends UnaryKind[],
		out = Parameters<kinds[0]["f"]>[0]
	> = kinds extends readonly [
		infer head extends UnaryKind,
		...infer tail extends UnaryKind[]
	]
		? out extends Parameters<head["f"]>[0]
			? [kinds[0], ...validatePipedKinds<tail, Hkt.apply<head, out>>]
			: [Kind<(In: out) => unknown>, ...tail]
		: []

	type inferPipedReturn<
		kinds extends UnaryKind[],
		out
	> = kinds extends readonly [
		infer head extends UnaryKind,
		...infer tail extends UnaryKind[]
	]
		? inferPipedReturn<tail, Hkt.apply<head, out>>
		: out

	export type pipe<kinds extends UnaryKind[]> = <
		In extends Parameters<kinds[0]["f"]>[0]
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
		(In) =>
			kinds.reduce(
				(out, kind) => (kind as Hkt.UnaryKind<(_: any) => any>).f(out),
				In
			)
}
