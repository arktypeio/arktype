import { attest, contextualize } from "@ark/attest"
import { intrinsic } from "@ark/schema"

contextualize(() => {
	it("traverse always returns ArkErrors", () => {
		const s = intrinsic.string.configureRefs(
			{
				onFail: () => "foo"
			},
			"self"
		)
		attest(s(5)).equals("foo")
		attest(s.traverse(5)?.toString()).snap("must be a string (was a number)")
	})

	it("assert always throws ArkErrors", () => {
		const n = intrinsic.number.configureRefs(
			{
				onFail: () => "foo"
			},
			"self"
		)
		attest(() => n.assert("five"))
	})

	it("passed onFail overrides meta", () => {
		const b = intrinsic.bigint.configureRefs(
			{
				onFail: () => "foo"
			},
			"self"
		)

		attest(b(5, undefined, () => "bar")).equals("bar")
	})
})
