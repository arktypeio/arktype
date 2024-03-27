import { attest } from "@arktype/attest"
import { entriesOf, flatMorph } from "@arktype/util"
import { boundKindPairsByLower } from "../../constraints/refinements/range.js"
import { node } from "../../keywords/ark.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { IntersectionSchema } from "../../types/intersection.js"

const numericCases = {
	lessThanMin: 4,
	equalToExclusiveMin: 5,
	between: 8,
	equalToInclusiveMax: 10,
	greaterThanMax: 11
}

const dateCases = flatMorph(numericCases, (name, v) => [name, new Date(v)])

const lengthCases = flatMorph(numericCases, (name, v) => [name, "1".repeat(v)])

describe("bounds", () => {
	it("numeric apply", () => {
		const t = node({
			domain: "number",
			min: { rule: 5, exclusive: true },
			max: { rule: 10 }
		})

		attest(t(numericCases.lessThanMin).errors?.summary).snap(
			"must be more than 5 (was 4)"
		)
		attest(t(numericCases.equalToExclusiveMin).errors?.summary).snap(
			"must be more than 5 (was 5)"
		)
		attest(t(numericCases.between).errors).equals(undefined)
		attest(t(numericCases.equalToInclusiveMax).errors).equals(undefined)
		attest(t(numericCases.greaterThanMax).errors?.summary).snap(
			"must be at most 10 (was 11)"
		)
	})
	it("length apply", () => {
		const t = node({
			domain: "string",
			minLength: { rule: 5, exclusive: true },
			maxLength: { rule: 10 }
		})

		attest(t(lengthCases.lessThanMin).errors?.summary).snap(
			"must be more than length 5 (was 4)"
		)
		attest(t(lengthCases.equalToExclusiveMin).errors?.summary).snap(
			"must be more than length 5 (was 5)"
		)
		attest(t(lengthCases.between).errors).equals(undefined)
		attest(t(lengthCases.equalToInclusiveMax).errors).equals(undefined)
		attest(t(lengthCases.greaterThanMax).errors?.summary).snap(
			"must be at most length 10 (was 11)"
		)
	})
	it("date apply", () => {
		const t = node({
			proto: Date,
			after: { rule: 5, exclusive: true },
			before: { rule: 10 }
		})

		attest(t(dateCases.lessThanMin).errors?.summary).snap(
			"must be after 12/31/1969, 7:00:00 PM (was 12/31/1969, 7:00:00 PM)"
		)
		attest(t(dateCases.equalToExclusiveMin).errors?.summary).snap(
			"must be after 12/31/1969, 7:00:00 PM (was 12/31/1969, 7:00:00 PM)"
		)
		attest(t(dateCases.between).errors).equals(undefined)
		attest(t(dateCases.equalToInclusiveMax).errors).equals(undefined)
		attest(t(dateCases.greaterThanMax).errors?.summary).snap(
			"must be 12/31/1969, 7:00:00 PM or earlier (was 12/31/1969, 7:00:00 PM)"
		)
	})

	entriesOf(boundKindPairsByLower).forEach(([min, max]) => {
		describe(`${min}/${max}`, () => {
			const basis =
				min === "min"
					? { domain: "number" }
					: min === "minLength"
					? { domain: "string" }
					: { proto: Date }
			const cases =
				min === "min"
					? numericCases
					: min === "minLength"
					? lengthCases
					: dateCases
			it("allows", () => {
				const t = node({
					...basis,
					[min]: { rule: 5, exclusive: true },
					[max]: { rule: 10 }
				} as IntersectionSchema)

				attest(t.allows(cases.lessThanMin)).equals(false)
				attest(t.allows(cases.equalToExclusiveMin)).equals(false)
				attest(t.allows(cases.between)).equals(true)
				attest(t.allows(cases.equalToInclusiveMax)).equals(true)
				attest(t.allows(cases.greaterThanMax)).equals(false)
			})
			it("unit range reduces", () => {
				const l = node({
					...basis,
					[min]: {
						rule: 6
					}
				} as IntersectionSchema)
				const r = node({
					...basis,
					[max]: {
						rule: 6
					}
				} as IntersectionSchema)
				const expected =
					min === "min"
						? node({
								unit: 6
						  })
						: min === "minLength"
						? node({
								...basis,
								exactLength: 6
						  } as IntersectionSchema)
						: node({
								unit: new Date(6)
						  })

				attest(l.and(r).json).equals(expected.json)
				attest(r.and(l).json).equals(expected.json)
			})
			it("non-overlapping exclusive", () => {
				const l = node({
					...basis,
					[min]: {
						rule: 3
					}
				} as IntersectionSchema)
				const r = node({
					...basis,
					[max]: {
						rule: 3,
						exclusive: true
					}
				} as IntersectionSchema)
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})
			it("non-overlapping limits", () => {
				const l = node({ ...basis, [min]: 3 } as IntersectionSchema)
				const r = node({
					...basis,
					[max]: 1
				} as IntersectionSchema)
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})
			it("greater min is stricter", () => {
				const lesser = node({ ...basis, [min]: 3 } as IntersectionSchema)
				const greater = node({
					...basis,
					[min]: 4
				} as IntersectionSchema)
				attest(lesser.and(greater).json).equals(greater.json)
				attest(greater.and(lesser).json).equals(greater.json)
			})
			it("lesser max is stricter", () => {
				const lesser = node({ ...basis, [max]: 3 } as IntersectionSchema)
				const greater = node({
					...basis,
					[max]: { rule: 4, exclusive: true }
				} as IntersectionSchema)
				attest(lesser.and(greater).json).equals(lesser.json)
				attest(greater.and(lesser).json).equals(lesser.json)
			})
			it("exclusive wins if limits equal", () => {
				const exclusive = node({
					...basis,
					[max]: { rule: 3, exclusive: true }
				} as IntersectionSchema)
				const inclusive = node({
					...basis,
					[max]: 3
				} as IntersectionSchema)
				attest(exclusive.and(inclusive).json).equals(exclusive.json)
				attest(inclusive.and(exclusive).json).equals(exclusive.json)
			})
		})
	})
})
