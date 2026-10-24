import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("describes the object", () => {
		const User = type({ "@": "a user", name: "string" })
		attest<{ name: string }>(User.infer)
		attest(User.json).equals(type({ name: "string" }, "@", "a user").json)
		attest(User(5).toString()).snap("must be a user (was a number)")
	})

	it("meta object", () => {
		const User = type({
			name: "string",
			"@": { title: "User", description: "a user" }
		})
		attest(User.toJsonSchema()).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "object",
			title: "User",
			description: "a user",
			properties: { name: { type: "string" } },
			required: ["name"]
		})
	})

	it("applies only to its own object", () => {
		const T = type({ a: { "@": "an a", b: "string" } })
		attest(T.description).snap("{ a: an a }")
		attest(T({ a: 5 }).toString()).snap("a must be an a (was a number)")
	})

	it("description ending in ?", () => {
		const T = type({ "@": "a user?", name: "string" })
		attest<{ name: string }>(T.infer)
		attest(T.description).snap("a user?")
	})

	it("invalid meta", () => {
		// @ts-expect-error
		attest(() => type({ "@": 5, name: "string" })).type.errors.snap(
			"Type 'number' is not assignable to type 'Collapsible<TypeMeta>'."
		)
	})

	it("merge takes the merged-in object's, as a spread does", () => {
		const A = type({ "@": "an A", a: "string" })
		const merged = A.merge({ "@": "a B", b: "number" })
		attest(merged.description).snap("a B")
		attest(merged.json).equals(type({ "...": A, "@": "a B", b: "number" }).json)
		attest(A.merge({ b: "number" }).description).snap(
			"{ a: a string, b: a number }"
		)
	})

	it("escaped", () => {
		const T = type({ "\\@": "string" })
		attest<{ "@": string }>(T.infer)
		attest(T.json).snap({
			required: [{ key: "@", value: "string" }],
			domain: "object"
		})
	})

	it("escaped with an optional value", () => {
		const T = type({ "\\+": "string?" })
		attest<{ "+"?: string }>(T.infer)
		attest(T.json).snap({
			optional: [{ key: "+", value: "string" }],
			domain: "object"
		})
	})
})
