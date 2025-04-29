import { attest, contextualize } from "@ark/attest"
import { getDuplicatesOf, groupBy, spliterate, type setIndex } from "@ark/util"

type PinkLady = { group: "apple"; kind: "Pink Lady" }
type Gala = { group: "apple"; kind: "Gala" }
type Bengal = { group: "lychee"; kind: "Bengal" }
type Valencia = { group: "orange"; kind: "Valencia" }
type Bartlett = { group: "pear"; kind: "Bartlett" }
type Anjou = { group: "pear"; kind: "Anjou" }
type VisionPro = { group: "apple"; kind: "Vision Pro" }

export type Fruit =
	| PinkLady
	| Gala
	| Bengal
	| Valencia
	| Bartlett
	| Anjou
	| VisionPro

const pinkLady: PinkLady = { group: "apple", kind: "Pink Lady" }
const visionPro: VisionPro = { group: "apple", kind: "Vision Pro" }
const bengal: Bengal = { group: "lychee", kind: "Bengal" }

const fruits: Fruit[] = [pinkLady, visionPro, bengal]

contextualize(() => {
	it("getDuplicatesOf", () => {
		const duplicates = getDuplicatesOf(["foo", 55, 31, "bar", {}, [], true], {
			isEqual: (l, r) => typeof l === typeof r
		})
		attest(duplicates).equals([
			{ element: 55, indices: [1, 2] },
			{ element: "foo", indices: [0, 3] },
			{ element: {}, indices: [4, 5] }
		])
	})

	it("groupBy", () => {
		const grouped = groupBy(fruits, "group")
		attest<{
			apple?: (PinkLady | Gala | VisionPro)[]
			lychee?: Bengal[]
			orange?: Valencia[]
			pear?: (Bartlett | Anjou)[]
		}>(grouped).equals({
			apple: [pinkLady, visionPro],
			lychee: [bengal]
		})
	})

	it("spliterate", () => {
		const list = [1, "2", "3", 4, 5]
		const [numbers, strings] = spliterate(
			list,
			// explicitly annotated so tests pass pre TS 5.5
			(x): x is number => typeof x === "number"
		)

		attest<number[]>(numbers).equals([1, 4, 5])
		attest<string[]>(strings).equals(["2", "3"])
	})

	it("setIndex", () => {
		type T = setIndex<[1, 2], 1, 1>

		attest<[1, 1], T>()
	})

	it("setIndex readonly", () => {
		type T = setIndex<readonly [1, 2], 1, 1>

		attest<readonly [1, 1], T>()
	})
})
