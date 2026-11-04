import { attest, contextualize } from "@ark/attest"
import { type Type, type } from "arktype"
import { runInNewContext } from "node:vm"

// nodes are compared without writing their JSON where that's decided, so each
// shortcut has to agree with the JSON it stands in for
const comparesAsJson = (l: Type, r: Type, equal: boolean) => {
	attest(
		JSON.stringify(l.internal.innerJson) ===
			JSON.stringify(r.internal.innerJson)
	).equals(equal)
	attest(l.internal.equals(r.internal)).equals(equal)
	attest(r.internal.equals(l.internal)).equals(equal)
}

contextualize(() => {
	it("units of different domains written alike", () => {
		comparesAsJson(type("1"), type("'1'"), false)
	})

	it("Date units by their time", () => {
		const unit = (date: Date) => type.schema({ unit: date }) as never as Type
		comparesAsJson(unit(new Date(0)), unit(new Date(0)), true)
		comparesAsJson(unit(new Date(0)), unit(new Date(1)), false)
	})

	it("a domain by its number options", () => {
		const nan = type.schema({ domain: "number", numberAllowsNaN: true })
		const infinity = type.schema({
			domain: "number",
			numberAllowsInfinity: true
		})
		comparesAsJson(nan as never, infinity as never, false)
		comparesAsJson(nan as never, type.number, false)
	})

	it("a proto by its constructor and whether invalid Dates pass", () => {
		const otherDate = runInNewContext("Date") as DateConstructor
		comparesAsJson(
			type.schema({ proto: otherDate }) as never,
			type.schema({ proto: Date }) as never,
			false
		)
		comparesAsJson(
			type.schema({ proto: Date, dateAllowsInvalid: true }) as never,
			type.schema({ proto: Date }) as never,
			false
		)
	})

	it("props by key, optionality and default", () => {
		comparesAsJson(type({ a: "string" }), type({ b: "string" }), false)
		comparesAsJson(type({ a: "string" }), type({ "a?": "string" }), false)
		comparesAsJson(type({ "a?": "string" }), type({ a: "string = 'x'" }), false)
		comparesAsJson(
			type({ a: "string = 'x'" }),
			type({ a: "string = 'y'" }),
			false
		)
	})

	it("ranges by their rule and whether it's exclusive", () => {
		comparesAsJson(type("number >= 1"), type("number >= 1"), true)
		comparesAsJson(type("number >= 1"), type("number >= 2"), false)
		comparesAsJson(type("number >= 1"), type("number > 1"), false)
		comparesAsJson(type("number >= 1"), type("number <= 1"), false)
		comparesAsJson(type("1 <= number <= 2"), type("number >= 1"), false)
		comparesAsJson(type("1 <= number <= 2"), type("1 <= number <= 3"), false)
	})

	it("ranges whose rule isn't a finite number", () => {
		comparesAsJson(
			type.number.atLeast(Number.POSITIVE_INFINITY),
			type.number.atLeast(Number.NEGATIVE_INFINITY),
			false
		)
		comparesAsJson(
			type("Date >= 0"),
			type("Date >= d'1970-01-01T00:00:00.000Z'"),
			true
		)
		comparesAsJson(type("Date >= 0"), type("Date >= 1"), false)
	})

	it("structures alike but for what they do with undeclared keys", () => {
		comparesAsJson(
			type({ a: "string" }),
			type({ a: "string" }).onUndeclaredKey("reject"),
			false
		)
	})

	it("kinds written alike aren't equal", () => {
		attest(type({}).internal.innerJson).equals(
			type("object").internal.innerJson
		)
		attest(type({}).equals(type("object"))).equals(false)
	})

	it("sequences differing only in their minimum variadic length", () => {
		const sequence = (minVariadicLength?: number) =>
			type.schema({
				proto: Array,
				sequence:
					minVariadicLength ?
						{ variadic: { domain: "string" }, minVariadicLength }
					:	{ variadic: { domain: "string" } }
			}) as never as Type
		comparesAsJson(sequence(), sequence(1), false)
		comparesAsJson(sequence(1), sequence(2), false)
	})
})
