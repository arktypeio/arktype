import { attest, contextualize } from "@ark/attest"
import {
	writeShallowCycleErrorMessage,
	writeUnclosedGenericCycleMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import {
	writeIndiscriminableMorphMessage,
	writeMorphIntersectionMessage
} from "arksets/internal"
import { scope, type, type Type } from "arktype"
import { writeUnresolvedFilterMessage } from "arktype/internal/keywords/ts.ts"
import { writeInvalidGenericArgCountMessage } from "arktype/internal/parser/shift/operand/genericArgs.ts"

contextualize(() => {
	it("doesn't mutate its input", () => {
		const nested = scope({ nested: "(nested | number)[]" }).export().nested
		const data = [[1], [2]]

		nested(data)
		attest(data).equals([[1], [2]])
		attest(nested([[{}]]).toString()).snap(
			"value at [0][0] must be an array (was an object)"
		)
	})

	it("rejects an object a failed union branch reached", () => {
		const types = scope({
			x: { v: "string", "self?": "x" },
			a: { x: "x", z: "string" },
			b: { x: "x", b: "string" },
			union: "a | b"
		}).export()
		const data = { x: { v: "a", self: { v: 1 } }, z: "z", b: "b" }

		attest(types.union.allows(data)).equals(false)
		attest(types.union(data).toString()).snap(
			"x.self.v must be a string (was a number)"
		)
	})

	it("checks each primitive where it's reached", () => {
		const node = scope({ node: { a: "node | number", "b?": "node" } }).export()
			.node

		attest(node.allows({ a: 5, b: 5 })).equals(false)
		attest(node({ a: 5, b: 5 }).toString()).snap(
			"b must be an object (was a number)"
		)
	})

	it("object shared by undiscriminated union", () => {
		const types = scope({
			a: { kids: "union[]", "a?": "string" },
			b: { kids: "union[]", "b?": "number" },
			union: "a | b"
		}).export()
		let data: object = { kids: [], a: 1, b: "x" }
		for (let i = 0; i < 24; i++) data = { kids: [data, data] }

		const path = "kids[0].".repeat(24)

		attest(types.union.allows(data)).equals(false)
		attest(types.union(data).toString()).equals(
			`${path}a must be a string (was a number) or ${path}b must be a number (was a string)`
		)
	})

	it("reports a cyclic object once", () => {
		const node = scope({ node: { v: "number", "next?": "node" } }).export().node
		const data: { v: unknown; next?: unknown } = { v: "x" }
		data.next = data

		attest(node(data).toString()).snap("v must be a number (was a string)")
	})

	it("cyclic object once through an equivalent root", () => {
		const { node } = scope({ node: { "next?": "node", v: "number" } }).export()
		const data: { v?: unknown; next?: unknown } = {}
		data.next = data
		const { u } = scope({
			n0: { v: "number", "e0?": "n0[]" },
			n1: { v: "number", "e0?": "n0[]" },
			u: "n0 | n1"
		}).export()
		const r: { v: unknown; e0?: unknown[] } = { v: "x" }
		r.e0 = [r]

		attest(
			[
				node.describe("x"),
				node.configure({ description: "x" }),
				node.onUndeclaredKey("ignore")
			].map(t => String(t(data)))
		).equals([
			"v must be a number (was missing)",
			"v must be a number (was missing)",
			"v must be a number (was missing)"
		])
		attest(String(u(r))).snap("v must be a number (was a string)")
	})

	it("invalid object reached by more than one path", () => {
		const types = scope({
			package: {
				name: "string",
				"dependencies?": "package[]",
				"contributors?": "contributor[]"
			},
			contributor: {
				email: "string.email",
				"packages?": "package[]"
			},
			node: { v: "number", "e0?": "node[]", "next?": "node | null" },
			transformed: { v: "string.trim", "n?": "number", "e?": "transformed[]" }
		}).export()
		const shared = {
			name: "shared",
			contributors: [{ email: "david@sharktypeio" }]
		}
		const root = {
			name: "root",
			dependencies: [{ name: "a", dependencies: [shared] }, shared]
		}
		Object.assign(shared, { dependencies: [root] })
		const graph = Array.from(
			{ length: 9 },
			(_, v): typeof types.node.infer => ({ v })
		)
		graph[8].v = "x" as never
		for (const [from, to] of [
			[0, 1],
			[1, 6],
			[1, 2],
			[2, 3],
			[3, 4],
			[3, 8],
			[4, 5],
			[4, 7],
			[5, 7],
			[7, 6],
			[6, 2],
			[6, 7]
		])
			(graph[from].e0 ??= []).push(graph[to])
		const unionShared = { v: "x" }
		const self: { v: string; next?: object } = { v: "x" }
		self.next = self
		const invalid = { v: "invalid", e: [{ v: "bad", n: "x" }] }

		const cases: [type.Any, unknown][] = [
			[types.package, root],
			[types.node, graph[0]],
			[types.node, { v: 1, e0: [unionShared], next: unionShared }],
			[types.node, self],
			[types.transformed, { v: "root", e: [{ v: "a", e: [invalid] }, invalid] }]
		]
		attest(
			cases.map(([t, data]) => [t.allows(data), t(data) instanceof type.errors])
		).equals(cases.map(() => [false, true]))
	})

	it("depth and width bounds", () => {
		const types = scope({
			list: { v: "number", "next?": "list" },
			tree: { v: "number", kids: "tree[]" }
		}).export()
		for (const length of [64, 65]) {
			let data: typeof types.list.infer = { v: 0 }
			const last = data
			for (let i = 1; i < length; i++) data = { v: i, next: data }

			attest(types.list(data)).equals(data)
			last.v = "x" as never
			attest(types.list(data).toString()).equals(
				`${"next.".repeat(length - 1)}v must be a number (was a string)`
			)
		}
		for (const length of [1000, 1001]) {
			const kids = Array.from({ length }, (_, v) => ({ v, kids: [] }))
			const data = { v: 0, kids }

			attest(types.tree(data)).equals(data)
			kids[length - 1].v = "x" as never
			attest(types.tree(data).toString()).equals(
				`kids[${length - 1}].v must be a number (was a string)`
			)
		}
	})

	it("traverses data past the depth bound once", () => {
		let checks = 0
		const types = scope({
			list: {
				v: ["number", ":", (v: number) => ++checks > v],
				"next?": "list"
			},
			parsed: { v: "string.numeric.parse", "next?": "parsed" }
		}).export()
		let data: typeof types.list.infer = { v: 0 }
		for (let i = 1; i < 100; i++) data = { v: -i, next: data }

		attest(types.list.allows(data)).equals(true)
		attest(checks).equals(100)

		const ring: typeof types.parsed.inferIn = { v: "0" }
		ring.next = ring
		let deep = ring
		for (let i = 1; i < 100; i++) deep = { v: `${i}`, next: deep }
		let last = types.parsed.assert(deep)
		for (let i = 1; i < 100; i++) last = last.next!

		attest(last.next === last).equals(true)
	})

	it("traverses cyclic data with fan-out in linear work", () => {
		let checks = 0
		const node = scope({
			node: {
				v: ["number", ":", (v: number) => ++checks > 0 && v >= 0],
				e: "node[]"
			}
		}).export().node
		const clique: (typeof node.infer)[] = Array.from(
			{ length: 100 },
			(_, v) => ({ v, e: [] })
		)
		for (const n of clique) n.e.push(...clique)
		const ring: (typeof node.infer)[] = Array.from({ length: 200 }, (_, v) => ({
			v,
			e: []
		}))
		for (let i = 0; i < ring.length; i++)
			ring[i].e.push(ring[(i + 1) % 200], ring[(i + 199) % 200])

		for (const graph of [clique, ring]) {
			checks = 0
			attest(node.allows(graph[0])).equals(true)
			attest(checks < 3 * graph.length).equals(true)
			checks = 0
			attest(node(graph[0])).equals(graph[0])
			attest(checks < 3 * graph.length).equals(true)
		}
	})

	it("transforms each path within its bounds", () => {
		const node = scope({
			node: {
				v: "string.numeric.parse",
				"left?": "node",
				"right?": "node"
			}
		}).export().node
		const leaf = { v: "1" }
		const tree = node.assert({ v: "0", left: leaf, right: leaf })

		attest(tree.right).equals({ v: 1 })
		attest(tree.left === tree.right).equals(false)

		let deep: typeof node.inferIn = { v: "0", left: leaf, right: leaf }
		for (let i = 0; i < 64; i++) deep = { v: "0", left: deep }
		let last = node.assert(deep)
		while (!last.right) last = last.left!

		attest(last.right).equals({ v: 1 })
		attest(last.left === last.right).equals(true)

		const ring: typeof node.inferIn = { v: "0" }
		ring.left = ring
		const out = node.assert(ring)

		attest(out.left === out).equals(true)
	})

	it("cyclic output to cyclic type", () => {
		const $ = scope({ node: { v: "number", "next?": "node" } })
		const data: { v: unknown; next?: object } = { v: 0 }
		data.next = data
		const T = $.type("unknown").pipe(() => data, $.export().node)

		attest(T(null) === data).equals(true)
		data.v = "x"
		attest(T(null).toString()).snap("v must be a number (was a string)")
	})

	// https://github.com/arktypeio/arktype/issues/1630
	it("cyclic union discriminated branch errors", () => {
		const api = scope({
			Field: { type: "'field'", value: "string >= 1" },
			Group: { type: "'group'", parts: "Part[]" },
			Part: "Field | Group"
		}).export()
		const Thing = type({ parts: api.Part.array() })

		attest(Thing({ parts: [{ type: "field", value: "" }] }).toString()).snap(
			"parts[0].value must be non-empty"
		)
		attest(api.Part({ type: "field", value: "" }).toString()).snap(
			"value must be non-empty"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1237
	it("generic of cyclic intersection", () => {
		const node = scope({
			AEditing: {
				edits: { a: "number" },
				nodes:
					"(Omit<NodeA, 'editableA'> | Omit<NodeB, 'editableA' | 'edits'>)[]"
			},
			NonEditing: { edits: "undefined?", nodes: "(NodeA | NodeB)[]" },
			NodeA: { type: "'a'", editableA: "number" },
			BaseNodeB: { type: "'b'", editableA: "number" },
			Editing: "AEditing | NonEditing",
			NodeB: "BaseNodeB & Editing",
			Node: "NodeA | NodeB"
		}).export().Node
		const data = {
			type: "b",
			editableA: 12,
			edits: { a: 23 },
			nodes: [{ type: "b", nodes: [] }]
		}

		attest(node.allows(data)).equals(true)
		attest(node({ ...data, nodes: [{ type: "b" }] }).toString()).snap(
			"nodes[0].nodes must be an array (was missing) or edits must be undefined (was an object)"
		)
	})

	it("pipe to contextual cyclic type", () => {
		const types = scope({
			node: [
				{ "next?": "node" },
				":",
				(data, ctx) => !("bad" in data) || ctx.mustBe("good")
			],
			box: { "inner?": "string.json.parse |> node" }
		}).export()

		attest(types.box.allows({ inner: "{}" })).equals(true)
		attest(types.box({ inner: '{ "next": {} }' })).equals({
			inner: { next: {} }
		})
		attest(types.box({ inner: '{ "next": { "bad": 1 } }' }).toString()).snap(
			"inner.next must be good (was an object)"
		)
	})

	it("cyclic default", () => {
		const types = scope({
			list: {
				v: "number",
				next: "list | null = null",
				kids: ["list[]", "=", (): never[] => []]
			},
			box: { inner: ["item", "=", () => ({ v: "x" })] },
			item: { v: "string", "box?": "box" }
		}).export()

		attest(types.list({ v: 0 })).equals({ v: 0, next: null, kids: [] })
		attest(types.box({})).equals({ inner: { v: "x" } })
		attest(() =>
			scope({ list: { next: "list | null = 5" } } as never).export()
		).throws("Default for next must be an object or null (was a number)")
	})

	// https://github.com/arktypeio/arktype/issues/924
	it("cyclic object outside alias", () => {
		const node = scope({ node: { kind: "'node'", "next?": "node" } }).export()
			.node
		const data: { kind: string; next?: object } = { kind: "x" }
		data.next = data

		attest(type({ node })({ node: data }).toString()).snap(
			'node.kind must be "node" (was "x")'
		)
		attest(node.array()([data]).toString()).snap(
			'value at [0].kind must be "node" (was "x")'
		)
	})

	// https://github.com/arktypeio/arktype/issues/944
	it("mutually recursive morph in and out", () => {
		const types = scope({
			a: { n: "string.numeric.parse", "b?": "b" },
			b: { "a?": "a" },
			node: { n: "string.numeric.parse", "next?": "node" }
		}).export()
		const input = { n: "1", b: { a: { n: "2" } } }

		attest(types.a.in(input)).equals(input)
		attest(types.a.out({ n: 1, b: { a: { n: 2 } } })).equals({
			n: 1,
			b: { a: { n: 2 } }
		})
		attest(types.a.out({ n: 1, b: { a: { n: "2" } } }).toString()).snap(
			"b.a.n must be a number (was a string)"
		)
		attest(types.node.out({ n: 1, next: { n: "2" } }).toString()).snap(
			"next.n must be a number (was a string)"
		)
	})

	it("pipes a root to itself", () => {
		const t = type("string.json.parse |> this" as never)

		attest(t(JSON.stringify(JSON.stringify([1]))).toString()).snap(
			"must be a string (was an object)"
		)
		attest(t.out.allows("x")).equals(false)
	})

	// https://github.com/arktypeio/arktype/issues/944
	it("cyclic transform through aliases", () => {
		const node = scope({ node: { v: "string", "next?": "node" } }).export().node
		const strict = node.onDeepUndeclaredKey("reject")
		const described = node.configure(
			{ description: "a described node" },
			"references"
		)

		attest(strict({ v: "a", next: { v: "b", extra: true } }).toString()).snap(
			"next.extra must be removed"
		)
		attest(described({ v: "a", next: 5 }).toString()).snap(
			"next must be a described node (was a number)"
		)
	})

	it("deep config through shared cyclic nodes", () => {
		const chain = scope({
			a: { "p?": "c" },
			c: { q: "b" },
			b: { "r?": "d" },
			d: { q: "b", "s?": "a" }
		}).export()
		const { pair } = scope({
			node: { v: "number", "next?": "node" },
			pair: ["node", "&", { w: "string" }]
		}).export()
		const { a0 } = scope({
			a1: "a1[]",
			a3: { "p1?": "a1" },
			a0: ["a3", "&", { "p1?": { "p0?": "string" }, "p2?": { "p0?": "a1" } }]
		}).export()
		const { x } = scope({
			a: { p0: ["number", "...", "a[]"] },
			x: ["a", "&", { p0: "Record<string, number>" }]
		}).export()
		const tagged = scope({
			a: { kind: "'a'", "n?": "b" },
			b: { kind: "'b'", "n?": "a" },
			u: "a | b"
		}).export()
		const invalid = { p1: {}, p2: { p0: [null] } }

		attest(
			chain.a
				.onDeepUndeclaredKey("reject")({ p: { q: {}, z: 1 } })
				.toString()
		).snap("p.z must be removed")
		attest(
			String(
				pair.onDeepUndeclaredKey("reject")({
					v: 1,
					w: "x",
					next: { v: 2, z: 1 }
				})
			)
		).snap("next.z must be removed")
		attest(String(a0.onDeepUndeclaredKey("reject")(invalid))).equals(
			String(a0(invalid))
		)
		attest(
			String(x.onDeepUndeclaredKey("reject")({ p0: [1, { p0: [2] }] }))
		).snap('p0["1"] must be a number (was an object)')
		attest(
			tagged.u
				.onDeepUndeclaredKey("reject")({
					kind: "a",
					n: { kind: "b", z: 1 }
				})
				.toString()
		).snap("n.z must be removed")
	})

	it("deep config of a disjoint cyclic morph union", () => {
		const { a0 } = scope({
			a0: "Record<string, a1 | a2>",
			a1: { p0: "string = 'd'", "p1?": "string" },
			a2: { kind: "'a2'", "p0?": "a0", p1: "a2 | null" }
		}).export()

		attest(
			a0.configure({ description: "x" }, "references")({ k: { p1: "s" } })
		).equals({ k: { p0: "d", p1: "s" } })
		attest(a0.onDeepUndeclaredKey("delete")({ k: { p1: "s", z: 1 } })).equals({
			k: { p0: "d", p1: "s" }
		})
	})

	it("cyclic data through an indexed prop", () => {
		const types = scope({
			a: { "p?": "a", "q?": "b" },
			b: { "p?": "a", "[string]": "b", "m?": "string.numeric.parse" }
		}).export()
		const data: { q: object; p?: object } = { q: {} }
		data.p = data
		const out: { q: object; p: { p: object } } = types.b(data) as never

		attest(out.q).equals({})
		attest(out.p.p === out.p).equals(true)
	})

	it("cyclic output closes at entry", () => {
		const $ = scope({
			node: { kind: "'n'", v: "string.trim", "next?": "node" },
			leaf: { kind: "'l'" },
			tree: "node | leaf"
		})
		const types = $.export()
		const data: { kind: "n"; v: string; next?: object } = {
			kind: "n",
			v: " a "
		}
		data.next = data

		const prop = $.type({ x: "node" }).assert({ x: data })
		const element = types.node.array().assert([data])
		const piped = $.type("object")
			.pipe(o => o, types.node)
			.assert(data)
		const member = types.tree.assert(data)

		attest(prop.x.next === prop.x).equals(true)
		attest(element[0].next === element[0]).equals(true)
		attest(piped.next === piped).equals(true)
		attest(member.kind === "n" && member.next === member).equals(true)
		attest(prop.x.v).equals("a")
	})

	it("transforms a default through an alias", () => {
		const types = scope({
			a: { "b?": "b" },
			b: { v: "string.trim", "a?": "a" },
			holder: { a: ["a", "=", () => ({ b: { v: " d " } })] },
			tuple: [["a", "=", () => ({ b: { v: " e " } })]]
		}).export()

		attest(types.holder({})).equals({ a: { b: { v: "d" } } })
		attest(types.tuple([])).equals([{ b: { v: "e" } }])
	})

	// https://github.com/arktypeio/arktype/issues/1476
	it("recursive conjunction of instances", () => {
		class Expr {}
		class And extends Expr {
			left: Expr
			right: Expr
			constructor(left: Expr, right: Expr) {
				super()
				this.left = left
				this.right = right
			}
		}
		class Or extends Expr {
			left: Expr
			right: Expr
			constructor(left: Expr, right: Expr) {
				super()
				this.left = left
				this.right = right
			}
		}
		class Not extends Expr {
			operand: Expr
			constructor(operand: Expr) {
				super()
				this.operand = operand
			}
		}
		class True extends Expr {}
		class False extends Expr {}
		const types: Record<string, Type> = scope({
			Truthy: [
				type.instanceOf(True),
				"|",
				[
					[type.instanceOf(And), "&", { left: "Truthy", right: "Truthy" }],
					"|",
					[
						[type.instanceOf(Or), "&", { left: "Truthy", right: "Truthy" }],
						"|",
						[
							[type.instanceOf(Or), "&", { left: "Truthy", right: "Falsy" }],
							"|",
							[
								[type.instanceOf(Or), "&", { left: "Falsy", right: "Truthy" }],
								"|",
								[type.instanceOf(Not), "&", { operand: "Falsy" }]
							]
						]
					]
				]
			],
			Falsy: [
				type.instanceOf(False),
				"|",
				[
					[type.instanceOf(And), "&", { left: "Falsy", right: "Falsy" }],
					"|",
					[
						[type.instanceOf(And), "&", { left: "Falsy", right: "Truthy" }],
						"|",
						[
							[type.instanceOf(And), "&", { left: "Truthy", right: "Falsy" }],
							"|",
							[
								[type.instanceOf(Or), "&", { left: "Falsy", right: "Falsy" }],
								"|",
								[type.instanceOf(Not), "&", { operand: "Truthy" }]
							]
						]
					]
				]
			]
		} as never).export() as never
		const t = new True()
		const f = new False()
		const tt = new And(t, t)
		const tf = new And(t, f)

		attest(types.Truthy(tt)).equals(tt)
		attest(types.Truthy.allows(tf)).equals(false)
		attest(types.Falsy(tf)).equals(tf)
		attest(types.Truthy.allows(new Or(f, new Not(f)))).equals(true)
	})

	// https://github.com/arktypeio/arktype/issues/1486
	it("parses a date on each nullable cyclic object", () => {
		const types = scope({
			User: {
				"id?": "number | null",
				"supervisor?": "User | null",
				"lastUpdate?": "string.date.parse"
			}
		}).export()

		attest(
			types.User({
				id: 7,
				supervisor: { id: 7, lastUpdate: "1" },
				lastUpdate: "0"
			})
		).equals({
			id: 7,
			supervisor: { id: 7, lastUpdate: new Date("1") },
			lastUpdate: new Date("0")
		})
		attest(
			types.User({ supervisor: { supervisor: { lastUpdate: "2" } } })
		).equals({
			supervisor: { supervisor: { lastUpdate: new Date("2") } }
		})
		const self: typeof types.User.inferIn = { lastUpdate: "3" }
		self.supervisor = self
		const out = types.User.assert(self)

		attest(out.lastUpdate).equals(new Date("3"))
		attest(out.supervisor === out).equals(true)
	})

	// https://github.com/arktypeio/arktype/issues/944
	it("cyclic morph in and out aliases", () => {
		const types = scope({
			user: { id: "string.numeric.parse", groups: "group[]" },
			group: { title: "string", members: "user[]" }
		}).export()
		const data = { id: "1", groups: [{ title: "t", members: [] }] }

		attest(types.user.out.expression).snap(
			"{ groups: Out<$group>[], id: number }"
		)
		attest(types.group.in.expression).snap(
			"{ members: In<$user>[], title: string }"
		)
		attest(types.group.in({ title: "t", members: [data] })).equals({
			title: "t",
			members: [data]
		})
	})

	it("dense component in linear size", () => {
		const def: Record<string, object> = {}
		for (let i = 0; i < 16; i++) {
			def[`a${i}`] = {
				[`k${i}`]: "string",
				"next?": `a${(i + 1) % 16} | a${(i + 3) % 16} | null`
			}
		}
		const a0 = scope(def as never).resolve("a0" as never) as type.Any

		attest(a0.expression).snap("{ k0: string, next?: $a1 | $a3 | null }")
	})

	it("any declaration order", () => {
		const t = scope({
			t0: { x: "t3", "y?": "t2 | t1" },
			t1: { x: "t3", "y?": "t4 | t1" },
			t2: { kind: "'t2'", "next?": "t1 | null" },
			t3: "t2[]",
			t4: { v: "string", "b?": "t2" }
		}).export()
		const reordered = scope({
			t3: "t2[]",
			t2: { kind: "'t2'", "next?": "t1 | null" },
			t1: { x: "t3", "y?": "t4 | t1" },
			t0: { x: "t3", "y?": "t2 | t1" },
			t4: { v: "string", "b?": "t2" }
		}).export()

		attest(reordered.t0.expression).equals(t.t0.expression)
		attest(reordered.t0({}).toString()).snap("x must be an array (was missing)")
		attest(t.t0({}).toString()).snap("x must be an array (was missing)")

		const a = scope({
			a2: "(a4 | a2)[]",
			a0: "Record<string, a3>",
			a1: "a2 | a4",
			a3: { kind: "'a3'", "p0?": "a1" },
			a4: "a3"
		}).export()

		attest(a.a1.expression).snap('{ kind: "a3", p0?: $a1 } | ($a2 | $a4)[]')
	})

	it("identical definitions of a closed cycle", () => {
		const types = scope({
			a0: { p1: "string.numeric.parse", "p2?": "a0" },
			n2: { p1: "string.numeric.parse", "p2?": "a0" },
			a1: "a0 | n2"
		}).export()

		attest(types.a1({ p1: "1", p2: { p1: "2" } })).equals({
			p1: 1,
			p2: { p1: 2 }
		})
		attest(() =>
			scope({
				x: { "y?": ["c", "&", "d"] },
				b: { "n?": "c" },
				c: { "p?": "string.json.parse |> b" },
				d: { "p?": "string.json.parse |> e" },
				e: { "n?": "d", m: "1" }
			}).export()
		).throws(
			writeMorphIntersectionMessage(
				"(In: string) => To<$b>",
				"(In: string) => To<$e>"
			)
		)
	})

	it("deferred checks resolving aliases", () => {
		attest(() =>
			scope({
				x: "(a3[] | x)[]",
				a3: { "p0?": "string.json.parse |> a4" },
				a4: { "p1?": "x" }
			}).export()
		).throws(writeIndiscriminableMorphMessage("$a3[]", "($x | $a3[])[]"))
		attest(() =>
			scope({
				i1: [{ p2: ["a1", "=", () => ({})] }, "|", "a1"],
				a1: { "p0?": "null | i1", "p2?": "null" }
			}).export()
		).throws(
			writeIndiscriminableMorphMessage(
				"{ p2: $a1 = Function(fn) }",
				"{ p0?: $i1 | null, p2?: null }"
			)
		)
		attest(() =>
			scope({
				// @ts-expect-error
				i1: { p2: ["a1", "=", null] },
				a1: { "p0?": "null | i1", "p2?": "null" }
			}).export()
		).throws("Default for p2 must be an object (was null)")
		attest(() =>
			scope({
				"g0<p0>": "(p0 | g0<a0>)[]",
				a0: ["g0<string[]>", "...", "a1[]"],
				a1: { p1: ["string", "=", "d"] }
				// printing this scope's type leaves TS 7.1 inferring later spreads as any
				// https://github.com/microsoft/TypeScript/issues/64683
			} as never).export()
		).throws(writeIndiscriminableMorphMessage("string[]", "($a0 | g0<$a0>)[]"))
	})

	it("prints a deep transform's references", () => {
		const { node } = scope({ node: { v: "string", "next?": "node" } }).export()
		const { a } = scope({
			a: { "p?": "c" },
			c: { q: "b" },
			b: { "r?": "d" },
			d: { q: "b", "s?": "a" }
		}).export()
		const strict = node.onDeepUndeclaredKey("reject")

		attest(strict.expression).snap(
			"{ v: string, next?: this, + (undeclared): reject }"
		)
		attest(type({ a: strict }).expression).snap(
			"{ a: { v: string, next?: synthetic1vh94ep0mu8xlx, + (undeclared): reject } }"
		)
		attest(a.onDeepUndeclaredKey("reject").expression).snap(
			"{ p?: synthetic12imoxi017z7bd, + (undeclared): reject }"
		)
	})

	// https://github.com/arktypeio/arktype/issues/930
	it("same alias name in different scopes", () => {
		const s1 = scope({
			a: { v: "string", "next?": "a" },
			box: { "inner?": "a" }
		}).export()
		const s2 = scope({
			a: { v: "number", "next?": "a" },
			box: { "inner?": "a" }
		}).export()

		attest(s1.box.equals(s2.box)).equals(false)
		attest(s1.box.extends(s2.box)).equals(false)
		attest(
			(s1.box as type.Any).and(s2.box).allows({ inner: { v: "x" } })
		).equals(false)
		attest(
			s2.box.and({ extra: "string" })({ extra: "e", inner: { v: 1 } })
		).equals({ extra: "e", inner: { v: 1 } })
	})

	// https://github.com/arktypeio/arktype/issues/930
	it("parses a cyclic type's json back", () => {
		const types = scope({
			node: { v: "number", "next?": "node | null" },
			user: { friends: "group[]" },
			group: { members: "user[]" },
			a: { "p?": ["b", "...", "b[]"] },
			b: { "n?": "b" }
		}).export()

		attest(type.schema(types.node.json as never).equals(types.node)).equals(
			true
		)
		attest(type.schema(types.user.json as never).equals(types.user)).equals(
			true
		)
		// a non-empty array of a cyclic type
		attest(type.schema(types.a.json as never).equals(types.a)).equals(true)
	})

	it("cyclic pipe JSON Schema reference", () => {
		const { a } = scope({ a: { "n?": "string.json.parse |> a" } }).export()

		attest(
			a.toJsonSchema({ fallback: { morph: ctx => ctx.out ?? ctx.base } })
		).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			$ref: "#/$defs/a",
			$defs: { a: { type: "object", properties: { n: { $ref: "#/$defs/a" } } } }
		})
		attest(a.toJsonSchema({ fallback: { morph: ctx => ctx.base } })).snap({
			$schema: "https://json-schema.org/draft/2020-12/schema",
			$ref: "#/$defs/a",
			$defs: { a: { type: "object", properties: { n: { type: "string" } } } }
		})
	})

	// https://github.com/arktypeio/arktype/issues/928
	it("compares cyclic types by their unfolding", () => {
		const types = scope({
			user: { friends: "user[]", name: "string" },
			peer: { friends: "peer[]", name: "string" },
			list: { v: "number", "next?": "list" },
			listPos: { v: "number > 0", "next?": "listPos" },
			field: { type: "'field'", value: "string" },
			group: { type: "'group'", parts: "part[]" },
			part: "field | group"
		}).export()

		attest(types.user.equals(types.peer)).equals(true)
		attest(types.list.equals(type({ v: "number", "next?": "this" }))).equals(
			true
		)
		attest(types.listPos.extends(types.list)).equals(true)
		attest(types.list.extends(types.listPos)).equals(false)
		attest(types.list.or(types.listPos).expression).snap(
			"{ v: number, next?: $list }"
		)
		attest(types.group.extends(types.part)).equals(true)
	})

	it("self-piping cyclic equality", () => {
		const parsed = () =>
			scope({ a: { "n?": "string.json.parse |> a" } }).export().a
		const l = parsed()
		const r = parsed()

		attest(l.equals(r)).equals(true)
		attest(l.extends(r)).equals(true)
		attest(l.and(r).expression).snap("{ n?: (In: string) => To<$a> }")
		attest(l.or(r).expression).snap("{ n?: (In: string) => To<$a> }")
	})

	it("cyclic union equals its reduction", () => {
		const types: Record<string, Type> = scope({
			a: "b[] | a[]",
			b: "a[]",
			c: "d | e | string",
			d: ["boolean", ["c", "?"]],
			e: ["boolean", ["d", "?"]]
		} as never).export() as never

		attest(types.a.or(types.a).expression).snap("$a[]")
		attest(types.a.or(types.a).equals(types.a)).equals(true)
		attest(types.c.or(types.c).equals(types.c)).equals(true)
		attest(types.c.equals(types.d)).equals(false)
	})

	it("relates twin cyclic array unions", () => {
		const chain = (): Record<string, Type> => {
			const def: Record<string, string> = { z: "(x6 | z)[]", x0: "string" }
			for (let i = 1; i <= 6; i++) def[`x${i}`] = `(x${i - 1} | z)[]`
			return scope(def as never).export() as never
		}
		const l = chain().x6
		const r = chain()

		attest(l.equals(r.x6)).equals(true)
		attest(l.extends(r.x6)).equals(true)
		attest(l.or(r.x6).expression).snap("($x5 | $z)[]")
		attest(l.and(r.x6).expression).snap("($x5 | $z)[]")
		attest(l.equals(r.x5)).equals(false)

		const tuple = () =>
			scope({
				Gb: "(b2 | Gb)[]",
				Ga2: "(a2 | Gb)[]",
				a2: ["Ga2", "...", "string[]"],
				b0: "Ga2[]",
				Gx0: "(b0 | Gb)[]",
				b1: "Gx0[]",
				Gx1: "(b1 | Gb)[]",
				b2: "Gx1[]"
			}).export().a2

		attest(tuple().equals(tuple())).equals(true)
	})

	it("relates a cyclic tuple through an alias of an alias", () => {
		const types = scope({
			u: "null | x",
			v: "u",
			x: { "p?": ["u", "...", "v[]"] },
			y: { "p?": ["u", "...", "u[]"] }
		}).export()

		attest(types.x.equals(types.y)).equals(true)
		attest(types.x.extends(types.y)).equals(true)
		attest(types.y.extends(types.x)).equals(true)
	})

	it("relates cyclic tuples whose variadic hides an equal element", () => {
		const relate = (elements: (as: string, bs: string) => unknown[]) => {
			const { a: l }: Record<string, Type> = scope({
				a: { "p?": elements("a", "a") }
			} as never).export() as never
			const { a: r }: Record<string, Type> = scope({
				a: { "p?": elements("a", "b") },
				b: { "p?": elements("a", "a") }
			} as never).export() as never
			return [l.equals(r), l.extends(r), r.extends(l)]
		}

		attest(relate((a, b) => [[a, "?"], "...", [b, "[]"]])).equals([
			true,
			true,
			true
		])
		attest(relate((a, b) => ["...", [a, "[]"], b])).equals([true, true, true])
		attest(relate((a, b) => [a, "...", [b, "[]"], a])).equals([
			true,
			true,
			true
		])
	})

	it("cyclic props disjoint from index", () => {
		const { b: l }: Record<string, Type> = scope({
			b: { kind: "'b'", "p1?": "b | d | null", "p2?": "null" },
			d: "Record<string, d>"
		} as never).export() as never
		const { b: r }: Record<string, Type> = scope({
			b: { kind: "'b'", "p1?": "b | d | null", "p2?": "string" },
			d: "Record<string, d>"
		} as never).export() as never

		attest(l.extends(r)).equals(false)
		attest(l.and(r).allows({ kind: "b", p1: { kind: "b" } })).equals(true)
		attest(l.and(r).allows({ kind: "b", p2: null })).equals(false)
	})

	it("cyclic required key disjoint from index", () => {
		// a is an array only once it resolves, so b's value meets string there
		attest(() =>
			scope({
				a: [[{ b: "a", "[string]": "string" }, "|", "'x'"], "[]"]
			}).export()
		).throws.snap(
			"ParseError: Intersection at b of object and string results in an unsatisfiable type"
		)
	})

	it("cyclic union with subsumed branch", () => {
		const { u } = scope({
			g: { "p0?": "g" },
			u: ["g", "|", { "p0?": "g", "p1?": "string" }]
		}).export()

		attest(u.or(u).expression).snap("{ p0?: $g }")
		attest(u.extends(u.or(u))).equals(true)
		attest(u.equals(u.or(u))).equals(true)

		const { b } = scope({
			a: { "p0?": "a", "p1?": "a | string", "[/^k\\d$/]": "string" },
			b: "d | c",
			c: { "p0?": "b | number > 0" },
			d: "c | a | string"
		}).export()

		attest(b.or(b).equals(b)).equals(true)
	})

	it("cyclic union equal to its unfolding", () => {
		const { a: l } = scope({
			a: { "p?": [["a", "&", { q: "'a'" }], "|", "a"] }
		}).export()
		const { a: r } = scope({
			a: {
				"p?": [
					["a", "&", { q: "'a'" }],
					"|",
					{ "p?": [["a", "&", { q: "'a'" }], "|", "a"] }
				]
			}
		}).export()

		attest([l.equals(r), r.equals(l), l.extends(r), r.extends(l)]).equals([
			true,
			true,
			true,
			true
		])
	})

	it("cyclic branch within another through its cycle", () => {
		const types = scope({
			c0: ["c2", "|", { "b?": "string", "d?": "c0" }],
			c2: { "d?": "c2" },
			n2: { "d?": "n2" }
		}).export()

		attest(types.c0.equals(types.c2)).equals(true)
		attest(types.c0.extends(types.c2)).equals(true)
		attest(types.c0.extends(types.c0.or(types.n2))).equals(true)
	})

	it("cyclic subtype of a union with its array", () => {
		const def = {
			a: { x: "string", "next?": "a | a[]" },
			w: { "next?": "w | w[]" }
		} as const
		const types = scope(def).export()

		attest(types.a.extends(types.w)).equals(true)
		attest(types.w.extends(types.a)).equals(false)
		attest(
			scope({ ...def, "g<t extends w>": { v: "t" }, x: "g<a>" }).export().x
				.expression
		).snap("{ v: { x: string, next?: $a | $a[] } }")
	})

	it("cyclic extends whatever the declaration order", () => {
		const shape = (self: string, rest: string) => ({
			[self]: [rest, "&", { b: "string" }],
			[rest]: { "a?": `(${self} | ${self}[])[]` }
		})
		const last: Record<string, Type> = scope({
			...shape("n0", "n1"),
			...shape("w0", "w1"),
			n3: { a: "n0" },
			w3: { a: "w0 | 'x'" }
		} as never).export() as never
		const first: Record<string, Type> = scope({
			n3: { a: "n0" },
			w3: { a: "w0 | 'x'" },
			...shape("n0", "n1"),
			...shape("w0", "w1")
		} as never).export() as never

		attest(last.n3.extends(last.w3)).equals(true)
		attest(first.n3.extends(first.w3)).equals(true)
	})

	it("relations independent of history", () => {
		const base = {
			a: "(c | boolean)[]",
			c: "(a | d)[]",
			d: { kind: "'d'", "p0?": "c | 'x'" }
		} as const
		const l = scope({
			...base,
			b: { "p1?": "a | b | 'x'", "p2?": "(c | number)[]" }
		}).export()
		const r = scope({
			...base,
			b: { "p1?": "a | b | 'x'", "p2?": "(c | null)[]" }
		}).export()

		attest(l.b.extends(r.b)).equals(false)
		attest(l.c.extends(r.c)).equals(true)
		attest(r.c.extends(l.c)).equals(true)
	})

	// https://github.com/arktypeio/arktype/issues/1237
	it("generic with cyclic alias", () => {
		const node = scope({
			node: { n: "string", kids: "Record<string, node>" }
		}).export().node

		attest(node({ n: "a", kids: { b: { n: "b", kids: {} } } })).equals({
			n: "a",
			kids: { b: { n: "b", kids: {} } }
		})
		attest(node({ n: "a", kids: { b: { n: 1, kids: {} } } }).toString()).snap(
			"kids.b.n must be a string (was a number)"
		)
	})

	it("Record referencing its own alias", () => {
		const { json } = scope({
			json: "string | number | boolean | null | json[] | Record<string, json>"
		}).export()

		type Json =
			| string
			| number
			| boolean
			| null
			| Json[]
			| { [k: string]: Json }

		attest<Json>(json.infer)
		attest(json({ a: [1, { b: null }] })).equals({ a: [1, { b: null }] })
		attest(String(json({ a: undefined }))).snap(
			"a must be a number, a string, an object, boolean or null (was undefined) or must be an array (was an object)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1237
	it("deferred cyclic generic argument", () => {
		const types = scope({
			partial: { n: "string", "kids?": "Partial<partial>" },
			omitted: { n: "string", "kids?": "Omit<omitted, 'n'>" }
		}).export()

		attest(types.partial.expression).snap(
			"{ n: string, kids?: Partial<$partial> }"
		)
		attest(types.partial({ n: "a", kids: { kids: 5 } }).toString()).snap(
			"kids.kids must be an object (was a number)"
		)
		attest(types.omitted.allows({ n: "a", kids: { n: 1, kids: {} } })).equals(
			true
		)
		attest(() =>
			scope({
				// @ts-expect-error
				a: { "kids?": "Partial<b>" },
				b: "string | a[]"
			}).export()
		).throws(writeUnsatisfiedParameterConstraintMessage("T", "object", "$b"))
	})

	it("deferred generic constraint", () => {
		const types = scope({
			a: { "y?": "g<a>" },
			"g<t extends a>": { x: "t" }
		}).export()

		attest(types.a.expression).snap("{ y?: g<$a> }")
		attest(String(types.a({ y: { x: 5 } }))).snap(
			"y.x must be an object (was a number)"
		)
		attest(() =>
			scope({
				// @ts-expect-error
				a: { "y?": "g<string>" },
				"g<t extends a>": { x: "t" }
			}).export()
		).throws(writeUnsatisfiedParameterConstraintMessage("t", "$a", "string"))
	})

	it("cyclic subtype of generic constraint", () => {
		const types = scope({
			"g<t extends base>": { v: "t" },
			base: { "n?": "base" },
			derived: { "n?": "derived", x: "string" },
			use: "g<derived>"
		}).export()

		attest(types.use.expression).snap("{ v: { x: string, n?: $derived } }")
		attest(() =>
			scope({
				// @ts-expect-error
				use: "g<other>",
				"g<t extends base>": { v: "t" },
				base: { "n?": "base" },
				other: { "n?": "other2" },
				other2: { s: "string", "o?": "other" }
			}).export()
		).throws(
			writeUnsatisfiedParameterConstraintMessage(
				"t",
				"{ n?: $base }",
				"{ n?: $other2 }"
			)
		)
	})

	// https://github.com/arktypeio/arktype/issues/1082
	it("recursive generic instantiated once", () => {
		const types = scope({
			"list<t>": { value: "t", "next?": "list<t>" },
			"alternate<a, b>": { "swap?": "alternate<b, a>", order: ["a", "b"] },
			strings: "list<string>"
		}).export()
		const alternate = types.alternate("'off'", "'on'")

		attest(
			types
				.strings({ value: "a", next: { value: "b", next: { value: 1 } } })
				.toString()
		).snap("next.next.value must be a string (was a number)")
		attest(types.alternate("'off'", "'on'") === alternate).equals(true)
		attest(alternate.expression).snap(
			'{ order: ["off", "on"], swap?: { order: ["on", "off"], swap?: alternate<"off", "on"> } }'
		)
		attest(
			alternate({
				order: ["off", "on"],
				swap: { order: ["on", "off"], swap: { order: ["on", "off"] } }
			}).toString()
		).snap(`swap.swap.order[0] must be "off" (was "on")
swap.swap.order[1] must be "on" (was "off")`)
	})

	it("generic instantiated as another in any order", () => {
		const generics = {
			"g0<p>": "g1<string>",
			"g1<p>": { "p0?": "a3", "p1?": "g1<g0<string>>" }
		} as const
		const first = scope({
			...generics,
			a3: "g0<number>"
		}).export()
		const last = scope({
			a3: "g0<number>",
			...generics
		}).export()
		const data = { p1: { p1: { p0: 1 } } }

		attest(first.a3.equals(last.a3)).equals(true)
		attest(String(first.a3(data))).snap(
			"p1.p1.p0 must be an object (was a number)"
		)
		attest(String(last.a3(data))).equals(String(first.a3(data)))
	})

	it("instantiations related in any declaration order", () => {
		const box = { "box<t>": { v: "t", "next?": "box<t>" } } as const
		const first = scope({
			...box,
			n0: [["string"], "[]"],
			n1: { "a?": "box<n0>" },
			c0: [["string", "null?"], "[]"],
			c1: { "a?": "box<c0>" }
		}).export()
		const last = scope({
			...box,
			c1: { "a?": "box<c0>" },
			c0: [["string", "null?"], "[]"],
			n1: { "a?": "box<n0>" },
			n0: [["string"], "[]"]
		}).export()

		attest(first.n1.extends(first.c1)).equals(true)
		attest(last.n1.extends(last.c1)).equals(true)
	})

	it("instantiates a private recursive generic", () => {
		const root = scope({
			"#list<t>": { value: "t", "next?": "list<t>" },
			root: "list<number>"
		}).export().root

		attest(root({ value: 0, next: { value: 1 } })).equals({
			value: 0,
			next: { value: 1 }
		})
		attest(root({ value: 0, next: { value: "1" } }).toString()).snap(
			"next.value must be a number (was a string)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1082
	it("uninstantiable recursive generic", () => {
		attest(() =>
			scope({
				"poly<t>": { v: "t", "next?": "poly<t[]>" },
				p: "poly<string>"
			}).export()
		).throws(writeUnclosedGenericCycleMessage("poly"))
		attest(() =>
			// @ts-expect-error
			scope({ "nest<t>": { nest: "nest" } }).export()
		).throwsAndHasTypeError(
			writeInvalidGenericArgCountMessage("nest", ["t"], [])
		)
	})

	it("recursive generic argument description", () => {
		attest(
			scope({
				"list<t>": { value: "t", "next?": "list<t>" },
				nested: "list<list<list<string>>>"
			}).export().nested.expression
		).snap(
			"{ value: { value: { value: string, next?: list<string> }, next?: list<{ value: string, next?: list<string> }> }, next?: list<...> }"
		)
		attest(() =>
			scope({ "g<p, q>": { "n?": "g<g<p, p>, q>" } }).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
		attest(() =>
			scope({
				"g<t>": { v: "t", "n?": "g<t>" },
				"h<u>": { "n?": "h<g<u>>" },
				x: "h<string>"
			}).export()
		).throws(writeUnclosedGenericCycleMessage("h"))
	})

	// their types hit TS2589 or TS2615, as on 2.2.7
	it("aliases instantiating a generic over themselves", () => {
		const { a }: Record<string, Type> = scope({
			a: "Record<string, a>"
		} as never).export() as never
		const list: Record<string, Type> = scope({
			"g<t>": "t[]",
			a: "g<a>"
		} as never).export() as never

		attest(a.expression).snap("{ [string]: $a }")
		attest(String(a({ x: 1 }))).snap("x must be an object (was a number)")
		attest(list.a.expression).snap("$a[]")
		attest(list.a.allows([[[]]])).equals(true)
	})

	it("generic argument doubling each level", () => {
		attest(() =>
			scope({
				"g<p>": { "a?": "g<pair<p>>" },
				"pair<t>": { l: "t", r: "t" }
			}).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
	})

	it("expansive generic deferred by constraint", () => {
		attest(() =>
			scope({ "g<p extends object>": { "n?": "g<g<p>>" } }).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
		attest(() =>
			scope({
				"g<p extends object>": { "p1?": "p", p2: "g<g<p>> | null" }
			}).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
	})

	// https://github.com/arktypeio/arktype/issues/1026
	it("filtered open definition", () => {
		attest(() =>
			scope({
				a: { v: "number", "n?": "Extract<a | string, object>" }
			}).export()
		).throws(writeUnresolvedFilterMessage("Extract"))
	})

	// https://github.com/arktypeio/arktype/issues/579
	it("rejects a shallow cycle", () => {
		// @ts-expect-error
		attest(() => scope({ a: "a" }).export()).throwsAndHasTypeError(
			writeShallowCycleErrorMessage("a", ["a"])
		)
		attest(() =>
			// @ts-expect-error
			scope({ a: "b | string", b: "a | number" }).export()
		).throwsAndHasTypeError(writeShallowCycleErrorMessage("a", ["a", "b"]))
		attest(() =>
			// @ts-expect-error
			scope({ "#a": "b", b: "c#x", c: "(a | string)" }).export()
		).throwsAndHasTypeError(writeShallowCycleErrorMessage("a", ["a", "b", "c"]))
		// @ts-expect-error
		attest(() => scope({ a: "a & string" }).export())
			.throws(writeShallowCycleErrorMessage("a", ["a", "a&string"]))
			.type.errors(writeShallowCycleErrorMessage("a", ["a"]))
		attest(() => type("this | string" as never)).throws(
			"has a shallow resolution cycle"
		)
	})

	it("structural self-reference", () => {
		const types = scope({
			nested: "(nested | number)[]",
			a: "b",
			b: { a: "a" },
			x: "y | z",
			y: "z",
			z: "y[]"
		}).export()
		const { parsed }: Record<string, Type> = scope({
			parsed: "string.json.parse |> parsed"
		}).export() as never

		attest(types.nested.expression).snap("($nested | number)[]")
		attest(types.a.expression).snap("{ a: $a }")
		attest(types.x.expression).snap("$y[]")
		attest(parsed.expression).snap("(In: string) => To<$parsed>")
	})

	it("deep invalid data through an undiscriminated union", () => {
		const a = scope({
			a: { x: "number", "n?": "a | c" },
			c: { y: "string" }
		}).export().a
		let data: object = { z: 1 }
		for (let i = 0; i < 1200; i++) data = { x: i, n: data }
		const out = a(data)

		attest(out instanceof type.errors && out.issues[0].code === "union").equals(
			true
		)
	})

	it("intersection of definitions piping into their cycle", () => {
		const { n }: Record<string, Type> = scope({
			n: { "p?": ["a", "&", "n"], "q?": "a | (string.json.parse |> a)" },
			a: { "q?": "n | (string.json.parse |> a)" }
		} as never).export() as never

		attest(n({ p: { q: "{}" }, q: '{ "q": {} }' })).equals({
			p: { q: {} },
			q: { q: {} }
		})
		attest(String(n({ p: 5 }))).snap("p must be an object (was a number)")
	})

	// https://github.com/arktypeio/arktype/issues/1476
	it("cyclic intersection keyed by operands", () => {
		const types = scope({
			a: { x: "b & a", "z?": "a & b & a" },
			b: { y: "a & b" }
		}).export()

		attest(types.a.expression).snap("{ x: $a&$b, z?: $a&$b }")
		attest(types.b.json).equals({
			domain: "object",
			required: [
				{
					key: "y",
					value: `$ark.${types.a.internal.id}&${types.b.internal.id}`
				}
			]
		})
	})

	it("cyclic intersection of a union", () => {
		const $ = scope({
			a: { p: "(b | null)[]" },
			b: "a[]",
			c: ["a", "&", { p: "b" }]
		})
		const p = $.export().c.get("p")

		attest(p.expression).snap("($a&($b | null))[]")
		attest(p.allows([null])).equals(false)
		attest($.type(p.expression.replace(/\$/g, "") as never).equals(p)).equals(
			true
		)
	})

	it("morph union of equivalent cyclic types", () => {
		const parsed = scope({
			a: { "m?": "string.numeric.parse", "p?": "a" },
			b: { "m?": "string.numeric.parse", "p?": "a | b" }
		}).export()
		const defaulted = scope({
			a: { m: "string = 'x'", "p?": "a" },
			b: { m: "string = 'x'", "p?": "a | b" }
		}).export()
		const deleted = scope({
			a: { "m?": "d", "p?": "a" },
			b: { "m?": "d", "p?": "a | b" },
			d: { "+": "delete" }
		}).export()
		const a = scope({ a: { "m?": "string.numeric.parse", "p?": "a" } }).export()
			.a
		const crossScope = scope({
			b: { "m?": "string.numeric.parse", "p?": [a, "|", "b"] }
		}).export()
		const nested = scope({
			c: "(c | string.numeric.parse | (c | string.numeric.parse)[])[]"
		}).export()

		attest(parsed.b({ m: "1", p: { m: "2" } })).equals({ m: 1, p: { m: 2 } })
		attest(defaulted.b({ p: {} })).equals({ m: "x", p: { m: "x" } })
		attest(deleted.b({ m: { x: 1 }, p: {} })).equals({ m: {}, p: {} })
		attest(crossScope.b({ p: { m: "2" } })).equals({ p: { m: 2 } })
		attest(nested.c([["1", ["2"]], "3"])).equals([[1, [2]], 3])
	})

	it("morph union disjoint cyclic prop", () => {
		const types = scope({
			d: { p0: "boolean" },
			e: { x: "string.numeric.parse", "p0?": "e" },
			c: "e | d"
		}).export()

		attest(types.c({ x: "1", p0: { x: "2" } })).equals({ x: 1, p0: { x: 2 } })
		attest(types.c({ p0: true })).equals({ p0: true })
	})

	// https://github.com/arktypeio/arktype/issues/1476
	it("exports unions whose cyclic branches intersect", () => {
		const types = scope({
			leaf: { kind: "'leaf'" },
			tt: { kind: "'and'", left: "t", right: "t" },
			tf: { kind: "'and'", left: "t", right: "f" },
			ff: { kind: "'and'", left: "f", right: "f" },
			ft: { kind: "'and'", left: "f", right: "t" },
			t: "leaf | tt | tf",
			f: "leaf | ff | ft"
		}).export()
		const leaf = { kind: "leaf" } as const
		const data = { kind: "and", left: leaf, right: leaf } as const

		attest(types.t(data)).equals(data)
		attest(types.f.allows({ ...data, right: { kind: "or" } })).equals(false)
	})
})
