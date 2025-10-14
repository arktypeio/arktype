import { attest, contextualize } from "@ark/attest"
import type { Constructor } from "@ark/util"
import { type, type Type } from "arktype"

contextualize(() => {
	describe("type.cast", () => {
		it("primitive", () => {
			const Foo = type("string" as type.cast<"foo">).t
			attest<"foo">(Foo)
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
			const Constructable = type({} as type.cast<F>)
			attest<F>(Constructable.t)
			attest<F>(Constructable.infer)
			attest<F>(Constructable.in.infer)
		})

		it("infer constructable", () => {
			const Constructable = type({} as type.cast<Constructor>)
			attest<Constructor>(Constructable.t)
			attest<Constructor>(Constructable.infer)
			attest<Constructor>(Constructable.in.infer)
		})

		it("undefined", () => {
			const Foo = type("string" as type.cast<"foo">).t
			attest<"foo">(Foo)
		})
	})

	describe("as", () => {
		it("valid cast", () => {
			const From = type("/^foo.*$/")
			const T = From.as<`foo${string}`>()

			attest<`foo${string}`>(T.t)
			attest(T === From).equals(true)
		})

		it("cast to any", () => {
			const T = type("unknown").as<any>()
			attest<any>(T.t)
		})

		it("cast to never", () => {
			const T = type("unknown").as<never>()
			attest<never>(T.t)
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
				"as requires an explicit type parameter like myType.as<t>()"
			)
		})
	})

	describe("readonly ", () => {
		it("object", () => {
			const From = type({ foo: "string", bar: "number" })
			const T = From.readonly()

			attest<
				Type<{
					readonly foo: string
					readonly bar: number
				}>
			>(T)
			attest(T === From).equals(true)
		})

		it("array", () => {
			const From = type("string").array()
			const T = From.readonly()

			attest<Type<readonly string[]>>(T)
			attest(T === From).equals(true)
		})
	})
})
