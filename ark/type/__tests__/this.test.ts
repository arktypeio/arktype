import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("resolves from type", () => {
		const disappointingGift = type({
			label: "string",
			"box?": "this"
		})

		type ExpectedDisappointingGift = {
			label: string
			box?: ExpectedDisappointingGift
		}
		attest<ExpectedDisappointingGift>(disappointingGift.infer)

		attest(disappointingGift({ label: "foo" })).snap({ label: "foo" })
		attest(disappointingGift({ label: "foo", box: { label: "bar" } })).snap({
			label: "foo",
			box: { label: "bar" }
		})
		attest(
			disappointingGift({
				label: "foo",
				box: { label: "bar", box: {} }
			}).toString()
		).snap("box.box.label must be a string (was missing)")
	})

	it("at nested path", () => {
		const t = type({ foo: { bar: "this" } })

		attest(t).type.toString.snap("Type<{ foo: { bar: cyclic } }, {}>")

		const validData = { foo: { bar: {} } } as typeof t.infer
		validData.foo.bar = validData

		attest(t(validData)).equals(validData)

		const invalidData = { foo: { bar: {} as any } }
		invalidData.foo.bar = invalidData.foo
		attest(t(invalidData).toString()).snap(
			"foo.bar.foo must be an object (was missing)"
		)
	})

	it("this preserved when referencing at path", () => {
		const initial = type({
			initial: "this"
		})

		const reference = type({
			reference: initial
		})
		type Initial = {
			initial: Initial
		}
		type Expected = {
			reference: Initial
		}

		attest<Expected>(reference.infer)

		const initialData = {} as typeof initial.infer
		initialData.initial = initialData

		const referenceData = { reference: initialData }

		attest(initial(initialData)).equals(initialData)
		attest(reference(referenceData)).equals(referenceData)
		attest(reference({ reference: {} }).toString()).snap(
			"reference.initial must be an object (was missing)"
		)
	})

	it("unresolvable in scope", () => {
		attest(() =>
			scope({
				disappointingGift: {
					label: "string",
					// @ts-expect-error
					"box?": "this"
				}
			}).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("this"))
	})

	it("tuple expression", () => {
		const t = type([{ a: "string" }, "|", { b: "this" }])
		attest(t.infer).type.toString.snap(
			"{ a: string } | { b: { a: string } | cyclic }"
		)
		attest(t({ a: "foo" })).snap({ a: "foo" })
		attest(t({ b: { a: "bar" } })).snap({ b: { a: "bar" } })
		attest(t({ b: { b: {} } }).toString()).snap(
			"a must be a string (was missing), b.a must be a string (was missing) or b.b must be b.b.a must be a string (was missing) or b.b.b must be an object (was missing) (was {})"
		)
	})

	it("root expression", () => {
		const t = type({ a: "string" }, "|", { b: "this" })
		attest(t.infer).type.toString.snap(
			"{ a: string } | { b: { a: string } | cyclic }"
		)
		attest(t({ a: "foo" })).snap({ a: "foo" })
		attest(t({ b: { a: "bar" } })).snap({ b: { a: "bar" } })
		attest(t({ b: { b: {} } }).toString()).snap(
			"a must be a string (was missing), b.a must be a string (was missing) or b.b must be b.b.a must be a string (was missing) or b.b.b must be an object (was missing) (was {})"
		)
	})
})
