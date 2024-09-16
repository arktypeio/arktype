import { attest, contextualize } from "@ark/attest"
import {
	registeredReference,
	writeLiteralUnionEntriesMessage
} from "@ark/schema"
import { register, type array } from "@ark/util"
import { type } from "arktype"

contextualize(() => {
	it("strings", () => {
		const t = type({
			foo: "1",
			bar: "2",
			"baz?": "3"
		})

		attest<
			array<
				| readonly ["foo", type<1>, "required"]
				| readonly ["bar", type<2>, "required"]
				| readonly ["baz", type<3>, "optional"]
			>
		>(t.literalEntries).snap()
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

		attest(t.literalEntries).snap([
			[
				"Symbol(symbol)",
				{ unit: 1 },
				"required",
				{ key: "$ark.symbol", value: { unit: 1 } }
			],
			["foo", { unit: 3 }, "required", { key: "foo", value: { unit: 3 } }],
			[
				"Symbol(symbol1)",
				{ unit: 2, meta: { optional: true } },
				// not sure why the type of snap breaks here. if you can fix it, do!
				"optional" as never,
				{ key: "$ark.symbol1", value: { unit: 2, meta: { optional: true } } }
			],
			[
				"foo2",
				{ unit: 4, meta: { optional: true } },
				"optional" as never,
				{ key: "foo2", value: { unit: 4, meta: { optional: true } } }
			]
		])
	})

	it("union", () => {
		const t = type({ foo: "string" }).or({ bar: "number" })
		attest(() => t.literalEntries).throws(
			writeLiteralUnionEntriesMessage(t.expression)
		)
	})
})
