import { attest, contextualize } from "@ark/attest"
import { Disjoint, rootNode } from "@ark/schema"

const numericCases = {
	lessThanMin: 4,
	equalToExclusiveMin: 5,
	between: 8,
	equalToInclusiveMax: 10,
	greaterThanMax: 11
}

const dateCases = {
	lessThanMin: new Date(4),
	equalToMin: new Date(5),
	between: new Date(8),
	equalToMax: new Date(10),
	greaterThanMax: new Date(11)
}

const lengthCases = {
	lessThanMin: "1".repeat(4),
	equalToMin: "1".repeat(5),
	between: "1".repeat(8),
	equalToMax: "1".repeat(10),
	greaterThanMax: "1".repeat(11)
}

contextualize(() => {
	describe("traverse", () => {
		it("numeric apply", () => {
			const t = rootNode({
				domain: "number",
				min: { rule: 5, exclusive: true },
				max: { rule: 10 }
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
			const t = rootNode({
				domain: "string",
				minLength: 5,
				maxLength: 10
			})

			attest(t.traverse(lengthCases.lessThanMin)?.toString()).snap(
				"must be at least length 5 (was 4)"
			)
			attest(t.traverse(lengthCases.equalToMin)?.toString()).snap(
				lengthCases.equalToMin
			)
			attest(t.traverse(lengthCases.between)).equals(lengthCases.between)
			attest(t.traverse(lengthCases.equalToMax)).equals(lengthCases.equalToMax)
			attest(t.traverse(lengthCases.greaterThanMax)?.toString()).snap(
				"must be at most length 10 (was 11)"
			)
		})

		it("date apply", () => {
			const t = rootNode({
				proto: Date,
				after: 5,
				before: 10
			})

			attest(t.traverse(dateCases.lessThanMin)?.toString()).snap(
				"must be after 12/31/1969, 7:00:00 PM (was 12/31/1969, 7:00:00 PM)"
			)
			attest(t.traverse(dateCases.equalToMin)).equals(dateCases.equalToMin)
			attest(t.traverse(dateCases.between)).equals(dateCases.between)
			attest(t.traverse(dateCases.equalToMax)).equals(dateCases.equalToMax)
			attest(t.traverse(dateCases.greaterThanMax)?.toString()).snap(
				"must be before 12/31/1969, 7:00:00 PM (was 12/31/1969, 7:00:00 PM)"
			)
		})

		it("numeric allows", () => {
			const t = rootNode({
				domain: "number",
				min: { rule: 5, exclusive: true },
				max: { rule: 10 }
			})

			attest(t.allows(numericCases.lessThanMin)).equals(false)
			attest(t.allows(numericCases.equalToExclusiveMin)).equals(false)
			attest(t.allows(numericCases.between)).equals(true)
			attest(t.allows(numericCases.equalToInclusiveMax)).equals(true)
			attest(t.allows(numericCases.greaterThanMax)).equals(false)
		})

		it("length allows", () => {
			const t = rootNode({
				domain: "string",
				minLength: 5,
				maxLength: 10
			})

			attest(t.allows(lengthCases.lessThanMin)).equals(false)
			attest(t.allows(lengthCases.equalToMin)).equals(true)
			attest(t.allows(lengthCases.between)).equals(true)
			attest(t.allows(lengthCases.equalToMax)).equals(true)
			attest(t.allows(lengthCases.greaterThanMax)).equals(false)
		})

		it("date allows", () => {
			const t = rootNode({
				proto: Date,
				after: 5,
				before: 10
			})

			attest(t.allows(dateCases.lessThanMin)).equals(false)
			attest(t.allows(dateCases.equalToMin)).equals(true)
			attest(t.allows(dateCases.between)).equals(true)
			attest(t.allows(dateCases.equalToMax)).equals(true)
			attest(t.allows(dateCases.greaterThanMax)).equals(false)
		})
	})

	describe("intersections", () => {
		describe("unit range reduces", () => {
			it("numeric unit range reduces", () => {
				const l = rootNode({
					domain: "number",
					min: { rule: 6 }
				})
				const r = rootNode({
					domain: "number",
					max: { rule: 6 }
				})
				const expected = rootNode({
					unit: 6
				})

				attest(l.and(r).json).equals(expected.json)
				attest(r.and(l).json).equals(expected.json)
			})

			it("length unit range reduces", () => {
				const l = rootNode({
					domain: "string",
					minLength: 6
				})
				const r = rootNode({
					domain: "string",
					maxLength: 6
				})
				const expected = rootNode({
					domain: "string",
					exactLength: 6
				})

				attest(l.and(r).json).equals(expected.json)
				attest(r.and(l).json).equals(expected.json)
			})

			it("date unit range reduces", () => {
				const l = rootNode({
					proto: Date,
					after: 6
				})
				const r = rootNode({
					proto: Date,
					before: 6
				})
				const expected = rootNode({
					unit: new Date(6)
				})

				attest(l.and(r).json).equals(expected.json)
				attest(r.and(l).json).equals(expected.json)
			})
		})

		it("numeric non-overlapping exclusive", () => {
			const l = rootNode({
				domain: "number",
				min: { rule: 3 }
			})
			const r = rootNode({
				domain: "number",
				max: { rule: 3, exclusive: true }
			})
			attest(l.intersect(r)).instanceOf(Disjoint)
			attest(r.intersect(l)).instanceOf(Disjoint)
		})

		describe("non-overlapping limits", () => {
			it("numeric non-overlapping limits", () => {
				const l = rootNode({
					domain: "number",
					min: 3
				})
				const r = rootNode({
					domain: "number",
					max: 1
				})
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})

			it("length non-overlapping limits", () => {
				const l = rootNode({
					domain: "string",
					minLength: 3
				})
				const r = rootNode({
					domain: "string",
					maxLength: 1
				})
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})

			it("date non-overlapping limits", () => {
				const l = rootNode({
					proto: Date,
					after: 3
				})
				const r = rootNode({
					proto: Date,
					before: 1
				})
				attest(l.intersect(r)).instanceOf(Disjoint)
				attest(r.intersect(l)).instanceOf(Disjoint)
			})
		})

		describe("greater min is stricter", () => {
			it("numeric greater min is stricter", () => {
				const lesser = rootNode({
					domain: "number",
					min: 3
				})
				const greater = rootNode({
					domain: "number",
					min: 4
				})
				attest(lesser.and(greater).json).equals(greater.json)
				attest(greater.and(lesser).json).equals(greater.json)
			})

			it("length greater min is stricter", () => {
				const lesser = rootNode({
					domain: "string",
					minLength: 3
				})
				const greater = rootNode({
					domain: "string",
					minLength: 4
				})
				attest(lesser.and(greater).json).equals(greater.json)
				attest(greater.and(lesser).json).equals(greater.json)
			})

			it("date greater min is stricter", () => {
				const lesser = rootNode({
					proto: Date,
					after: 3
				})
				const greater = rootNode({
					proto: Date,
					after: 4
				})
				attest(lesser.and(greater).json).equals(greater.json)
				attest(greater.and(lesser).json).equals(greater.json)
			})
		})

		describe("lesser max is stricter", () => {
			it("numeric lesser max is stricter", () => {
				const lesser = rootNode({
					domain: "number",
					max: 3
				})
				const greater = rootNode({
					domain: "number",
					max: { rule: 4, exclusive: true }
				})
				attest(lesser.and(greater).json).equals(lesser.json)
				attest(greater.and(lesser).json).equals(lesser.json)
			})

			it("length lesser max is stricter", () => {
				const lesser = rootNode({
					domain: "string",
					maxLength: 3
				})
				const greater = rootNode({
					domain: "string",
					maxLength: 4
				})
				attest(lesser.and(greater).json).equals(lesser.json)
				attest(greater.and(lesser).json).equals(lesser.json)
			})

			it("date lesser max is stricter", () => {
				const lesser = rootNode({
					proto: Date,
					before: 3
				})
				const greater = rootNode({
					proto: Date,
					before: 4
				})
				attest(lesser.and(greater).json).equals(lesser.json)
				attest(greater.and(lesser).json).equals(lesser.json)
			})
		})

		it("exclusive wins if limits equal", () => {
			const exclusive = rootNode({
				domain: "number",
				max: { rule: 3, exclusive: true }
			})
			const inclusive = rootNode({
				domain: "number",
				max: 3
			})
			attest(exclusive.and(inclusive).json).equals(exclusive.json)
			attest(inclusive.and(exclusive).json).equals(exclusive.json)
		})
	})
})
