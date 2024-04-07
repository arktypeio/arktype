import { attest } from "@arktype/attest"
import { Hkt, type array, type conform, type evaluate } from "@arktype/util"

describe("hkt", () => {
	interface AppendKind extends Hkt.Kind {
		hkt: (
			args: conform<
				this[Hkt.args],
				readonly [element: unknown, to: array]
			>
		) => [...(typeof args)[1], (typeof args)[0]]
	}
	it("base", () => {
		type result = Hkt.apply<AppendKind, [2, [0, 1]]>
		attest<[0, 1, 2], result>()
	})
	it("reify", () => {
		const append = (([element, to]: [unknown, array]) => [
			...to,
			element
		]) as Hkt.apply<Hkt.Reify, AppendKind>
		const result = append([2, [0, 1]])
		attest<[0, 1, 2]>(result)
	})
	const AddB = new (class AddB extends Hkt.UnaryKind {
		hkt = (
			args: conform<this[Hkt.args], { a: number }>
		): evaluate<typeof args & { b: (typeof args)["a"] }> =>
			Object.assign(args, { b: args.a } as const)
	})()
	const AddC = new (class extends Hkt.UnaryKind {
		hkt = (
			args: conform<this[Hkt.args], { a: number; b: number }>
		): evaluate<
			typeof args & { c: [(typeof args)["a"], (typeof args)["b"]] }
		> => Object.assign(args, { c: [args.a, args.b] } as const) as never
	})()
	it("pipe", () => {
		type result1 = Hkt.apply<typeof AddB, { a: 1 }>
		attest<{ a: 1; b: 1 }, result1>()
		const addAB = Hkt.pipe(AddB, AddC)
		const result = addAB({ a: 1 as const })
		attest<{ a: 1; b: 1; c: [1, 1] }>(result).equals({
			a: 1,
			b: 1,
			c: [1, 1]
		})
	})

	it("initial parameter", () => {
		const addAB = Hkt.pipe(AddB, AddC)
		// @ts-expect-error
		attest(() => addAB({})).type.errors.snap()
	})
	it("validates pipeable", () => {
		const AddD = new (class AddD extends Hkt.UnaryKind {
			hkt = (
				args: conform<this[Hkt.args], { c: number }>
			): evaluate<typeof args & { d: (typeof args)["c"] }> => {
				return Object.assign(args, { d: args.c } as const)
			}
		})()
		// @ts-expect-error
		attest(() => Hkt.pipe(AddB, AddD)).type.errors.snap()
	})
})
