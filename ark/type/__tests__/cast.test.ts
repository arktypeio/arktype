import { attest, contextualize } from "@arktype/attest"
import type { Constructor } from "@arktype/util"
import { type, type Type } from "arktype"

contextualize(() => {
	it("primitive", () => {
		attest<Type<"foo">>(type("string" as type.cast<"foo">))
	})

	it("object", () => {
		// definitions that are cast can't be validated
		attest<Type<{ a: "foo" }>>(type({ a: "string" } as type.cast<{ a: "foo" }>))
	})

	it("primitive to object", () => {
		attest<Type<{ a: "foo" }>>(type("string" as type.cast<{ a: "foo" }>))
	})

	it("object to primitive", () => {
		attest<Type<"foo">>(type({ a: "string" } as type.cast<"foo">))
	})

	it("infer function", () => {
		type F = () => boolean
		const constructable = type({} as type.cast<F>)
		attest<Type<F>>(constructable)
		attest<F>(constructable.infer)
		attest<F>(constructable.in.infer)
	})

	it("infer constructable", () => {
		const constructable = type({} as type.cast<Constructor>)
		attest<Type<Constructor>>(constructable)
		attest<Constructor>(constructable.infer)
		attest<Constructor>(constructable.in.infer)
	})
})
