import { attest, contextualize } from "@ark/attest"
import { $ark } from "@ark/schema"
import { writeMissingInverseMessage } from "@ark/schema/codecs"
import {
	writeIndiscriminableMorphMessage,
	writeMorphIntersectionMessage
} from "arksets/internal"
import { scope, type, type Type } from "arktype"
import { codec } from "arktype/codecs"
import type { To } from "arktype/internal/attributes.ts"

contextualize(() => {
	const EpochMs = codec("number.integer", "Date", {
		decode: n => new Date(n),
		encode: d => d.getTime()
	})

	it("base", () => {
		attest<Type<(In: number) => To<Date>>>(EpochMs)
		attest<Type<(In: Date) => To<number>>>(EpochMs.encode)
		attest(EpochMs(0)).equals(new Date(0))
		attest(EpochMs.encode(new Date(5))).equals(5)
		attest(EpochMs.encode.expression).snap("(In: Date) => To<number % 1>")
	})

	it("validates what it encodes to", () => {
		const Length = codec("string", "number", {
			decode: s => s.length,
			encode: n => n as never
		})
		attest(Length.encode(5).toString()).snap("must be a string (was a number)")
	})

	it("nested", () => {
		const Event = type({ name: "string", at: EpochMs, "end?": EpochMs })
		attest<{ name: string; at: number; end?: number }>(Event.encode.infer)
		attest(Event.encode({ name: "launch", at: new Date(1) })).equals({
			name: "launch",
			at: 1
		})
		attest(
			Event.encode({ name: "launch", at: new Date(1), end: 2 }).toString()
		).snap("end must be a Date (was a number)")
	})

	it("array", () => {
		const T = EpochMs.array()
		attest(T.encode([new Date(1), new Date(2)])).equals([1, 2])
	})

	it("defaulted key is required", () => {
		const T = type({ at: EpochMs.default(0) })
		attest<{ at: Date }>(T.encode.inferIn)
		attest<{ at?: number }>(T.encode.infer)
		attest(T.encode({}).toString()).snap("at must be a Date (was missing)")
	})

	it("defaulted key keeps its declared place", () => {
		const T = type({ b: "string", a: "number = 1" })
		attest(T.encode({}).toString()).snap(`b must be a string (was missing)
a must be a number (was missing)`)
	})

	it("defaulted element is required", () => {
		const T = type([EpochMs, EpochMs.default(0)])
		attest(T.encode.expression).snap(
			"[(In: Date) => To<number % 1>, (In: Date) => To<number % 1>]"
		)
		attest(T.encode([new Date(1), new Date(2)])).equals([1, 2])
	})

	it("union tries branches without morphs first", () => {
		const T = EpochMs.or("Date")
		attest(T.encode.expression).snap("Date | (In: Date) => To<number % 1>")
		attest(T.encode(new Date(1))).equals(new Date(1))
	})

	it("union discriminated by a codec", () => {
		const On = codec("1", "true", { decode: () => true, encode: () => 1 })
		const Off = codec("0", "false", { decode: () => false, encode: () => 0 })
		const T = type({ on: On, id: "string" }).or({ on: Off, reason: "string" })
		attest(T.encode({ on: false, reason: "off" })).equals({
			on: 0,
			reason: "off"
		})
		attest(T.encode({ on: "maybe" }).toString()).snap(
			'on must be boolean (was "maybe")'
		)
	})

	it("cyclic", () => {
		const $ = scope({ Node: { at: EpochMs, "next?": "Node" } }).export()
		attest(
			$.Node.encode({ at: new Date(1), next: { at: new Date(2) } })
		).equals({ at: 1, next: { at: 2 } })
	})

	it("chained codecs", () => {
		const IsoString = codec("string.date.iso", EpochMs, {
			decode: s => new Date(s).getTime(),
			encode: n => new Date(n).toISOString()
		})
		attest<Type<(In: string) => To<Date>>>(IsoString)
		attest(IsoString.encode.in.expression).snap("Date")
		attest(IsoString("1970-01-01T00:00:00.001Z")).equals(new Date(1))
		attest(IsoString.encode(new Date(1))).equals("1970-01-01T00:00:00.001Z")
	})

	it("checks narrowed output", () => {
		const Positive = EpochMs.narrow(d => d.getTime() > 0)
		attest(Positive.encode(new Date(1))).equals(1)
		attest(Positive.encode(new Date(0)).toString()).snap(
			"must be valid according to an anonymous predicate (was an object)"
		)
	})

	it("encode can fail", () => {
		const Natural = codec("string.integer", "bigint", {
			decode: s => BigInt(s),
			encode: (n, ctx) => (n < 0n ? ctx.error("non-negative") : `${n}`)
		})
		attest(type({ n: Natural }).encode({ n: -1n }).toString()).snap(
			"n must be non-negative (was -1n)"
		)
	})

	it("deletes undeclared keys", () => {
		const T = type({ "+": "delete", at: EpochMs })
		attest(T.encode({ at: new Date(1), extra: true })).equals({ at: 1 })
	})

	it("Type without morphs encodes as itself", () => {
		const T = type({ name: "string" })
		attest<{ name: string }>(T.encode.infer)
		attest(T.encode as unknown).is(T)
	})

	it("encoding the encoder decodes", () => {
		attest(EpochMs.encode.encode.expression).equals(EpochMs.expression)
	})

	it("parse keywords encode", () => {
		const T = type({
			date: "string.date.parse",
			iso: "string.date.iso.parse",
			epoch: "string.date.epoch.parse",
			numeric: "string.numeric.parse",
			integer: "string.integer.parse",
			json: "string.json.parse",
			url: "string.url.parse"
		})
		const decoded = {
			date: new Date(1),
			iso: new Date(1),
			epoch: new Date(1),
			numeric: 1.5,
			integer: 1,
			json: { a: 1 },
			url: new URL("https://arktype.io")
		}
		const encoded = T.encode(decoded)
		attest(encoded).snap({
			date: "1970-01-01T00:00:00.001Z",
			iso: "1970-01-01T00:00:00.001Z",
			epoch: "1",
			numeric: "1.5",
			integer: "1",
			json: '{"a":1}',
			url: "https://arktype.io/"
		})
		attest(T(encoded)).equals(decoded)
	})

	it("string.numeric.parse encodes a number String writes with an exponent", () => {
		const T = type("string.numeric.parse")
		attest(T.encode(1e21)).equals("1e+21")
		attest(T(T.encode(5.7e-10))).equals(5.7e-10)
	})

	it("format keywords encode formatted strings", () => {
		const T = type("string.trim")
		attest(T.encode("a")).equals("a")
		attest(T.encode(" a ").toString()).snap('must be trimmed (was " a ")')
		// a multi-line string round-trips
		attest(T.encode(T.assert(" a\nb "))).snap("a\nb")
	})

	it("case keywords encode what they decode to", () => {
		const Cased = type({
			lower: "string.lower",
			upper: "string.upper",
			capitalized: "string.capitalize"
		})
		const inputs = ["", "élan Vital", "1st place, 2nd: Ünder!", "a\nB c"]
		attest(
			inputs.map(s =>
				Cased.encode(Cased.assert({ lower: s, upper: s, capitalized: s }))
			)
		).snap([
			{ lower: "", upper: "", capitalized: "" },
			{ lower: "élan vital", upper: "ÉLAN VITAL", capitalized: "Élan Vital" },
			{
				lower: "1st place, 2nd: ünder!",
				upper: "1ST PLACE, 2ND: ÜNDER!",
				capitalized: "1st place, 2nd: Ünder!"
			},
			{ lower: "a\nb c", upper: "A\nB C", capitalized: "A\nB c" }
		])
	})

	it("missing inverse", () => {
		const T = type({ length: type("string").pipe(s => s.length) })
		attest(() => T.encode).throws(
			writeMissingInverseMessage("(In: string) => Out<unknown>")
		)
	})

	it("codecs sharing a decode function", () => {
		const decode = (s: string) => Number.parseInt(s)
		const Integer = codec("string", "number", { decode, encode: n => `${n}` })
		const Fixed = codec("string", "number", {
			decode,
			encode: n => n.toFixed(1)
		})
		attest(Integer.encode(1)).equals("1")
		attest(Fixed.encode(1)).equals("1.0")
	})

	it("union keeps the inverse of each codec sharing a decode", () => {
		const decode = (v: string | bigint) => Number(v)
		const FromString = codec("string", "number", { decode, encode: String })
		const FromBigint = codec("bigint", "number", { decode, encode: BigInt })
		attest(FromString.or(FromBigint).encode.expression).snap(
			"(In: number) => To<bigint> | (In: number) => To<string>"
		)
	})

	it("codecs sharing a decode with distinct inverses are indeterminate", () => {
		const decode = (s: string) => Number.parseInt(s)
		const Integer = codec("string", "number", { decode, encode: n => `${n}` })
		const Fixed = codec("string", "number", {
			decode,
			encode: n => n.toFixed(1)
		})
		const expression = "(In: string) => To<number>"
		attest(() => Integer.or(Fixed)).throws(
			writeIndiscriminableMorphMessage(expression, expression)
		)
		attest(() => Integer.and(Fixed)).throws(
			writeMorphIntersectionMessage(expression, expression)
		)
	})

	it("encoding requires arktype/codecs", () => {
		const installed = $ark.encode!
		delete $ark.encode
		try {
			attest(() => EpochMs.encode).throws(
				'.encode requires import "arktype/codecs"'
			)
		} finally {
			$ark.encode = installed
		}
	})
})
