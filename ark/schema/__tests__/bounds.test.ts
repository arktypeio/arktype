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
		const T = rootSchema({
			domain: "number",
			min: { rule: 5, exclusive: true },
			max: { rule: 10 }
		})

		attest(T.traverse(numericCases.lessThanMin)?.toString()).snap(
			"must be more than 5 (was 4)"
		)
		attest(T.traverse(numericCases.equalToExclusiveMin)?.toString()).snap(
			"must be more than 5 (was 5)"
		)
		attest(T.traverse(numericCases.between)).equals(numericCases.between)
		attest(T.traverse(numericCases.equalToInclusiveMax)).equals(
			numericCases.equalToInclusiveMax
		)
		attest(T.traverse(numericCases.greaterThanMax)?.toString()).snap(
			"must be at most 10 (was 11)"
		)
	})

	it("length apply", () => {
		const T = rootSchema({
			domain: "string",
			minLength: { rule: 5, exclusive: true },
			maxLength: { rule: 10 }
		})

		attest(T.traverse(lengthCases.lessThanMin)?.toString()).snap(
			"must be at least length 6 (was 4)"
		)
		attest(T.traverse(lengthCases.equalToExclusiveMin)?.toString()).snap(
			"must be at least length 6 (was 5)"
		)
		attest(T.traverse(lengthCases.between)).equals(lengthCases.between)
		attest(T.traverse(lengthCases.equalToInclusiveMax)).equals(
			lengthCases.equalToInclusiveMax
		)
		attest(T.traverse(lengthCases.greaterThanMax)?.toString()).snap(
			"must be at most length 10 (was 11)"
		)
	})

	it("date apply", () => {
		const T = rootSchema({
			proto: Date,
			after: { rule: 5, exclusive: true },
			before: { rule: 10 }
		})

		attest(T.traverse(dateCases.lessThanMin)?.toString()).snap(
			"must be 7:00:00.006 PM, December 31, 1969 or later (was 7:00:00.004 PM, December 31, 1969)"
		)
		attest(T.traverse(dateCases.equalToExclusiveMin)?.toString()).snap(
			"must be 7:00:00.006 PM, December 31, 1969 or later (was 7:00:00.005 PM, December 31, 1969)"
		)
		attest(T.traverse(dateCases.between)).equals(dateCases.between)
		attest(T.traverse(dateCases.equalToInclusiveMax)).equals(
			dateCases.equalToInclusiveMax
		)
		attest(T.traverse(dateCases.greaterThanMax)?.toString()).snap(
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
				const T = rootSchema({
					...basis,
					[min]: { rule: 5, exclusive: true },
					[max]: { rule: 10 }
				} as never)

				attest(T.allows(cases.lessThanMin)).equals(false)
				attest(T.allows(cases.equalToExclusiveMin)).equals(false)
				attest(T.allows(cases.between)).equals(true)
				attest(T.allows(cases.equalToInclusiveMax)).equals(true)
				attest(T.allows(cases.greaterThanMax)).equals(false)
			})

			it("unit range reduces", () => {
				const L = rootSchema({
					...basis,
					[min]: {
						rule: 6
					}
				} as never)
				const R = rootSchema({
					...basis,
					[max]: {
						rule: 6
					}
				} as never)
				const Expected =
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

				attest(L.and(R).json).equals(Expected.json)
				attest(R.and(L).json).equals(Expected.json)
			})

			it("non-overlapping exclusive", () => {
				const L = rootSchema({
					...basis,
					[min]: {
						rule: 3
					}
				} as never)
				const R = rootSchema({
					...basis,
					[max]: {
						rule: 3,
						exclusive: true
					}
				} as never)
				attest(L.intersect(R)).instanceOf(Disjoint)
				attest(R.intersect(L)).instanceOf(Disjoint)
			})

			it("non-overlapping limits", () => {
				const L = rootSchema({ ...basis, [min]: 3 } as never)
				const R = rootSchema({
					...basis,
					[max]: 1
				} as never)
				attest(L.intersect(R)).instanceOf(Disjoint)
				attest(R.intersect(L)).instanceOf(Disjoint)
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
