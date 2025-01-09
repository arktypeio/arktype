import { attest, contextualize } from "@ark/attest"
import { flatMorph } from "@ark/util"

contextualize(() => {
	it("object", () => {
		const result = flatMorph({ a: true, b: false }, (k, v) =>
			k === "a" ?
				([
					[k, v],
					["c", "d"]
				] as const)
			:	(["e", "f"] as const)
		)
		attest<{
			a: true
			c: "d"
			e: "f"
		}>(result).equals({ a: true, c: "d", e: "f" })
	})

	it("filters empty result", () => {
		const result = flatMorph({ a: true, b: false }, (k, v) =>
			k === "a" ? ([k, v] as const) : []
		)
		attest<{
			a: true
		}>(result).equals({ a: true })
	})

	it("object with index", () => {
		// needs to be annotated for now due to a TS bug
		const result = flatMorph({ a: true, b: false }, (k, v, i: number) =>
			k === "a" ?
				([
					[k, v],
					["c", "d"]
				] as const)
			:	([`${i}`, "f"] as const)
		)

		attest<{
			[x: `${number}`]: "f"
			a: true
			c: "d"
		}>(result).equals({ a: true, c: "d", "1": "f" })
	})

	it("converts numeric keys to array", () => {
		const result = flatMorph({ a: true, b: false, c: 5 }, (k, v) =>
			k === "a" ? ([0, v] as const) : ([1, v] as const)
		)
		attest<[true, false | 5]>(result).equals([true, 5])
	})

	it("converts numeric key with index to array", () => {
		// index needs to be annotated for now due to a TS bug
		const result = flatMorph({ a: true, b: false, c: 5 }, (k, v, i: number) =>
			k === "a" ? ([0, v] as const) : ([i, v] as const)
		)
		attest<(boolean | 5)[]>(result).equals([true, false, 5])
	})

	it("maps from array using numeric keys", () => {
		const result = flatMorph([0, 1, 2, 3], (i, v) =>
			i === 0 ? ([i, 5] as const) : ([i, v] as const)
		)
		attest<[5, ...(1 | 2 | 3)[]]>(result).equals([5, 1, 2, 3])
	})

	it("maps from array to object", () => {
		const result = flatMorph(["a", "b", "c"], (i, v) => [v, i])
		attest<{
			a: 0 | 2 | 1
			b: 0 | 2 | 1
			c: 0 | 2 | 1
		}>(result).equals({ a: 0, b: 1, c: 2 })
	})

	it("filters array", () => {
		const result = flatMorph([1, 2, 3] as const, (i, v) =>
			v === 2 ? [] : [i, v]
		)
		attest<(1 | 3)[]>(result).equals([1, 3])
	})

	it("groupable", () => {
		const result = flatMorph({ a: true, b: false, c: 0, d: 1 }, (k, v) =>
			typeof v === "boolean" ?
				([{ group: "bools" }, v] as const)
			:	([{ group: "nums" }, v] as const)
		)

		attest<{
			bools: boolean[]
			nums: (0 | 1)[]
		}>(result).snap({ bools: [true, false], nums: [0, 1] })
	})
})
