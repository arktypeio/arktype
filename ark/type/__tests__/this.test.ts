import { attest } from "@arktype/attest"
import { scope, type } from "arktype"

import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"

describe("this reference", () => {
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
	})

	it("doesn't change when rereferenced", () => {
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
		attest(reference.condition).equals(types.reference.condition)
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
})
