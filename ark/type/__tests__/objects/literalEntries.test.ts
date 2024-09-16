import { attest, contextualize } from "@ark/attest"
import { registeredReference } from "@ark/schema"
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
		>(t.literalEntries).snap([
			["bar", { unit: 2 }, "required"],
			["foo", { unit: 1 }, "required"],
			["baz", { unit: 3 }, "optional"]
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

		attest(t.literalEntries).snap([
			[`Symbol(${sReference})`, { unit: 1 }, "required"],
			["foo", { unit: 3 }, "required"],
			[
				`Symbol(${s2Reference})`,
				{ unit: 2, meta: { optional: true } },
				// not sure why the type of snap breaks here. if you can fix it, do!
				"optional" as never
			],
			["foo2", { unit: 4, meta: { optional: true } }, "optional" as never]
		])
	})

	it("union", () => {
		const t = type({
			firstOnly: "1",
			shared: "2",
			sharedRequired: "3",
			"sharedOptional?": "4",
			sharedMixed: "5"
		}).or({
			secondOnly: "6",
			shared: "7",
			sharedRequired: "8",
			"sharedOptional?": "9",
			"sharedMixed?": "10"
		})

		attest(t.literalEntries).snap()
	})
})
