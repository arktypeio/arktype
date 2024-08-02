import { attest, contextualize } from "@ark/attest"
import type { Constructor } from "@ark/util"
import { type, type Type } from "arktype"

contextualize(() => {
	describe("type.cast", () => {
		it("primitive", () => {
			attest<"foo">(type("string" as type.cast<"foo">).t)
		})

		it("object", () => {
			// definitions that are cast can't be validated
			attest<{ a: "foo" }>(type({ a: "string" } as type.cast<{ a: "foo" }>).t)
		})

		it("primitive to object", () => {
			attest<{ a: "foo" }>(type("string" as type.cast<{ a: "foo" }>).t)
		})

		it("object to primitive", () => {
			attest<"foo">(type({ a: "string" } as type.cast<"foo">).t)
		})

		it("infer function", () => {
			type F = () => boolean
			const constructable = type({} as type.cast<F>)
			attest<F>(constructable.t)
			attest<F>(constructable.infer)
			attest<F>(constructable.in.infer)
		})

		it("infer constructable", () => {
			const constructable = type({} as type.cast<Constructor>)
			attest<Constructor>(constructable.t)
			attest<Constructor>(constructable.infer)
			attest<Constructor>(constructable.in.infer)
		})
	})

	describe("as", () => {
		it("valid cast", () => {
			const from = type("/^foo.*$/")
			const t = from.as<`foo${string}`>()

			attest<`foo${string}`>(t.t)
			attest(t === from).equals(true)
		})

		it("cast to any", () => {
			const t = type("unknown").as<any>()
			attest<any>(t.t)
		})

		it("cast to never", () => {
			const t = type("unknown").as<never>()
			attest<never>(t.t)
		})

		it("missing type param", () => {
			// @ts-expect-error
			attest(() => type("string").as()).type.errors.snap(
				"Expected 1 arguments, but got 0."
			)
		})

		it("missing type param with arg", () => {
			// @ts-expect-error
			attest(() => type("string").as("foo")).type.errors(
				"as requires an explicit type parameter like myType.as<t>() "
			)
		})
	})
})
