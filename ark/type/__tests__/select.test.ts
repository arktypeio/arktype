import { attest, contextualize } from "@ark/attest"
import type { DomainNode } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	contextualize.each(
		"select from User",
		() => {
			const User = type({
				name: "string",
				platform: "'android' | 'ios'",
				"version?": "number | string"
			})

			const ExpectedConfiguredUser = User.configure(
				{ description: "A STRING" },
				{
					kind: "domain",
					where: d => d.domain === "string"
				}
			)

			return { User, ExpectedConfiguredUser }
		},
		it => {
			it("can select a domain", ({ User }) => {
				const selected = User.select({
					kind: "domain",
					where: d => d.domain === "string"
				})

				attest<DomainNode[]>(selected).snap([{ domain: "string" }])
			})

			it("fluent selector", ({
				ExpectedConfiguredUser: ExpectedConfiguredUser
			}) => {
				attest(ExpectedConfiguredUser).snap({
					required: [
						{ key: "name", value: { domain: "string", meta: "A STRING" } },
						{ key: "platform", value: [{ unit: "android" }, { unit: "ios" }] }
					],
					optional: [
						{
							key: "version",
							value: ["number", { domain: "string", meta: "A STRING" }]
						}
					],
					domain: "object"
				})
			})

			it("tuple expression selector", ({ User, ExpectedConfiguredUser }) => {
				const T = type([
					User,
					"@",
					{
						description: "A STRING"
					},
					{
						kind: "domain",
						// tuple expression syntax doesn't support narrowing d from kind here
						where: d => d.assertIs("domain").domain === "string"
					}
				])

				attest(T.json).equals(ExpectedConfiguredUser.json)
			})

			it("args expression selector", ({ User, ExpectedConfiguredUser }) => {
				const T = type(
					User,
					"@",
					{
						description: "A STRING"
					},
					{
						kind: "domain",
						// args expression syntax doesn't support narrowing d from kind here
						where: d => d.assertIs("domain").domain === "string"
					}
				)

				attest(T.json).equals(ExpectedConfiguredUser.json)
			})
		}
	)

	it("selects from every node a pipe passes through", () => {
		const Inner = type({ a: "string" })
		const Middle = type("string.json.parse").pipe(Inner, o => o)
		const Last = type("string.json.parse").pipe(o => o, Inner)
		attest(Middle.select("required")).snap([{ key: "a", value: "string" }])
		attest(Last.select("required")).snap([{ key: "a", value: "string" }])
	})

	it("selects from a cyclic node piped through", () => {
		const Cyclic = scope({ N: { a: "string", "b?": "N" } }).export().N
		const Middle = type("string.json.parse").pipe(Cyclic, o => o)
		attest(Middle.select("required")).snap([{ key: "a", value: "string" }])
	})

	it("a predicate decides for a node held as two objects", () => {
		const Target = type("string > 3")
		const Inner = type({ x: Target })
		const $ = scope({})
		// Target as another scope binds it, which isn't the object Inner holds
		const Bound = $.type(Target)
		const Holder = $.type({ a: Bound, inner: Inner })
		const descriptions = (t: typeof Holder) => [
			t.get("a").meta.description,
			t.get("inner", "x").meta.description
		]
		attest(
			descriptions(
				Holder.configure(
					{ description: "picked" },
					{ where: node => node === Target.internal }
				)
			)
		).equals([undefined, "picked"])
		attest(
			descriptions(
				Holder.configure(
					{ description: "picked" },
					{ where: node => node.expression === "string >= 4" }
				)
			)
		).equals(["picked", "picked"])
		attest(
			descriptions(Holder.configure({ description: "picked" }, "intersection"))
		).equals(["picked", "picked"])
	})

	it("docs select config example", () => {
		const SelectivelyConfigured = type({
			name: "string",
			age: "number"
		}).configure(
			{
				description: "a special string"
			},
			// only add the description to string keywords
			{
				kind: "domain",
				where: d => d.domain === "string"
			}
		)

		attest(SelectivelyConfigured.get("name").description).equals(
			"a special string"
		)
		attest(SelectivelyConfigured.get("age").description).equals("a number")
	})
})
