import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("resolves from type", () => {
		const DisappointingGift = type({
			label: "string",
			"box?": "this"
		})

		type ExpectedDisappointingGift = {
			label: string
			box?: ExpectedDisappointingGift
		}
		attest<ExpectedDisappointingGift>(DisappointingGift.infer)

		attest(DisappointingGift({ label: "foo" })).snap({ label: "foo" })
		attest(DisappointingGift({ label: "foo", box: { label: "bar" } })).snap({
			label: "foo",
			box: { label: "bar" }
		})
		attest(
			DisappointingGift({
				label: "foo",
				box: { label: "bar", box: {} }
			}).toString()
		).snap("box.box.label must be a string (was missing)")
	})

	it("at nested path", () => {
		const T = type({ foo: { bar: "this" } })

		attest(T).type.toString.snap("Type<{ foo: { bar: cyclic } }, {}>")

		const validData = { foo: { bar: {} } } as typeof T.infer
		validData.foo.bar = validData

		attest(T(validData)).equals(validData)

		const invalidData = { foo: { bar: {} as any } }
		invalidData.foo.bar = invalidData.foo
		attest(T(invalidData).toString()).snap(
			"foo.bar.foo must be an object (was missing)"
		)
	})

	it("this preserved when referencing at path", () => {
		const Initial = type({
			initial: "this"
		})

		const Reference = type({
			reference: Initial
		})
		type Initial = {
			initial: Initial
		}
		type Expected = {
			reference: Initial
		}

		attest<Expected>(Reference.infer)

		const initialData = {} as typeof Initial.infer
		initialData.initial = initialData

		const referenceData = { reference: initialData }

		attest(Initial(initialData)).equals(initialData)
		attest(Reference(referenceData)).equals(referenceData)
		attest(Reference({ reference: {} }).toString()).snap(
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
		const T = type([{ a: "string" }, "|", { b: "this" }])
		attest(T.infer).type.toString.snap(
			"{ a: string } | { b: { a: string } | cyclic }"
		)
		attest(T({ a: "foo" })).snap({ a: "foo" })
		attest(T({ b: { a: "bar" } })).snap({ b: { a: "bar" } })
		attest(T({ b: { b: {} } }).toString()).snap(
			"a must be a string (was missing), b.a must be a string (was missing) or b.b must be b.b.a must be a string (was missing) or b.b.b must be an object (was missing) (was {})"
		)
	})

	it("root expression", () => {
		const T = type({ a: "string" }, "|", { b: "this" })
		attest(T.infer).type.toString.snap(
			"{ a: string } | { b: { a: string } | cyclic }"
		)
		attest(T({ a: "foo" })).snap({ a: "foo" })
		attest(T({ b: { a: "bar" } })).snap({ b: { a: "bar" } })
		attest(T({ b: { b: {} } }).toString()).snap(
			"a must be a string (was missing), b.a must be a string (was missing) or b.b must be b.b.a must be a string (was missing) or b.b.b must be an object (was missing) (was {})"
		)
	})
})
