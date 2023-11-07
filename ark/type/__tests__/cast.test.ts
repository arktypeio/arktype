import { attest } from "@arktype/attest"
import type { Constructor } from "@arktype/util"
import { type } from "arktype"
import type { Type } from "arktype"
import { suite, test } from "mocha"

suite("cast", () => {
	test("primitive", () => {
		attest<Type<"foo">>(type("string" as type.cast<"foo">))
	})
	test("object", () => {
		// definitions that are cast can't be validated
		attest<Type<{ a: "foo" }>>(type({ a: "string" } as type.cast<{ a: "foo" }>))
	})
	test("primitive to object", () => {
		attest<Type<{ a: "foo" }>>(type("string" as type.cast<{ a: "foo" }>))
	})
	test("object to primitive", () => {
		attest<Type<"foo">>(type({ a: "string" } as type.cast<"foo">))
	})
	test("infer function", () => {
		type F = () => boolean
		const constructable = type({} as type.cast<F>)
		attest<Type<F>>(constructable)
		attest<F>(constructable.infer)
		attest<F>(constructable.inferIn)
	})
	test("infer constructable", () => {
		const constructable = type({} as type.cast<Constructor>)
		attest<Type<Constructor>>(constructable)
		attest<Constructor>(constructable.infer)
		attest<Constructor>(constructable.inferIn)
	})
})
