import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	it("resolves from type", () => {
		const disappointingGift = type({
			label: "string",
			"box?": "this"
		})

		const id = disappointingGift.internal.id

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

	it("equivalent to recursive scoped type", () => {
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
		const types = scope({
			initial: {
				initial: "initial"
			},
			reference: {
				reference: "initial"
			}
		}).export()
		attest(reference.json).equals(types.reference.json)
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

	it("root expression", () => {
		const t = type({ a: "string" }, "|", { b: "this" })
		attest(t.infer).type.toString.snap(
			"{ a: string; } | { b: { a: string; } | any; }"
		)
		attest(t({ a: "foo" })).snap({ a: "foo" })
		attest(t({ a: "foo", b: { a: "bar" } })).snap({ a: "foo", b: { a: "bar" } })
		attest(t({ a: "foo", b: { a: "bar", b: {} } }).toString()).snap(
			"b.b.a must be a string (was missing)"
		)
	})

	it("tuple expression", () => {
		const t = type([{ a: "string" }, "|", { b: "this" }])
		attest(t.infer).type.toString.snap(
			"{ a: string; } | { b: { a: string; } | any; }"
		)
		const types = scope({
			a: {
				a: "string"
			},
			b: {
				b: "expected"
			},
			expected: "a|b"
		}).export()
		attest(t.json).equals(types.expected.json)
	})
})
