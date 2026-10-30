import { attest, contextualize } from "@ark/attest"
import { $ark, writeMissingImportMessage } from "@ark/schema"
import { scope, type } from "arktype"
import "arktype/mutatesInput"

contextualize(() => {
	const guarded = scope({}, { mutatesInput: true })
	const always = scope({}, { mutatesInput: "always" })

	it("writes what it transforms into a valid input, which it returns", () => {
		const User = guarded.type({
			name: "string.trim",
			tags: "string.trim[]",
			role: "string = 'user'"
		})
		const tags = [" b "]
		const input = { name: " a ", tags }
		const out = User(input)
		attest(out as object).is(input)
		attest(input as object).snap({ name: "a", tags: ["b"], role: "user" })
		attest(input.tags).is(tags)
	})

	it("writes into an object an invalid input holds that it finds valid", () => {
		const T = guarded.type({
			inner: { n: "string.numeric.parse" },
			m: "number"
		})
		const input = { inner: { n: "1" }, m: "2" }
		attest(T(input).toString()).snap("m must be a number (was a string)")
		attest(input as object).snap({ inner: { n: 1 }, m: "2" })
	})

	it("copies where a place could read what another wrote", () => {
		const T = guarded.type({
			a: { n: "string.numeric.parse" },
			b: { n: "string" }
		})
		const shared = { n: "1" }
		attest(T({ a: shared, b: shared })).snap({ a: { n: 1 }, b: { n: "1" } })
		attest(shared).snap({ n: "1" })
	})

	it("copies where a place could read the output another wrote", () => {
		const T = guarded.type({
			a: { n: "string.numeric.parse" },
			b: { n: "number" }
		})
		const shared = { n: "1" }
		attest(T({ a: shared, b: shared }).toString()).snap(
			"b.n must be a number (was a string)"
		)
		attest(shared).snap({ n: "1" })
	})

	it("copies where a length bound could read the elements another place adds", () => {
		const T = guarded.type({
			a: ["string", ["string", "=", "d"]],
			b: "unknown[] <= 1"
		})
		const shared = ["x"]
		attest(T({ a: shared, b: shared })).snap({ a: ["x", "d"], b: ["x"] })
		attest(shared).snap(["x"])
	})

	it("copies where a morph is passed ctx", () => {
		const T = guarded.type({
			a: "string.trim",
			b: ["string", "=>", (s, ctx) => s + (ctx.root as { a: string }).a]
		})
		attest(T({ a: " x ", b: "y" })).snap({ a: "x", b: "y x " })
	})

	it("writes where only a keyword's morph is passed ctx", () => {
		const T = guarded.type({ a: "string.trim", n: "string.integer.parse" })
		const input = { a: " x ", n: "1" }
		attest(T(input) as object).is(input)
		attest(input as object).snap({ a: "x", n: 1 })
	})

	it("copies the elements it transforms, which could be one object", () => {
		const Items = guarded.type({ n: "string.numeric.parse" }).array()
		const item = { n: "1" }
		attest(Items([item, item])).snap([{ n: 1 }, { n: 1 }])
		attest(item).snap({ n: "1" })
	})

	it("writes defaults into elements that could be one object", () => {
		const Items = guarded
			.type({ id: "number", active: "boolean = false" })
			.array()
		const item = { id: 1 }
		const input = [item, item]
		attest(Items(input) as object).is(input)
		attest(input as object).snap([
			{ id: 1, active: false },
			{ id: 1, active: false }
		])
	})

	it("writes an undeclared key through a cyclic input", () => {
		const T = guarded.type({
			n: "number",
			nested: { num: "string.numeric.parse" }
		})
		const input: Record<string, unknown> = { n: 1, num: "5" }
		input.nested = input
		attest(T(input) as object).is(input)
		attest(input.num).equals(5)
	})

	it("copies a Type piped after a function", () => {
		const held = { n: "1" }
		const T = guarded
			.type("string")
			.pipe(() => held)
			.to({ n: "string.numeric.parse" })
		attest(T("x")).snap({ n: 1 })
		attest(held).snap({ n: "1" })
	})

	it("writes every transform into its input under always", () => {
		const Items = always.type({ n: "string.numeric.parse" }).array()
		const input = [{ n: "1" }, { n: "2" }]
		attest(Items(input) as object).is(input)
		attest(input as object).snap([{ n: 1 }, { n: 2 }])
	})

	it("writes in place from its first call, though a Type it holds is compiled", () => {
		const Inner = type({ n: "string.numeric.parse" })
		Inner({ n: "1" })
		Inner({ n: "2" })
		const T = always.type({ inner: Inner })
		const inner = { n: "3" }
		attest(T.assert({ inner }).inner as object).is(inner)
		attest(inner as object).snap({ n: 3 })
	})

	it("pipes through a Type another root compiled in place", () => {
		const Parsed = always.type({ n: "string.numeric.parse" })
		const Piped = Parsed.pipe(o => o)
		Piped({ n: "1" })
		Piped({ n: "2" })
		// Parsed is reached only through the pipeline, so its in-place
		// traversals are read from Piped's unit rather than compiled again
		const T = always.type([["object", "|>", Parsed], "=>", o => o])
		const input = { n: "3" }
		attest(T(input) as object).is(input)
		attest(input as object).snap({ n: 3 })
		attest(T("x").toString()).snap("must be an object (was a string)")
	})

	it("checks its first data before it has compiled code, as a Type copying does", () => {
		const Item = always.type({ id: "string.numeric.parse" })
		const Pair = always.type({ kind: "'pair'", items: [Item, Item] })
		const Event = Pair.or({ kind: "'item'", item: Item })
		// a precompiled unit binds as a Type is created
		const units = () => [Event, Pair, Item].map(T => T.internal.unitFn)
		const created = units()
		const items = [{ id: "1" }, { id: "2" }]
		attest(Event({ kind: "pair", items }) as object).snap({
			kind: "pair",
			items: [{ id: 1 }, { id: 2 }]
		})
		attest(units()).equals(created)
		const item = { id: "3" }
		Event({ kind: "item", item })
		attest(item as object).snap({ id: 3 })
		attest(typeof Event.internal.unitFn).equals("function")
	})

	it("compiles no Type it reads uncompiled", () => {
		const Item = always.type({ kind: "'a'", n: "string.numeric.parse" })
		Item({ kind: "a", n: "0" })
		const { unitFn } = Item.internal
		const List = always.type([Item, "|", { kind: "'b'" }]).array()
		const input = [
			{ kind: "a", n: "1" },
			{ kind: "a", n: "2" }
		]
		attest(List(input) as object).is(input)
		attest(input as object).snap([
			{ kind: "a", n: 1 },
			{ kind: "a", n: 2 }
		])
		attest(Item.internal.unitFn).equals(unitFn)
	})

	it("binds compiled code to a Type a morph calls", () => {
		const Held = always.type({ x: { count: "string.numeric.parse" } })
		Held({ x: { count: "0" } })
		const T = always.type({
			a: ["string", "=>", s => (Held({ x: { count: s } }), s)],
			b: { count: "string.numeric.parse" }
		})
		const b = { count: "1" }
		attest(T.assert({ a: "2", b }).b as object).is(b)
		attest(b as object).snap({ count: 1 })
		attest(typeof Held.internal.unitFn).equals("function")
	})

	it("finds each issue of an input it rejects, as copying does", () => {
		const T = always
			.type({ v: "number" })
			.pipe(o => o)
			.array()
		attest(T([{ v: "x" }, { v: 1 }, { v: "y" }]).toString())
			.snap(`value at [0].v must be a number (was a string)
value at [2].v must be a number (was a string)`)
	})

	it("copies an object it deletes undeclared keys from", () => {
		const T = always.type({
			"+": "delete",
			name: "string.trim",
			inner: { v: "string.trim" }
		})
		const inner = { v: " v " }
		const input = { name: " a ", inner, extra: 1 }
		const out = T.assert(input)
		attest(out).snap({ name: "a", inner: { v: "v" } })
		attest(out.inner).is(inner)
		attest(input).snap({ name: " a ", inner: { v: "v" }, extra: 1 })
	})

	it("copies a shared array it strips", () => {
		const Stripped = guarded
			.type(["string.numeric.parse"])
			.and({ "+": "delete", length: "number" })
		const T = guarded.type({ a: Stripped, b: "string[]" })
		const shared = Object.assign(["1"], { extra: 1 })
		attest(T({ a: shared, b: shared })).snap({ a: [1], b: ["1"] })
		attest(shared).snap(["1"])
	})

	it("copies a key two constraints transform", () => {
		const T = always.type({
			a: { b: "string = 'x'" },
			"[string]": { "c?": "string.trim" }
		})
		const input = { a: { c: " c " } }
		attest(T(input) as object).snap({ a: { c: "c", b: "x" } })
		attest(input).snap({ a: { c: " c " } })
	})

	it("throws without arktype/mutatesInput", () => {
		const installed = $ark.inPlace!
		delete $ark.inPlace
		try {
			attest(() => scope({}, { mutatesInput: true }).type("string")).throws(
				writeMissingImportMessage("mutatesInput", "true")
			)
		} finally {
			$ark.inPlace = installed
		}
	})
})
