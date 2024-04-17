import { attest } from "@arktype/attest"
import { schema } from "@arktype/schema"
import { entriesOf, flatMorph } from "@arktype/util"
import { describe, it } from "vitest"
import { boundKindPairsByLower } from "../constraints/refinements/range.js"
import type { IntersectionDef } from "../schemas/intersection.js"
import { Disjoint } from "../shared/disjoint.js"

const numericCases = {
	lessThanMin: 4,
	equalToExclusiveMin: 5,
	between: 8,
	equalToInclusiveMax: 10,
	greaterThanMax: 11
}

const dateCases = flatMorph(numericCases, (name, v) => [name, new Date(v)])

const lengthCases = flatMorph(numericCases, (name, v) => [name, "1".repeat(v)])

it("numeric apply", () => {
	const t = schema({
		domain: "number",
		min: { rule: 5, exclusive: true },
		max: { rule: 10 }
	})

	attest(t.traverse(numericCases.lessThanMin).errors?.summary).snap(
		"must be more than 5 (was 4)"
	)
	attest(t.traverse(numericCases.equalToExclusiveMin).errors?.summary).snap(
		"must be more than 5 (was 5)"
	)
	attest(t.traverse(numericCases.between).errors).equals(undefined)
	attest(t.traverse(numericCases.equalToInclusiveMax).errors).equals(undefined)
	attest(t.traverse(numericCases.greaterThanMax).errors?.summary).snap(
		"must be at most 10 (was 11)"
	)
})

it("length apply", () => {
	const t = schema({
		domain: "string",
		minLength: { rule: 5, exclusive: true },
		maxLength: { rule: 10 }
	})

	attest(t.traverse(lengthCases.lessThanMin).errors?.summary).snap(
		"must be more than length 5 (was 4)"
	)
	attest(t.traverse(lengthCases.equalToExclusiveMin).errors?.summary).snap(
		"must be more than length 5 (was 5)"
	)
	attest(t.traverse(lengthCases.between).errors).equals(undefined)
	attest(t.traverse(lengthCases.equalToInclusiveMax).errors).equals(undefined)
	attest(t.traverse(lengthCases.greaterThanMax).errors?.summary).snap(
		"must be at most length 10 (was 11)"
	)
})

it("date apply", () => {
	const t = schema({
		proto: Date,
		after: { rule: 5, exclusive: true },
		before: { rule: 10 }
	})

	attest(t.traverse(dateCases.lessThanMin).errors?.summary).snap(
		"must be after 12/31/1969, 7:00:00 PM (was 12/31/1969, 7:00:00 PM)"
	)
	attest(t.traverse(dateCases.equalToExclusiveMin).errors?.summary).snap(
		"must be after 12/31/1969, 7:00:00 PM (was 12/31/1969, 7:00:00 PM)"
	)
	attest(t.traverse(dateCases.between).errors).equals(undefined)
	attest(t.traverse(dateCases.equalToInclusiveMax).errors).equals(undefined)
	attest(t.traverse(dateCases.greaterThanMax).errors?.summary).snap(
		"must be 12/31/1969, 7:00:00 PM or earlier (was 12/31/1969, 7:00:00 PM)"
	)
})

entriesOf(boundKindPairsByLower).forEach(([min, max]) => {
	describe(`${min}/${max}`, () => {
		const basis =
			min === "min" ? { domain: "number" }
			: min === "minLength" ? { domain: "string" }
			: { proto: Date }
		const cases =
			min === "min" ? numericCases
			: min === "minLength" ? lengthCases
			: dateCases

		it("allows", () => {
			const t = schema({
				...basis,
				[min]: { rule: 5, exclusive: true },
				[max]: { rule: 10 }
			} as IntersectionDef)

			attest(t.allows(cases.lessThanMin)).equals(false)
			attest(t.allows(cases.equalToExclusiveMin)).equals(false)
			attest(t.allows(cases.between)).equals(true)
			attest(t.allows(cases.equalToInclusiveMax)).equals(true)
			attest(t.allows(cases.greaterThanMax)).equals(false)
		})

		it("unit range reduces", () => {
			const l = schema({
				...basis,
				[min]: {
					rule: 6
				}
			} as IntersectionDef)
			const r = schema({
				...basis,
				[max]: {
					rule: 6
				}
			} as IntersectionDef)
			const expected =
				min === "min" ?
					schema({
						unit: 6
					})
				: min === "minLength" ?
					schema({
						...basis,
						exactLength: 6
					} as IntersectionDef)
				:	schema({
						unit: new Date(6)
					})

			attest(l.and(r).json).equals(expected.json)
			attest(r.and(l).json).equals(expected.json)
		})

		it("non-overlapping exclusive", () => {
			const l = schema({
				...basis,
				[min]: {
					rule: 3
				}
			} as IntersectionDef)
			const r = schema({
				...basis,
				[max]: {
					rule: 3,
					exclusive: true
				}
			} as IntersectionDef)
			attest(l.intersect(r)).instanceOf(Disjoint)
			attest(r.intersect(l)).instanceOf(Disjoint)
		})

		it("non-overlapping limits", () => {
			const l = schema({ ...basis, [min]: 3 } as IntersectionDef)
			const r = schema({
				...basis,
				[max]: 1
			} as IntersectionDef)
			attest(l.intersect(r)).instanceOf(Disjoint)
			attest(r.intersect(l)).instanceOf(Disjoint)
		})

		it("greater min is stricter", () => {
			const lesser = schema({
				...basis,
				[min]: 3
			} as IntersectionDef)
			const greater = schema({
				...basis,
				[min]: 4
			} as IntersectionDef)
			attest(lesser.and(greater).json).equals(greater.json)
			attest(greater.and(lesser).json).equals(greater.json)
		})

		it("lesser max is stricter", () => {
			const lesser = schema({
				...basis,
				[max]: 3
			} as IntersectionDef)
			const greater = schema({
				...basis,
				[max]: { rule: 4, exclusive: true }
			} as IntersectionDef)
			attest(lesser.and(greater).json).equals(lesser.json)
			attest(greater.and(lesser).json).equals(lesser.json)
		})

		it("exclusive wins if limits equal", () => {
			const exclusive = schema({
				...basis,
				[max]: { rule: 3, exclusive: true }
			} as IntersectionDef)
			const inclusive = schema({
				...basis,
				[max]: 3
			} as IntersectionDef)
			attest(exclusive.and(inclusive).json).equals(exclusive.json)
			attest(inclusive.and(exclusive).json).equals(exclusive.json)
		})
	})
})
