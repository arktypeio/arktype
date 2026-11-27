import { attest, contextualize } from "@ark/attest"
import {
	Disjoint,
	boundKindPairsByLower,
	rootSchema,
	schemaScope,
	writeInvalidBoundUnitMessage,
	writeInvalidLengthBoundMessage,
	writeInvalidRangeRuleMessage,
	type ArkErrors
} from "@ark/schema"
import {
	entriesOf,
	flatMorph,
	printable,
	writeInvalidDateMessage
} from "@ark/util"

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
			"must be more than 5"
		)
		attest(T.traverse(numericCases.equalToExclusiveMin)?.toString()).snap(
			"must be more than 5"
		)
		attest(T.traverse(numericCases.between)).equals(numericCases.between)
		attest(T.traverse(numericCases.equalToInclusiveMax)).equals(
			numericCases.equalToInclusiveMax
		)
		attest(T.traverse(numericCases.greaterThanMax)?.toString()).snap(
			"must be at most 10"
		)
	})

	it("length apply", () => {
		const T = rootSchema({
			domain: "string",
			minLength: { rule: 5, exclusive: true },
			maxLength: { rule: 10 }
		})

		attest(T.traverse(lengthCases.lessThanMin)?.toString()).snap(
			"must be at least 6 characters"
		)
		attest(T.traverse(lengthCases.equalToExclusiveMin)?.toString()).snap(
			"must be at least 6 characters"
		)
		attest(T.traverse(lengthCases.between)).equals(lengthCases.between)
		attest(T.traverse(lengthCases.equalToInclusiveMax)).equals(
			lengthCases.equalToInclusiveMax
		)
		attest(T.traverse(lengthCases.greaterThanMax)?.toString()).snap(
			"must be at most 10 characters"
		)
	})

	it("date apply", () => {
		const T = rootSchema({
			proto: Date,
			after: { rule: 5, exclusive: true },
			before: { rule: 10 }
		})

		attest(T.traverse(dateCases.lessThanMin)?.toString()).snap(
			"must be January 1, 1970, 12:00:00.006 AM UTC or later"
		)
		attest(T.traverse(dateCases.equalToExclusiveMin)?.toString()).snap(
			"must be January 1, 1970, 12:00:00.006 AM UTC or later"
		)
		attest(T.traverse(dateCases.between)).equals(dateCases.between)
		attest(T.traverse(dateCases.equalToInclusiveMax)).equals(
			dateCases.equalToInclusiveMax
		)
		attest(T.traverse(dateCases.greaterThanMax)?.toString()).snap(
			"must be January 1, 1970, 12:00:00.010 AM UTC or earlier"
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

	it("-0 rule", () => {
		const T = rootSchema({
			domain: "number",
			min: { rule: -0, exclusive: true }
		})
		const error = (T.traverse(-1) as ArkErrors).issues[0]
		attest(error.code === "min" && Object.is(error.rule, -0)).equals(true)
	})

	it("string date limits", () => {
		const T = rootSchema({
			proto: Date,
			after: "2025-01-01",
			before: { rule: "2026-01-01T00:00-05:00", exclusive: true }
		})
		attest(T.json).snap({
			proto: "Date",
			after: "2025-01-01T00:00:00.000Z",
			before: "2026-01-01T04:59:59.999Z"
		})
		attest(() => rootSchema({ proto: Date, after: "01/02/2025" })).throws(
			writeInvalidDateMessage("01/02/2025")
		)
		attest(() =>
			rootSchema({
				proto: Date,
				before: { rule: "2025-01-01T00:00", exclusive: true }
			})
		).throws(writeInvalidDateMessage("2025-01-01T00:00"))
	})

	it("minLength 0 reduces to unconstrained", () => {
		const T = rootSchema({ domain: "string", minLength: 0 })
		attest(T.expression).snap("string")
	})

	it("cross-kind length reductions like notEqualLength: 0 and maxLength: 0", () => {
		const NonEmptyString = rootSchema({ domain: "string", notEqualLength: 0 })
		attest(NonEmptyString.expression).snap("string >= 1")
		attest(NonEmptyString.allows("")).equals(false)
		attest(NonEmptyString.allows("a")).equals(true)

		const NonEmptyArray = rootSchema({ proto: Array, notEqualLength: 0 })
		attest(NonEmptyArray.expression).snap("Array >= 1")
		attest(NonEmptyArray.allows([])).equals(false)
		attest(NonEmptyArray.allows([1])).equals(true)

		const MultiExcluded = rootSchema({
			domain: "string",
			notEqualLength: [0, 3]
		})
		attest(MultiExcluded.expression).snap("string >= 1 & string != 3")
		attest(MultiExcluded.allows("")).equals(false)
		attest(MultiExcluded.allows("a")).equals(true)
		attest(MultiExcluded.allows("abc")).equals(false)

		const CombinedMin = rootSchema({
			domain: "string",
			minLength: 2,
			notEqualLength: 0
		})
		attest(CombinedMin.expression).snap("string >= 2")

		const EmptyString = rootSchema({ domain: "string", maxLength: 0 })
		attest(EmptyString.expression).snap("string == 0")

		attest(() =>
			rootSchema({ domain: "string", maxLength: 0, exactLength: 5 })
		).throws(
			"Intersection at length of 5 and 0 results in an unsatisfiable type"
		)
	})

	for (const [min, max] of entriesOf(boundKindPairsByLower)) {
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

			it("unit range reduces when narrowing an existing range", () => {
				const Range = rootSchema({
					...basis,
					[min]: { rule: 5 },
					[max]: { rule: 6 }
				} as never)
				const Min = rootSchema({ ...basis, [min]: { rule: 6 } } as never)
				const Max = rootSchema({ ...basis, [max]: { rule: 5 } } as never)
				const unitOf = (rule: number) =>
					min === "min" ? rootSchema({ unit: rule })
					: min === "minLength" ?
						rootSchema({ ...basis, exactLength: rule } as never)
					:	rootSchema({ unit: new Date(rule) })

				attest(Range.and(Min).json).equals(unitOf(6).json)
				attest(Min.and(Range).json).equals(unitOf(6).json)
				attest(Range.and(Max).json).equals(unitOf(5).json)
				attest(Max.and(Range).json).equals(unitOf(5).json)
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
	}

	it("rejects NaN numeric bounds and invalid Date notEqual", () => {
		attest(() => rootSchema({ domain: "number", min: Number.NaN })).throws(
			writeInvalidRangeRuleMessage("min", Number.NaN)
		)
		attest(() => rootSchema({ domain: "number", max: Number.NaN })).throws(
			writeInvalidRangeRuleMessage("max", Number.NaN)
		)
		attest(() => rootSchema({ domain: "number", notEqual: Number.NaN })).throws(
			"notEqual bound must be a number or Date (was NaN)"
		)
		const invalidDate = new Date(Number.NaN)
		attest(() => rootSchema({ proto: Date, notEqual: invalidDate })).throws(
			`notEqual bound must be a number or Date (was ${printable(invalidDate)})`
		)
	})

	it("rejects non-Date values like null and booleans for before and after", () => {
		for (const bad of [null, true, false, undefined, Number.NaN]) {
			attest(() =>
				rootSchema({ domain: "object", after: bad as never })
			).throws(writeInvalidRangeRuleMessage("after", bad))
			attest(() =>
				rootSchema({ proto: Date, after: { rule: bad as never } })
			).throws(writeInvalidRangeRuleMessage("after", bad))
			attest(() => rootSchema({ proto: Date, before: bad as never })).throws(
				writeInvalidRangeRuleMessage("before", bad)
			)
		}
	})

	describe("bound units", () => {
		it("derives character and item units from string and Array bases", () => {
			attest(
				rootSchema({ domain: "string", minLength: 2 }).traverse("a")?.toString()
			).snap("must be at least 2 characters")
			attest(
				rootSchema({ domain: "string", maxLength: 1 })
					.traverse("ab")
					?.toString()
			).snap("must be at most 1 character")
			attest(
				rootSchema({ domain: "string", exactLength: 1 })
					.traverse("ab")
					?.toString()
			).snap("must be exactly 1 character")
			attest(
				rootSchema({ domain: "string", notEqualLength: 1 })
					.traverse("a")
					?.toString()
			).snap("must be other than 1 character")

			attest(
				rootSchema({ proto: Array, minLength: 2 }).traverse(["a"])?.toString()
			).snap("must be at least 2 items")
			attest(
				rootSchema({ proto: Array, maxLength: 1 })
					.traverse(["a", "b"])
					?.toString()
			).snap("must be at most 1 item")
			attest(
				rootSchema({ proto: Array, exactLength: 1 })
					.traverse(["a", "b"])
					?.toString()
			).snap("must be exactly 1 item")
			attest(
				rootSchema({ proto: Array, notEqualLength: 1 })
					.traverse(["a"])
					?.toString()
			).snap("must be other than 1 item")
		})

		it("falls back to length when no basis is attached and gains the unit on intersection", () => {
			const BareMin = rootSchema({ minLength: 6 })
			attest(BareMin.description).snap("at least length 6")
			attest(BareMin.traverse("abc")?.toString()).snap(
				"must be at least length 6"
			)
			attest(BareMin.and("string").traverse("abc")?.toString()).snap(
				"must be at least 6 characters"
			)
			attest(BareMin.and(Array).traverse(["a"])?.toString()).snap(
				"must be at least 6 items"
			)
		})

		it("supports explicit custom units without affecting json or equality", () => {
			const Runes = rootSchema({
				domain: "string",
				minLength: { rule: 3, unit: "rune" },
				maxLength: { rule: 5, unit: "rune" }
			})
			attest(Runes.json).snap({ domain: "string", minLength: 3, maxLength: 5 })
			attest(
				Runes.equals(
					rootSchema({ domain: "string", minLength: 3, maxLength: 5 })
				)
			).equals(true)
			attest(Runes.traverse("ab")?.toString()).snap("must be at least 3 runes")
			attest(Runes.traverse("abcdef")?.toString()).snap(
				"must be at most 5 runes"
			)

			const Entries = rootSchema({
				proto: Array,
				maxLength: { rule: 1, unit: { singular: "entry", plural: "entries" } }
			})
			attest(Entries.traverse(["a", "b"])?.toString()).snap(
				"must be at most 1 entry"
			)

			const Seconds = rootSchema({
				domain: "number",
				min: { rule: 0, exclusive: true, unit: "second" },
				max: { rule: 1, unit: "second" },
				notEqual: { rule: 0.5, unit: "second" }
			})
			attest(Seconds.traverse(0)?.toString()).snap(
				"must be more than 0 seconds"
			)
			attest(Seconds.traverse(2)?.toString()).snap("must be at most 1 second")
			attest(Seconds.traverse(0.5)?.toString()).snap(
				"must be other than 0.5 seconds"
			)
		})

		it("preserves explicit custom units through range reductions and intersections", () => {
			const Exact = rootSchema({
				domain: "string",
				minLength: { rule: 3, unit: "rune" }
			}).and({
				domain: "string",
				maxLength: { rule: 3, unit: "rune" }
			})
			attest(Exact.traverse("ab")?.toString()).snap("must be exactly 3 runes")

			const ExactMixed = rootSchema({
				domain: "string",
				minLength: { rule: 3, unit: "rune" }
			}).and({
				domain: "string",
				maxLength: 3
			})
			attest(ExactMixed.traverse("ab")?.toString()).snap(
				"must be exactly 3 runes"
			)

			const SameBound = rootSchema({
				domain: "string",
				minLength: 3
			}).and({
				domain: "string",
				minLength: { rule: 3, unit: "rune" }
			})
			attest(SameBound.traverse("ab")?.toString()).snap(
				"must be at least 3 runes"
			)

			const Stricter = rootSchema({
				domain: "string",
				minLength: { rule: 3, unit: "rune" }
			}).and({
				domain: "string",
				minLength: 5
			})
			attest(Stricter.traverse("abcd")?.toString()).snap(
				"must be at least 5 runes"
			)

			const StricterLeft = rootSchema({
				domain: "string",
				minLength: 5
			}).and({
				domain: "string",
				minLength: { rule: 3, unit: "rune" }
			})
			attest(StricterLeft.traverse("abcd")?.toString()).snap(
				"must be at least 5 runes"
			)

			const ExactWithMin = rootSchema({
				domain: "string",
				exactLength: 3
			}).and({
				domain: "string",
				minLength: { rule: 2, unit: "rune" }
			})
			attest(ExactWithMin.traverse("ab")?.toString()).snap(
				"must be exactly 3 runes"
			)

			const ExactWithMax = rootSchema({
				domain: "string",
				exactLength: { rule: 3, unit: "rune" }
			}).and({
				domain: "string",
				maxLength: 5
			})
			attest(ExactWithMax.traverse("ab")?.toString()).snap(
				"must be exactly 3 runes"
			)

			const ExactSame = rootSchema({
				domain: "string",
				exactLength: 3
			}).and({
				domain: "string",
				exactLength: { rule: 3, unit: "rune" }
			})
			attest(ExactSame.traverse("ab")?.toString()).snap(
				"must be exactly 3 runes"
			)

			const NotEqualLenSame = rootSchema({
				domain: "string",
				notEqualLength: 3
			}).and({
				domain: "string",
				notEqualLength: { rule: 3, unit: "rune" }
			})
			attest(NotEqualLenSame.traverse("abc")?.toString()).snap(
				"must be other than 3 runes"
			)

			const NotEqualSame = rootSchema({
				domain: "number",
				notEqual: 5
			}).and({
				domain: "number",
				notEqual: { rule: 5, unit: "second" }
			})
			attest(NotEqualSame.traverse(5)?.toString()).snap(
				"must be other than 5 seconds"
			)

			const Excluded = rootSchema({
				domain: "string",
				minLength: { rule: 3, unit: "rune" }
			}).and({
				domain: "string",
				notEqualLength: 3
			})
			attest(Excluded.traverse("abc")?.toString()).snap(
				"must be at least 4 runes"
			)

			const ExcludedRightUnit = rootSchema({
				domain: "string",
				minLength: 3
			}).and({
				domain: "string",
				notEqualLength: { rule: 3, unit: "rune" }
			})
			attest(ExcludedRightUnit.traverse("abc")?.toString()).snap(
				"must be at least 4 runes"
			)

			const NonZeroBytes = rootSchema({
				domain: "string",
				notEqualLength: { rule: 0, unit: "byte" }
			})
			attest(NonZeroBytes.traverse("")?.toString()).snap(
				"must be at least 1 byte"
			)
		})

		it("respects explicit custom units for minLength 1 and exactLength 0", () => {
			attest(
				rootSchema({ domain: "string", minLength: 1 }).traverse("")?.toString()
			).snap("must be non-empty")
			attest(
				rootSchema({ proto: Array, minLength: 1 }).traverse([])?.toString()
			).snap("must be non-empty")
			attest(rootSchema({ minLength: 1 }).traverse("")?.toString()).snap(
				"must be non-empty"
			)
			attest(
				rootSchema({
					domain: "string",
					minLength: { rule: 1, unit: "byte" }
				})
					.traverse("")
					?.toString()
			).snap("must be at least 1 byte")

			attest(
				rootSchema({ domain: "string", exactLength: 0 })
					.traverse("a")
					?.toString()
			).snap("must be empty")
			attest(
				rootSchema({ proto: Array, exactLength: 0 }).traverse(["a"])?.toString()
			).snap("must be empty")
			attest(rootSchema({ exactLength: 0 }).traverse("a")?.toString()).snap(
				"must be empty"
			)
			attest(
				rootSchema({
					domain: "string",
					exactLength: { rule: 0, unit: "byte" }
				})
					.traverse("a")
					?.toString()
			).snap("must be exactly 0 bytes")
			attest(
				rootSchema({
					domain: "string",
					maxLength: { rule: 0, unit: "byte" }
				})
					.traverse("a")
					?.toString()
			).snap("must be exactly 0 bytes")
		})

		it("preserves matching custom units and avoids merging conflicting ones in unions", () => {
			const SplitSeconds = rootSchema([
				{ domain: "number", max: { rule: 5, exclusive: true, unit: "second" } },
				{ domain: "number", min: { rule: 5, exclusive: true, unit: "second" } }
			])
			attest(SplitSeconds.expression).snap("number != 5")
			attest(SplitSeconds.traverse(5)?.toString()).snap(
				"must be other than 5 seconds"
			)

			const ExtendedSeconds = rootSchema([
				{ domain: "number", max: { rule: 5, exclusive: true, unit: "second" } },
				{ unit: 5 }
			])
			attest(ExtendedSeconds.expression).snap("number <= 5")
			attest(ExtendedSeconds.traverse(6)?.toString()).snap(
				"must be at most 5 seconds"
			)

			const AdjacentRunes = rootSchema([
				{ domain: "string", exactLength: { rule: 3, unit: "rune" } },
				{ domain: "string", exactLength: { rule: 4, unit: "rune" } }
			])
			attest(AdjacentRunes.expression).snap("3 <= string <= 4")
			attest(AdjacentRunes.traverse("ab")?.toString()).snap(
				"must be at least 3 runes"
			)
			attest(AdjacentRunes.traverse("abcde")?.toString()).snap(
				"must be at most 4 runes"
			)

			const Conflicting = rootSchema([
				{ domain: "number", max: { rule: 5, exclusive: true, unit: "second" } },
				{ domain: "number", min: { rule: 5, exclusive: true, unit: "ms" } }
			])
			attest(Conflicting.branches.length).equals(2)
			attest(Conflicting.traverse(5)?.toString()).snap(
				"must be less than 5 seconds or more than 5 mss"
			)

			const EqualCustomUnion = rootSchema([
				{ domain: "string", minLength: 3 },
				{ domain: "string", minLength: { rule: 3, unit: "rune" } }
			])
			attest(EqualCustomUnion.traverse("ab")?.toString()).snap(
				"must be at least 3 runes"
			)

			const ExcludedBranch = rootSchema([
				{ domain: "string", minLength: { rule: 3, unit: "rune" } },
				"number"
			]).exclude("number")
			attest(ExcludedBranch.traverse("ab")?.toString()).snap(
				"must be at least 3 runes"
			)

			const SplitExcludedRange = rootSchema({
				domain: "number",
				min: { rule: 0, unit: "second" },
				max: { rule: 10, unit: "second" }
			}).exclude({ domain: "number", min: 5 })
			attest(SplitExcludedRange.traverse(5)?.toString()).snap(
				"must be less than 5 seconds"
			)
		})

		it("normalizes units on Date notEqual and direct $.node calls", () => {
			const DateNotEq = rootSchema({
				proto: Date,
				notEqual: { rule: "2020-01-01", unit: "day" }
			})
			attest(DateNotEq.allows(new Date("2020-01-01"))).equals(false)
			attest(DateNotEq.allows(new Date("2020-01-02"))).equals(true)
			attest(() =>
				rootSchema({
					proto: Date,
					notEqual: { rule: "2020-01-01", unit: "" as never }
				})
			).throws(writeInvalidBoundUnitMessage(""))

			const $ = schemaScope({})
			const Direct = $.node("minLength", {
				rule: 3,
				unit: "rune" as never
			}).assertIs("minLength")
			attest(Direct.unit).equals({ singular: "rune", plural: "runes" })
			attest(Direct.description).snap("at least 3 runes")
			attest(() => $.node("minLength", { rule: 3, unit: "" as never })).throws(
				writeInvalidBoundUnitMessage("")
			)
		})

		it("rejects invalid bound units", () => {
			for (const bad of ["", null, 5, { singular: "", plural: "xs" }]) {
				attest(() =>
					rootSchema({
						domain: "string",
						minLength: { rule: 2, unit: bad as never }
					})
				).throws(writeInvalidBoundUnitMessage(bad))
			}
		})
	})
})
