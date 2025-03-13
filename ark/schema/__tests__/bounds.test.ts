import { attest, contextualize } from "@ark/attest"
import {
	Disjoint,
	boundKindPairsByLower,
	rootSchema,
	writeInvalidLengthBoundMessage
} from "@ark/schema"
import { entriesOf, flatMorph } from "@ark/util"

const numericCases = {
	lessThanMin: 4,
	equalToExclusiveMin: 5,
	between: 8,
	equalToInclusiveMax: 10,
	greaterThanMax: 11
}

const dateCases = flatMorph(numericCases, (name, v) => [name, new Date(v)])

const lengthCases = flatMorph(numericCases, (name, v) => [name, "1".repeat(v)])

contextualize(() => {
	it("numeric apply", () => {
		const t = rootSchema({
			domain: "number",
			min: { rule: 5, exclusive: true },
			max: { rule: 10 }
		})

		const out = t.select({
			kind: "domain",
			where: d => d.domain === "string"
		})

		const out3 = t.select({
			where: n => n.hasKind("domain")
		})

		const out2 = t.select({
			kind: "domain"
		})

		attest(t.traverse(numericCases.lessThanMin)?.toString()).snap(
			"must be more than 5 (was 4)"
		)
		attest(t.traverse(numericCases.equalToExclusiveMin)?.toString()).snap(
			"must be more than 5 (was 5)"
		)
		attest(t.traverse(numericCases.between)).equals(numericCases.between)
		attest(t.traverse(numericCases.equalToInclusiveMax)).equals(
			numericCases.equalToInclusiveMax
		)
		attest(t.traverse(numericCases.greaterThanMax)?.toString()).snap(
			"must be at most 10 (was 11)"
		)
	})

	it("length apply", () => {
		const t = rootSchema({
			domain: "string",
			minLength: { rule: 5, exclusive: true },
			maxLength: { rule: 10 }
		})

		attest(t.traverse(lengthCases.lessThanMin)?.toString()).snap(
			"must be at least length 6 (was 4)"
		)
		attest(t.traverse(lengthCases.equalToExclusiveMin)?.toString()).snap(
			"must be at least length 6 (was 5)"
		)
		attest(t.traverse(lengthCases.between)).equals(lengthCases.between)
		attest(t.traverse(lengthCases.equalToInclusiveMax)).equals(
			lengthCases.equalToInclusiveMax
		)
		attest(t.traverse(lengthCases.greaterThanMax)?.toString()).snap(
			"must be at most length 10 (was 11)"
		)
	})

	it("date apply", () => {
		const t = rootSchema({
			proto: Date,
			after: { rule: 5, exclusive: true },
			before: { rule: 10 }
		})

		attest(t.traverse(dateCases.lessThanMin)?.toString()).snap(
			"must be 7:00:00.006 PM, December 31, 1969 or later (was 7:00:00.004 PM, December 31, 1969)"
		)
		attest(t.traverse(dateCases.equalToExclusiveMin)?.toString()).snap(
			"must be 7:00:00.006 PM, December 31, 1969 or later (was 7:00:00.005 PM, December 31, 1969)"
		)
		attest(t.traverse(dateCases.between)).equals(dateCases.between)
		attest(t.traverse(dateCases.equalToInclusiveMax)).equals(
			dateCases.equalToInclusiveMax
		)
		attest(t.traverse(dateCases.greaterThanMax)?.toString()).snap(
			"must be 7:00:00.010 PM, December 31, 1969 or earlier (was 7:00:00.011 PM, December 31, 1969)"
		)
	})

	it("errors on negative length bound", () => {
		attest(() => rootSchema({ domain: "string", maxLength: -1 })).throws(
			writeInvalidLengthBoundMessage("maxLength", -1)
		)
	})

	it("errors on non-integer length bound", () => {
		attest(() => rootSchema({ domain: "string", exactLength: 1.5 })).throws(
			writeInvalidLengthBoundMessage("exactLength", 1.5)
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
				const t = rootSchema({
					...basis,
					[min]: { rule: 5, exclusive: true },
					[max]: { rule: 10 }
				} as never)

				attest(t.allows(cases.lessThanMin)).equals(false)
				attest(t.allows(cases.equalToExclusiveMin)).equals(false)
				attest(t.allows(cases.between)).equals(true)
				attest(t.allows(cases.equalToInclusiveMax)).equals(true)
				attest(t.allows(cases.greaterThanMax)).equals(false)
			})

			it("unit range reduces", () => {
				const l = rootSchema({
					...basis,
					[min]: {
						rule: 6
					}
				} as never)
				const r = rootSchema({
					...basis,
					[max]: {
						rule: 6
					}
				} as never)
				const expected =
					min === "min" ?
						rootSchema({
							unit: 6
						})
					: min === "minLength" ?
						rootSchema({
							...basis,
							exactLength: 6
						} as never)
					:	rootSchema({
							unit: new Date(6)
						})

				attest(l.and(r).json).equals(expected.json)
				attest(r.and(l).json).equals(expected.json)
			})

			it("non-overlapping exclusive", () => {
				const l = rootSchema({
					...basis,
					[min]: {
						rule: 3
					}
				} as never)
				const r = rootSchema({
					...basis,
					[max]: {
						rule: 3,
						exclusive: true
					}
				} as never)
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})

			it("non-overlapping limits", () => {
				const l = rootSchema({ ...basis, [min]: 3 } as never)
				const r = rootSchema({
					...basis,
					[max]: 1
				} as never)
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})

			it("greater min is stricter", () => {
				const lesser = rootSchema({
					...basis,
					[min]: 3
				} as never)
				const greater = rootSchema({
					...basis,
					[min]: 4
				} as never)
				attest(lesser.and(greater).json).equals(greater.json)
				attest(greater.and(lesser).json).equals(greater.json)
			})

			it("lesser max is stricter", () => {
				const lesser = rootSchema({
					...basis,
					[max]: 3
				} as never)
				const greater = rootSchema({
					...basis,
					[max]: { rule: 4, exclusive: true }
				} as never)
				attest(lesser.and(greater).json).equals(lesser.json)
				attest(greater.and(lesser).json).equals(lesser.json)
			})

			it("exclusive wins if limits equal", () => {
				const exclusive = rootSchema({
					...basis,
					[max]: { rule: 3, exclusive: true }
				} as never)
				const inclusive = rootSchema({
					...basis,
					[max]: 3
				} as never)
				attest(exclusive.and(inclusive).json).equals(exclusive.json)
				attest(inclusive.and(exclusive).json).equals(exclusive.json)
			})
		})
	})
})
