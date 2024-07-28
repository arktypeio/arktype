import { attest, contextualize } from "@ark/attest"
import type { Constructor } from "@ark/util"
import { type, type Data } from "arktype"

contextualize(() => {
	it("primitive", () => {
		attest<Data<"foo">>(type("string" as type.cast<"foo">))
	})

	it("object", () => {
		// definitions that are cast can't be validated
		attest<Data<{ a: "foo" }>>(type({ a: "string" } as type.cast<{ a: "foo" }>))
	})

	it("primitive to object", () => {
		attest<Data<{ a: "foo" }>>(type("string" as type.cast<{ a: "foo" }>))
	})

	it("object to primitive", () => {
		attest<Data<"foo">>(type({ a: "string" } as type.cast<"foo">))
	})

	it("infer function", () => {
		type F = () => boolean
		const constructable = type({} as type.cast<F>)
		attest<Data<F>>(constructable)
		attest<F>(constructable.infer)
		attest<F>(constructable.in.infer)
	})

	it("infer constructable", () => {
		const constructable = type({} as type.cast<Constructor>)
		attest<Data<Constructor>>(constructable)
		attest<Constructor>(constructable.infer)
		attest<Constructor>(constructable.in.infer)
	})
})
