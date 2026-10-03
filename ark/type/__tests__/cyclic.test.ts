import { attest, contextualize } from "@ark/attest"
import {
	writeShallowCycleErrorMessage,
	writeUnclosedGenericCycleMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { writeIndiscriminableMorphMessage } from "arksets"
import { scope, type, type Type } from "arktype"
import { writeInvalidGenericArgCountMessage } from "arktype/internal/parser/shift/operand/genericArgs.ts"

contextualize(() => {
	for (const jitless of [false, true]) {
		contextualize.each(
			jitless ? "jitless" : "jit",
			() => ({ jitless }),
			it => {
				it("rejects an object a failed branch reached", config => {
					const types = scope(
						{
							x: { v: "string", "self?": "x" },
							a: { x: "x", z: "string" },
							b: { x: "x", b: "string" },
							union: "a | b"
						},
						config
					).export()
					const data = { x: { v: "a", self: { v: 1 } }, z: "z", b: "b" }

					attest(types.union.allows(data)).equals(false)
					attest(types.union(data).toString()).snap(
						"x.self.v must be a string (was a number)"
					)
				})

				it("checks each primitive where it's reached", config => {
					const node = scope(
						{ node: { a: "node | number", "b?": "node" } },
						config
					).export().node

					attest(node.allows({ a: 5, b: 5 })).equals(false)
					attest(node({ a: 5, b: 5 }).toString()).snap(
						"b must be an object (was a number)"
					)
				})

				it("doesn't mutate its input", config => {
					const nested = scope(
						{ nested: "(nested | number)[]" },
						config
					).export().nested
					const data = [[1], [2]]

					nested(data)
					attest(data).equals([[1], [2]])
					attest(nested([[{}]]).toString()).snap(
						"value at [0][0] must be an array (was object)"
					)
				})

				it("validates a wide tree", config => {
					const tree = scope(
						{ tree: { v: "number", kids: "tree[]" } },
						config
					).export().tree
					const data = {
						v: 0,
						kids: Array.from({ length: 4000 }, (_, v) => ({ v, kids: [] }))
					}

					attest(tree(data)).equals(data)
					data.kids[3999].v = "x" as never
					attest(tree(data).toString()).snap(
						"kids[3999].v must be a number (was a string)"
					)
				})

				it("rejects an object an undiscriminated union shares", config => {
					const types = scope(
						{
							a: { kids: "union[]", "a?": "string" },
							b: { kids: "union[]", "b?": "number" },
							union: "a | b"
						},
						config
					).export()
					let data: object = { kids: [], a: 1, b: "x" }
					for (let i = 0; i < 24; i++) data = { kids: [data, data] }

					attest(types.union.allows(data)).equals(false)
					attest(types.union(data) instanceof type.errors).equals(true)
				})

				it("reports a cyclic object once", config => {
					const node = scope(
						{ node: { v: "number", "next?": "node" } },
						config
					).export().node
					const data: { v: unknown; next?: unknown } = { v: "x" }
					data.next = data

					attest(node(data).toString()).snap(
						"v must be a number (was a string)"
					)
				})

				// https://github.com/arktypeio/arktype/issues/924
				it("reports an invalid object at its shortest path", config => {
					const types = scope(
						{
							package: {
								name: "string",
								"dependencies?": "package[]",
								"contributors?": "contributor[]"
							},
							contributor: {
								email: "string.email",
								"packages?": "package[]"
							},
							tree: { id: "number", children: "tree[]" }
						},
						config
					).export()
					const shared = {
						name: "shared",
						contributors: [{ email: "david@sharktypeio" }]
					}
					const root = {
						name: "root",
						dependencies: [{ name: "a", dependencies: [shared] }, shared]
					}
					Object.assign(shared, { dependencies: [root] })

					attest(types.package(root).toString()).snap(
						'dependencies[1].contributors[0].email must be an email address (was "david@sharktypeio")'
					)

					const dag = {
						name: "dag",
						dependencies: [
							{
								name: "a",
								dependencies: [{ name: "b", dependencies: [shared] }]
							},
							{ name: "c", dependencies: [shared] }
						]
					}

					attest(types.package(dag).toString()).snap(
						'dependencies[1].dependencies[0].contributors[0].email must be an email address (was "david@sharktypeio")'
					)

					const ring = [0, 1, 2].map(id => ({
						id,
						children: [] as object[]
					}))
					for (const node of ring) node.children.push(...ring)
					ring[2].id = "x" as never

					attest(types.tree(ring[0]).toString()).snap(
						"children[2].id must be a number (was a string)"
					)
				})

				it("agrees on either side of its bounds", config => {
					const types = scope(
						{
							list: { v: "number", "next?": "list" },
							tree: { v: "number", kids: "tree[]" }
						},
						config
					).export()
					for (const length of [63, 64, 65, 66]) {
						let data: typeof types.list.infer = { v: 0 }
						const last = data
						for (let i = 1; i < length; i++) data = { v: i, next: data }

						attest(types.list(data)).equals(data)
						last.v = "x" as never
						attest(types.list(data).toString()).equals(
							`${"next.".repeat(length - 1)}v must be a number (was a string)`
						)
					}
					for (const length of [999, 1000, 1001]) {
						const kids = Array.from({ length }, (_, v) => ({ v, kids: [] }))
						const data = { v: 0, kids }

						attest(types.tree(data)).equals(data)
						kids[length - 1].v = "x" as never
						attest(types.tree(data).toString()).equals(
							`kids[${length - 1}].v must be a number (was a string)`
						)
					}
				})

				it("transforms each path within its bounds", config => {
					const node = scope(
						{
							node: {
								v: "string.numeric.parse",
								"left?": "node",
								"right?": "node"
							}
						},
						config
					).export().node
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

				it("pipes cyclic output to a cyclic type", config => {
					const $ = scope({ node: { v: "number", "next?": "node" } }, config)
					const data: { v: unknown; next?: object } = { v: 0 }
					data.next = data
					const T = $.type("unknown").pipe(() => data, $.export().node)

					attest(T(null) === data).equals(true)
					data.v = "x"
					attest(T(null).toString()).snap("v must be a number (was a string)")
				})

				// https://github.com/arktypeio/arktype/issues/1630
				it("reports a cyclic union's errors on its discriminated branch", config => {
					const api = scope(
						{
							Field: { type: "'field'", value: "string >= 1" },
							Group: { type: "'group'", parts: "Part[]" },
							Part: "Field | Group"
						},
						config
					).export()
					const Thing = type({ parts: api.Part.array() })

					attest(
						Thing({ parts: [{ type: "field", value: "" }] }).toString()
					).snap("parts[0].value must be non-empty")
					attest(api.Part({ type: "field", value: "" }).toString()).snap(
						"value must be non-empty"
					)
				})

				it("builds a morph union of definitions in progress", config => {
					const types = scope(
						{
							other: { kind: "'b'", "next?": "node | other" },
							node: {
								kind: "'a'",
								v: "string.numeric.parse",
								"next?": "node | other"
							}
						},
						config
					).export()

					attest(types.node({ kind: "a", v: "1", next: { kind: "b" } })).equals(
						{ kind: "a", v: 1, next: { kind: "b" } }
					)
				})

				// https://github.com/arktypeio/arktype/issues/924
				it("reports an object reached through a union once", config => {
					const node = scope(
						{
							node: { v: "number", "kids?": "node[]", "next?": "node | null" }
						},
						config
					).export().node
					const shared = { v: "x" }
					const self: { v: string; next?: object } = { v: "x" }
					self.next = self

					attest(node({ v: 1, kids: [shared], next: shared }).toString()).snap(
						"next.v must be a number (was a string)"
					)
					attest(node(self).toString()).snap(
						"v must be a number (was a string)"
					)
				})

				it("reports an object its component's members share once", config => {
					const user = scope(
						{
							user: { name: "string", groups: "group[]" },
							group: { title: "string", members: "user[]" }
						},
						config
					).export().user
					const shared = { title: 0, members: [] }
					const members = [
						{ name: "b", groups: [shared] },
						{ name: "c", groups: [shared] }
					]

					attest(
						user({ name: "a", groups: [{ title: "d", members }] }).toString()
					).snap(
						"groups[0].members[0].groups[0].title must be a string (was a number)"
					)
				})

				// https://github.com/arktypeio/arktype/issues/1237
				it("validates a generic of a cyclic intersection", config => {
					const node = scope(
						{
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
						},
						config
					).export().Node
					const data = {
						type: "b",
						editableA: 12,
						edits: { a: 23 },
						nodes: [{ type: "b", nodes: [] }]
					}

					attest(node.allows(data)).equals(true)
					attest(node({ ...data, nodes: [{ type: "b" }] }).toString()).snap(
						"nodes[0].nodes must be an array (was missing) or nodes[0].editableA must be a number (was missing)"
					)
				})

				// https://github.com/arktypeio/arktype/issues/944
				it("reads the input and output of a cyclic morph", config => {
					const node = scope(
						{ node: { n: "string.numeric.parse", "next?": "node" } },
						config
					).export().node

					attest(node.in({ n: "1", next: { n: "2" } })).equals({
						n: "1",
						next: { n: "2" }
					})
					attest(node.out({ n: 1, next: { n: 2 } })).equals({
						n: 1,
						next: { n: 2 }
					})
					attest(node.out({ n: 1, next: { n: "2" } }).toString()).snap(
						"next.n must be a number (was a string)"
					)
				})

				it("pipes to a cyclic type that reads ctx", config => {
					const types = scope(
						{
							node: [
								{ "next?": "node" },
								":",
								(data, ctx) => !("bad" in data) || ctx.mustBe("good")
							],
							box: { "inner?": "string.json.parse |> node" }
						},
						config
					).export()

					attest(types.box.allows({ inner: "{}" })).equals(true)
					attest(types.box({ inner: '{ "next": {} }' })).equals({
						inner: { next: {} }
					})
					attest(
						types.box({ inner: '{ "next": { "bad": 1 } }' }).toString()
					).snap('inner.next must be good (was {"bad":1})')
				})

				it("checks a default on a cyclic value once it resolves", config => {
					const types = scope(
						{
							list: {
								v: "number",
								next: "list | null = null",
								kids: ["list[]", "=", (): never[] => []]
							},
							box: { inner: ["item", "=", () => ({ v: "x" })] },
							item: { v: "string", "box?": "box" }
						},
						config
					).export()

					attest(types.list({ v: 0 })).equals({ v: 0, next: null, kids: [] })
					attest(types.box({})).equals({ inner: { v: "x" } })
					attest(() =>
						scope(
							{ list: { next: "list | null = 5" } } as never,
							config
						).export()
					).throws("Default for next must be an object or null (was a number)")
				})

				it("prefixes a cyclic pipe's union errors with its path", config => {
					const types = scope(
						{
							node: { "+": "reject", "next?": "string.json.parse |> either" },
							either: "node | leaf",
							leaf: { kind: "'leaf'" }
						},
						config
					).export()

					attest(types.node({ next: '{ "extra": 1 }' }).toString()).snap(
						'next.kind must be "leaf" (was missing) or next.extra must be removed'
					)
				})

				it("describes a missing cyclic value by its resolution", config => {
					const types = scope(
						{
							nullable: { next: "nullable | null" },
							list: { kids: "nested" },
							nested: "(nested | number)[]"
						},
						config
					).export()

					attest(types.nullable({}).toString()).snap(
						"next must be an object or null (was missing)"
					)
					attest(types.list({}).toString()).snap(
						"kids must be an array (was missing)"
					)
				})

				// https://github.com/arktypeio/arktype/issues/924
				it("reports a cyclic object reached outside an alias once", config => {
					const node = scope(
						{ node: { kind: "'node'", "next?": "node" } },
						config
					).export().node
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
				it("reads the input and output of a mutually recursive morph", config => {
					const types = scope(
						{
							a: { n: "string.numeric.parse", "b?": "b" },
							b: { "a?": "a" }
						},
						config
					).export()
					const input = { n: "1", b: { a: { n: "2" } } }

					attest(types.a.in(input)).equals(input)
					attest(types.a.out({ n: 1, b: { a: { n: 2 } } })).equals({
						n: 1,
						b: { a: { n: 2 } }
					})
					attest(types.a.out({ n: 1, b: { a: { n: "2" } } }).toString()).snap(
						"b.a.n must be a number (was a string)"
					)
				})

				it("throws a cyclic intersection's error when it's exported", config => {
					attest(() =>
						scope(
							{
								a: { "next?": "b" },
								d: { "+": "delete" },
								b: { "next?": ["a", "&", { "either?": "d | b" }] }
							},
							config
						).export()
					).throws(
						writeIndiscriminableMorphMessage(
							"{ next?: $a&{ either?: $b | {} } }",
							"{}"
						)
					)
				})

				it("accepts data valid without an assumption that failed", config => {
					const { a } = scope(
						{ a: { p0: "(r | a)[]" }, r: { "p0?": "a[] | a" } },
						config
					).export()
					const list: unknown[] = []
					const inner = { p0: list }
					list.push({ p0: [inner, {}] }, inner)
					const data = { p0: list }

					attest(a.allows(data)).equals(true)
					attest(a(data) === data).equals(true)
				})

				it("stops checking a value once it fails as never", config => {
					const types = scope(
						{
							a: { p0: { p0: "string" }, "x?": "b" },
							b: { p0: "a", "[string]": "string >= 1" }
						},
						config
					).export()
					const ab = types.b.and(types.a)

					attest(ab.allows({ p0: null })).equals(false)
					attest(ab({ p0: null }).toString()).snap("never")
				})

				it("pipes a root to itself", config => {
					const t = scope({}, config).type("string.json.parse |> this" as never)

					attest(t(JSON.stringify(JSON.stringify([1]))).toString()).snap(
						"must be a string (was an object)"
					)
					attest(t.out.allows("x")).equals(false)
				})

				// https://github.com/arktypeio/arktype/issues/944
				it("transforms a cyclic type through its aliases", config => {
					const node = scope(
						{ node: { v: "string", "next?": "node" } },
						config
					).export().node
					const strict = node.onDeepUndeclaredKey("reject")
					const described = node.configure(
						{ description: "a described node" },
						"references"
					)

					attest(
						strict({ v: "a", next: { v: "b", extra: true } }).toString()
					).snap("next.extra must be removed")
					attest(described({ v: "a", next: 5 }).toString()).snap(
						"next must be a described node (was a number)"
					)
				})
			}
		)
	}

	// https://github.com/arktypeio/arktype/issues/944
	it("references the input and output of a cyclic morph by alias", () => {
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

	it("references a component's members by alias", () => {
		const types = scope({
			a: { b: "b" },
			b: { c: "c", "a?": "a" },
			c: { a: "a" }
		}).export()

		attest(types.a.expression).snap("{ b: $b }")
		attest(types.b.expression).snap("{ c: $c, a?: $a }")
		attest(types.c.expression).snap("{ a: $a }")
	})

	it("parses a dense component in linear size", () => {
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

	it("parses a scope alike in any declaration order", () => {
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

	it("reads an alias of a closed cycle as its node", () => {
		const first = scope({
			a0: { p0: "a1" },
			a1: "a2",
			a2: "(string | a1)[]"
		}).export()
		const last = scope({
			a2: "(string | a1)[]",
			a1: "a2",
			a0: { p0: "a1" }
		}).export()

		attest(first.a0({}).toString()).snap("p0 must be an array (was missing)")
		attest(last.a0({}).toString()).snap("p0 must be an array (was missing)")
		attest(() =>
			scope({
				a0: "a2 & string",
				a1: { "p0?": "a2" },
				a2: "a1"
			} as never).export()
		).throws(
			"Intersection of object and string results in an unsatisfiable type"
		)
	})

	// https://github.com/arktypeio/arktype/issues/930
	it("distinguishes aliases of the same name in different scopes", () => {
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
			group: { members: "user[]" }
		}).export()

		attest(type.schema(types.node.json as never).equals(types.node)).equals(
			true
		)
		attest(type.schema(types.user.json as never).equals(types.user)).equals(
			true
		)
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

	it("relates cyclic types whose props are disjoint from an index", () => {
		const { b: l } = scope({
			b: { kind: "'b'", "p1?": "b | d | null", "p2?": "null" },
			d: "Record<string, d>"
		} as never).export() as never as Record<string, Type>
		const { b: r } = scope({
			b: { kind: "'b'", "p1?": "b | d | null", "p2?": "string" },
			d: "Record<string, d>"
		} as never).export() as never as Record<string, Type>

		attest(l.extends(r)).equals(false)
		attest(l.and(r).allows({ kind: "b", p1: { kind: "b" } })).equals(true)
		attest(l.and(r).allows({ kind: "b", p2: null })).equals(false)
	})

	it("relates cyclic types alike whatever was related before", () => {
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
	it("instantiates a generic with a cyclic alias", () => {
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

	// https://github.com/arktypeio/arktype/issues/1237
	it("checks a cyclic generic argument once it resolves", () => {
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
				a: { "kids?": "Partial<b>" },
				b: "string | a[]"
			} as never).export()
		).throws(writeUnsatisfiedParameterConstraintMessage("T", "object", "$b"))
	})

	it("checks a union generic argument once it resolves", () => {
		const types = scope({
			"box<t extends object | null>": { "v?": "t" },
			a: { "next?": "box<a | null>" }
		}).export()

		attest(types.a.expression).snap("{ next?: box<$a | null> }")
		attest(types.a({ next: { v: { next: { v: 1 } } } }).toString()).snap(
			"next.v.next.v must be an object or null (was a number)"
		)
	})

	// https://github.com/arktypeio/arktype/issues/1082
	it("instantiates a recursive generic once per argument set", () => {
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
		attest(alternate.expression).equals(
			`{ order: ["off", "on"], swap?: { order: ["on", "off"], swap?: ${alternate.internal.id} } }`
		)
		attest(
			alternate({
				order: ["off", "on"],
				swap: { order: ["on", "off"], swap: { order: ["on", "off"] } }
			}).toString()
		).snap(`swap.swap.order[0] must be "off" (was "on")
swap.swap.order[1] must be "on" (was "off")`)
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
	it("rejects a recursive generic that can't be instantiated", () => {
		attest(() =>
			scope({
				"poly<t>": { v: "t", "next?": "poly<t[]>" },
				p: "poly<string>"
			} as never).export()
		).throws(writeUnclosedGenericCycleMessage("poly"))
		attest(() =>
			// @ts-expect-error
			scope({ "nest<t>": { nest: "nest" } }).export()
		).throwsAndHasTypeError(
			writeInvalidGenericArgCountMessage("nest", ["t"], [])
		)
	})

	// https://github.com/arktypeio/arktype/issues/1026
	it("filters a definition in progress once it resolves", () => {
		const types = scope({
			a: { v: "number", "n?": "Extract<a | string, object>" },
			b: { "a?": "Exclude<a | string, object>" }
		}).export()

		attest(types.a.expression).snap(
			"{ v: number, n?: Extract<$a | string, object> }"
		)
		attest(types.a.allows({ v: 1, n: { v: 2 } })).equals(true)
		attest(types.a.allows({ v: 1, n: "s" })).equals(false)
		attest(types.b.allows({ a: "s" })).equals(true)
		attest(types.b.allows({ a: { v: 1 } })).equals(false)
	})

	it("references a definition in progress only as a structural value", () => {
		const types = scope({
			Field: { type: "'field'", value: "string >= 1" },
			Group: { type: "'group'", parts: "Part[]" },
			Part: "Field | Group",
			N: { s: "S" },
			S: "N"
		}).export()

		attest(types.Part({ type: "x" }).toString()).snap(
			'type must be "group" or "field" (was "x")'
		)
		attest(types.S.expression).snap("{ s: $S }")
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

	it("references itself structurally without a shallow cycle", () => {
		const types = scope({
			nested: "(nested | number)[]",
			a: "b",
			b: { a: "a" },
			x: "y | z",
			y: "z",
			z: "y[]"
		}).export()

		attest(types.nested.expression).snap("($nested | number)[]")
		attest(types.a.expression).snap("{ a: $a }")
		attest(types.x.expression).snap("$y[]")
	})

	// https://github.com/arktypeio/arktype/issues/1476
	it("keys an intersection of cyclic types by its operands", () => {
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

	it("intersects a cyclic type with a primitive", () => {
		const list = scope({ list: "string | list[]" }).export().list
		const strings = list.and("string[]")

		attest(strings.expression).snap("string[]")
		attest(strings.allows([1])).equals(false)
	})

	it("relates a cyclic branch of a morph union by its resolution", () => {
		const types = scope({
			a: { v: "a | null" },
			b: { v: "string", m: "string = 'x'" },
			u: "a | b"
		}).export()

		attest(types.u({ v: "s" })).equals({ v: "s", m: "x" })
		attest(() =>
			scope({
				a: { p: "string", d: "string = 'd'" },
				b: { kind: "'b'", p: "c | string" },
				c: "(a | b)[]"
			}).export()
		).throws(
			writeIndiscriminableMorphMessage(
				'{ kind: "b", p: $c | string }',
				'{ p: string, d: string = "d" }'
			)
		)
	})

	it("unions a morph with a branch disjoint from its cyclic prop", () => {
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
