import { attest, contextualize } from "@ark/attest"
import {
	$ark,
	rootSchema,
	schemaScope,
	type ArkErrors,
	type NodeId
} from "@ark/schema"

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
		const node = rootSchema({
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

	it("allows multiple scopes with the same name without collision", () => {
		const s1 = schemaScope({ a: { domain: "string" } }, { name: "Array" })
		const s2 = schemaScope({ b: { domain: "number" } }, { name: "Array" })
		attest(s1.name).equals("Array")
		attest(s2.name).equals("Array")
	})

	it("applies roots with ids that name what their compiled apply reads", () => {
		// a root's compiled apply is named for its id, and whatever the id, that
		// name must neither shadow a value the apply closes over nor be reserved
		for (const id of [
			"allows",
			"apply",
			"optimistic",
			"node",
			"clone",
			"Traversal",
			"config",
			"in"
		] as NodeId[]) {
			const Obj = schemaScope({}).parse(
				{ domain: "object", required: [{ key: "a", value: "string" }] },
				{ id }
			)
			attest(Obj({ a: "s" })).equals({ a: "s" })
			attest(String(Obj({ a: 1 }))).equals("a must be a string (was a number)")

			const Morph = schemaScope({}).parse(
				{ in: "string", morphs: [(s: string) => s.length] },
				{ id }
			)
			attest(Morph("s")).equals(1)
			attest(String(Morph(1))).equals("must be a string (was a number)")
		}
	})

	it("registers nothing only compiled traversals read", () => {
		const epoch = new Date(0)
		// error contexts, key sets, default and structural morphs, the array
		// index matcher and discriminated unions' error helpers
		const make = (key: string) =>
			rootSchema({
				domain: "object",
				required: [
					{ key, value: "string" },
					{ key: "n", value: { domain: "number", min: 0, max: 100 } },
					{ key: "d", value: { proto: Date, after: epoch } },
					{ key: "u", value: [{ unit: 1 }, { unit: "a" }] },
					{ key: "v", value: ["string", "number"] },
					{
						key: "t",
						value: {
							proto: Array,
							sequence: { prefix: ["string"], defaultables: [["number", 0]] },
							undeclared: "delete"
						}
					}
				],
				optional: [{ key: "o", value: "number", default: 5 }],
				undeclared: "reject"
			})
		const invalid = { n: 500, d: new Date(-1), u: 2, v: true, t: [1, 2], x: 1 }
		make("warm")(invalid)
		const registered = Object.keys($ark).length
		const T = make("fresh")
		attest(
			T({ fresh: "s", n: 5, d: new Date(1), u: 1, v: 1, t: ["s"] })
		).equals({
			fresh: "s",
			n: 5,
			d: new Date(1),
			u: 1,
			v: 1,
			t: ["s", 0],
			o: 5
		})
		attest((T(invalid) as ArkErrors).count).equals(7)
		attest(Object.keys($ark).length).equals(registered)
	})
})
