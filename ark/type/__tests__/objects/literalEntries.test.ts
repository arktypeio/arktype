import { attest, contextualize } from "@ark/attest"
import { writeLiteralUnionEntriesMessage } from "@ark/schema"
import { register } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("strings", () => {
		const t = type({
			foo: "1",
			bar: "2",
			"baz?": "3"
		})

		attest(t.props).snap([
			{ key: "bar", value: { unit: 2 } },
			{ key: "foo", value: { unit: 1 } },
			{ key: "baz", value: { unit: 3 } }
		])
	})

	it("mixed keys", () => {
		const s = Symbol()

		const sReference = register(s)
		const s2 = Symbol()
		const s2Reference = register(s2)
		const t = type({
			[s]: "1",
			[s2]: ["2", "?"],
			foo: "3",
			foo2: ["4", "?"]
		})

		attest<{
			[s]: 1
			foo: 3
			[s2]?: 2
			foo2?: 4
		}>(t.infer)

		attest(t.props).snap()
	})

	it("union", () => {
		const t = type({ foo: "string" }).or({ bar: "number" })
		attest(() => t.props).throws(writeLiteralUnionEntriesMessage(t.expression))
	})
})
