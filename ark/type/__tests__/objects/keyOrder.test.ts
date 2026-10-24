import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { scope, type } from "arktype"

contextualize(() => {
	const keysOf = (data: unknown) => Object.keys(data as object)

	it("delete lists keys as declared", () => {
		const T = type({ name: "string", entityType: "string", "+": "delete" })
		attest(keysOf(T({ entityType: "user", name: "Ada", extra: 1 }))).snap([
			"name",
			"entityType"
		])
	})

	it("an optional key keeps its place among required ones", () => {
		const T = type({ a: "string", "b?": "string", c: "string", "+": "delete" })
		attest(keysOf(T({ c: "c", b: "b", a: "a" }))).snap(["a", "b", "c"])
		attest(keysOf(T({ c: "c", a: "a" }))).snap(["a", "c"])
	})

	it("a morph's copy lists keys as declared", () => {
		const T = type({ z: "string.trim", a: "string", "+": "delete" })
		attest(T({ a: "a", z: " z ", extra: 1 })).snap({ z: "z", a: "a" })
		attest(keysOf(T({ a: "a", z: " z " }))).snap(["z", "a"])
	})

	it("defaults are written as declared", () => {
		const Kept = type({ c: "number = 3", a: "number = 1", b: "string" })
		// undeclared keys are kept, so the input's keys come first
		attest(keysOf(Kept({ b: "b" }))).snap(["b", "c", "a"])
		const Deleted = type({
			c: "number = 3",
			a: "number = 1",
			b: "string",
			"+": "delete"
		})
		attest(keysOf(Deleted({ b: "b" }))).snap(["c", "a", "b"])
	})

	it("an index signature's keys follow declared ones in input order", () => {
		const T = type({
			"[/^x/]": "number",
			b: "string",
			a: "string",
			"+": "delete"
		})
		attest(keysOf(T({ x2: 2, a: "a", other: 0, x1: 1, b: "b" }))).snap([
			"b",
			"a",
			"x2",
			"x1"
		])
	})

	it("a nested object lists its own keys as declared", () => {
		const T = type({
			outer: { z: "string", y: "string", "+": "delete" },
			inner: "string",
			"+": "delete"
		})
		const out = T({ inner: "i", outer: { y: "y", z: "z", x: "x" } }) as any
		attest(keysOf(out)).snap(["outer", "inner"])
		attest(keysOf(out.outer)).snap(["z", "y"])
	})

	it("each union branch lists its own order", () => {
		const T = type({ kind: "'b'", b: "string", "+": "delete" }).or({
			a: "string",
			kind: "'a'",
			"+": "delete"
		})
		attest(keysOf(T({ b: "b", kind: "b" }))).snap(["kind", "b"])
		attest(keysOf(T({ kind: "a", a: "a" }))).snap(["a", "kind"])
	})

	it("a spread keeps its base's order, then adds new keys", () => {
		const Base = type({ c: "string", b: "string" })
		const T = type({ "...": Base, a: "string", b: "number", "+": "delete" })
		attest(keysOf(T({ a: "a", b: 1, c: "c" }))).snap(["c", "b", "a"])
		attest(
			keysOf(
				Base.merge({ a: "string", b: "number" }).onUndeclaredKey("delete")({
					a: "a",
					b: 1,
					c: "c"
				})
			)
		).snap(["c", "b", "a"])
	})

	it("an intersection lists its left operand's keys first", () => {
		const T = type({ b: "string" })
			.and({ a: "string", b: "string" })
			.onUndeclaredKey("delete")
		attest(keysOf(T({ a: "a", b: "b" }))).snap(["b", "a"])
	})

	it("pick and omit keep their source's order", () => {
		const T = type({ z: "string", y: "string", x: "string", "+": "delete" })
		const data = { x: "x", y: "y", z: "z" }
		attest(keysOf(T.pick("x", "z")(data))).snap(["z", "x"])
		attest(keysOf(T.omit("y")(data))).snap(["z", "x"])
	})

	it("partial and required keep their source's order", () => {
		const T = type({ z: "string", "y?": "string", x: "string", "+": "delete" })
		const data = { x: "x", y: "y", z: "z" }
		attest(keysOf(T.partial()(data))).snap(["z", "y", "x"])
		attest(keysOf(T.required()(data))).snap(["z", "y", "x"])
	})

	it("an alias keeps its order where it's referenced", () => {
		const $ = scope({
			user: { name: "string", id: "string", "+": "delete" },
			team: { members: "user[]" }
		}).export()
		const out = $.team({ members: [{ id: "1", name: "Ada" }] }) as any
		attest(keysOf(out.members[0])).snap(["name", "id"])
	})

	it("a generic's instantiation keeps its order", () => {
		const Entry = type("<t>", { value: "t", key: "string", "+": "delete" })
		attest(keysOf(Entry("number")({ key: "k", value: 1 }))).snap([
			"value",
			"key"
		])
	})

	it("a schema without an order lists required keys, then optional ones", () => {
		const T = rootSchema({
			domain: "object",
			required: [
				{ key: "b", value: "string" },
				{ key: "a", value: "string" }
			],
			optional: [{ key: "c", value: "string" }],
			undeclared: "delete"
		})
		attest(keysOf(T({ c: "c", b: "b", a: "a" }))).snap(["a", "b", "c"])
		const Ordered = rootSchema({
			domain: "object",
			required: [
				{ key: "b", value: "string" },
				{ key: "a", value: "string" }
			],
			optional: [{ key: "c", value: "string" }],
			undeclared: "delete",
			order: ["c", "b"]
		})
		attest(keysOf(Ordered({ c: "c", b: "b", a: "a" }))).snap(["c", "b", "a"])
	})

	it("types declaring keys in another order are equal", () => {
		const Ab = type({ a: "string", b: { c: "number", d: "number" } })
		const Ba = type({ b: { d: "number", c: "number" }, a: "string" })
		attest(Ab === Ba).equals(false)
		attest(Ab.equals(Ba)).equals(true)
		attest(Ab.extends(Ba)).equals(true)
		attest(Ab.json).equals(Ba.json)
		attest(Ab.or(Ba).expression).snap(
			"{ a: string, b: { c: number, d: number } }"
		)
	})

	it("printing and JSON Schema stay canonical", () => {
		const T = type({ "b?": "string", c: "string", a: "string" })
		attest(T.expression).snap("{ a: string, c: string, b?: string }")
		const schema = T.toJsonSchema() as {
			properties: object
			required: string[]
		}
		attest(keysOf(schema.properties)).snap(["a", "c", "b"])
		attest(schema.required).snap(["a", "c"])
	})
})
