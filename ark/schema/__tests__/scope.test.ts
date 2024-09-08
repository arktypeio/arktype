import { attest, contextualize } from "@ark/attest"
import { rootNode, schemaScope } from "@ark/schema"

contextualize(() => {
	it("has jit in scope", () => {
		const types = schemaScope({
			foo: {
				domain: "string"
			}
		}).export()

		attest(types.foo.precompilation).satisfies("string")
	})

	it("has jit standalone", () => {
		const node = rootNode({
			domain: "string"
		})

		attest(node.precompilation).satisfies("string")
	})

	it("reference", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				required: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "string"
			}
		}).export()
		attest(types.a.json).snap({
			domain: "object",
			required: [{ key: "b", value: "string" }]
		})
		attest(types.b.json).snap({ domain: "string" })
	})
	it("cyclic", () => {
		const types = schemaScope({
			a: {
				domain: "object",
				required: {
					key: "b",
					value: "$b"
				}
			},
			b: {
				domain: "object",
				required: {
					key: "a",
					value: "$a"
				}
			}
		}).export()

		attest(types.a.json).snap({
			domain: "object",
			required: [
				{
					key: "b",
					value: { domain: "object", required: [{ key: "a", value: "$a" }] }
				}
			]
		})

		attest(types.b.json).snap({
			domain: "object",
			required: [{ key: "a", value: "$a" }]
		})

		const a = {} as { b: typeof b }
		const b = { a }
		a.b = b

		const almostB = { a: { b: { a: { b: "whoops" } } } }

		attest(types.a.allows(a)).equals(true)
		attest(types.a(a)).equals(a)
		attest(types.b(b)).equals(b)
		attest(types.b.allows(b)).equals(true)
		attest(types.b.allows(almostB)).equals(false)
		attest(types.b(almostB)?.toString()).snap(
			"a.b.a.b must be an object (was a string)"
		)
	})
})
