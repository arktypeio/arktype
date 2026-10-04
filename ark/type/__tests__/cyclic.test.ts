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
				it("object reached by failed branch", config => {
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

				it("object shared by undiscriminated union", config => {
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

					const path = "kids[0].".repeat(24)

					attest(types.union.allows(data)).equals(false)
					attest(types.union(data).toString()).equals(
						`${path}a must be a string (was a number) or ${path}b must be a number (was a string)`
					)
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

				it("cyclic object once through a parsed alias", config => {
					const data: { v?: unknown; next?: unknown } = {}
					data.next = data
					const types = scope(
						{
							node: { "next?": "node", v: "number" },
							thunk: (): unknown => types.type("node" as never)
						} as never,
						config
					)
					const { thunk }: Record<string, Type> = types.export() as never
					const generics = scope(
						{ "g<p>": "(p | g<p>)[]", a1: "g<string>" } as never,
						config
					)
					generics.export()
					const list: unknown[] = []
					list.push(list, 5)

					attest(String(types.type("node" as never)(data))).snap(
						"v must be a number (was missing)"
					)
					attest(String(thunk(data))).snap("v must be a number (was missing)")
					attest(String(generics.type("g<string>" as never)(list))).snap(
						"value at [1] must be a string or an object (was a number)"
					)
				})

				it("cyclic object once through an equivalent root", config => {
					const { node } = scope(
						{ node: { "next?": "node", v: "number" } },
						config
					).export()
					const data: { v?: unknown; next?: unknown } = {}
					data.next = data
					const { u }: Record<string, Type> = scope(
						{
							n0: { v: "number", "e0?": "n0[]" },
							n1: { v: "number", "e0?": "n0[]" },
							u: "n0 | n1"
						} as never,
						config
					).export() as never
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

				// https://github.com/arktypeio/arktype/issues/924
				it("invalid object at shortest path", config => {
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

				it("cyclic graph at shortest path", config => {
					const node = scope(
						{ node: { v: "number", "e0?": "node[]" } },
						config
					).export().node
					const graph = Array.from(
						{ length: 9 },
						(_, v): typeof node.infer => ({ v })
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

					attest(node(graph[0]).toString()).snap(
						"e0[0].e0[1].e0[0].e0[1].v must be a number (was a string)"
					)

					const dag = Array.from(
						{ length: 400 },
						(_, v): typeof node.infer => ({ v })
					)
					for (let i = 0; i < dag.length; i++)
						dag[i].e0 = dag.slice(i + 1, i + 3)
					dag[399].v = "x" as never

					attest(node(dag[0]).toString()).equals(
						`e0[0].${"e0[1].".repeat(199)}v must be a number (was a string)`
					)
				})

				it("depth and width bounds", config => {
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

				it("cyclic output to cyclic type", config => {
					const $ = scope({ node: { v: "number", "next?": "node" } }, config)
					const data: { v: unknown; next?: object } = { v: 0 }
					data.next = data
					const T = $.type("unknown").pipe(() => data, $.export().node)

					attest(T(null) === data).equals(true)
					data.v = "x"
					attest(T(null).toString()).snap("v must be a number (was a string)")
				})

				// https://github.com/arktypeio/arktype/issues/1630
				it("cyclic union discriminated branch errors", config => {
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

				it("morph union of open definitions", config => {
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
				it("object through union reported once", config => {
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

				it("shared component object reported once", config => {
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
				it("generic of cyclic intersection", config => {
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
				it("cyclic morph in and out", config => {
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

				it("pipe to contextual cyclic type", config => {
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

				it("cyclic default", config => {
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

				it("default completed by its own default", config => {
					const { a }: Record<string, Type> = scope(
						{
							"g<t extends object>": [
								"t",
								"&",
								{ p1: ["string[]", "=", () => []] }
							],
							a: { "p1?": "g<a>" }
						} as never,
						config
					).export() as never

					attest(a.allows({ p1: {} })).equals(true)
					attest(a({ p1: {} })).equals({ p1: { p1: [] } })
					attest(a({ p1: { p1: [] } })).equals({
						p1: { p1: Object.assign([], { p1: [] }) }
					})
				})

				it("cyclic pipe union error paths", config => {
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

				it("missing cyclic value description", config => {
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
				it("cyclic object outside alias", config => {
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

				it("doubly reached cyclic object", config => {
					const { a } = scope(
						{ a: { v: { p0: "string[] | null", "p1?": "a" } } },
						config
					).export()
					const shared: { p0: unknown; p1?: object } = { p0: true }
					shared.p1 = { v: shared }

					attest(String(a({ v: shared } as never))).snap(
						"v.p0 must be an object or null (was boolean)"
					)

					const { list }: Record<string, Type> = scope(
						{
							"g<q>": { p0: "string[] | null", "p1?": "q" },
							list: "g<list>[]"
						} as never,
						config
					).export() as never
					const element: { p0: unknown; p1?: object[] } = { p0: true }
					element.p1 = [element]

					attest(String(list([element]))).snap(
						"value at [0].p0 must be an object or null (was boolean)"
					)
				})

				it("cyclic object reached by instantiation", config => {
					const { a }: Record<string, Type> = scope(
						{
							"g<p>": { kind: "'g'", "p0?": "g<a>", p2: "g<p> | null" },
							a: "g<string>"
						} as never,
						config
					).export() as never
					const data: { p2?: object } = {}
					data.p2 = data

					attest(String(a(data))).snap('kind must be "g" (was missing)')

					const defs = {
						"g<p>": { "p0?": "g<p> | null", p1: "Record<string, p>" },
						a: "g<b>",
						b: { "p0?": "null | a" }
					}
					const reversed = Object.fromEntries(Object.entries(defs).reverse())
					const shared = { p0: null, p1: {} as Record<string, object> }
					const invalid = { p0: shared, p1: { zz: "x" } }
					shared.p1.r = { p0: invalid }

					for (const def of [defs, reversed]) {
						const types: Record<string, Type> = scope(
							def as never,
							config
						).export() as never
						attest(String(types.a(invalid))).snap(
							"p1.zz must be an object (was a string)"
						)
					}
				})

				// https://github.com/arktypeio/arktype/issues/944
				it("mutually recursive morph in and out", config => {
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

				it("cyclic pipe to union alias out", config => {
					const types = scope(
						{
							a: { "n?": "null | (string.json.parse |> b)" },
							b: "null | a"
						},
						config
					).export()
					const out = types.a({ n: '{ "n": null }' })

					attest(out).equals({ n: { n: null } })
					attest(types.a.out.expression).snap("{ n?: Out<$b> | null }")
					attest(types.a.out.allows(out)).equals(true)
					attest(types.a.out({ n: { n: "{}" } }).toString()).snap(
						"n.n must be an object or null (was a string)"
					)
				})

				it("union pipe to cyclic alias out", config => {
					const types = scope(
						{
							a0: { p2: "a3" },
							a1: { p0: "string.numeric.parse", "p1?": "a0" },
							a3: { x: "(string.json.parse |> a4) | null" },
							a4: { "p1?": "a1" }
						},
						config
					).export()
					const out = types.a0({ p2: { x: '{ "p1": { "p0": "7" } }' } })

					attest(out).equals({ p2: { x: { p1: { p0: 7 } } } })
					attest(types.a0.out(out)).equals(out)
					attest(
						types.a0.out({ p2: { x: { p1: { p0: "7" } } } }).toString()
					).snap("p2.x.p1.p0 must be a number (was a string)")
				})

				it("cyclic morph union after in", config => {
					const types = () =>
						scope(
							{
								a1: { "p0?": "a4" },
								a3: ["a1", "|", { p0: ["number", "=>", (n: number) => n * 2] }],
								a4: { "p0?": "a3 | null" }
							},
							config
						).export()
					const read = types()
					const validated = types()

					attest(read.a3.in.expression).snap(
						"{ p0?: In<$a4> } | { p0: number }"
					)
					attest(read.a3({ p0: 1 })).equals({ p0: 2 })
					attest(read.a4({ p0: { p0: 1 } })).equals({ p0: { p0: 2 } })
					attest(validated.a3({ p0: 1 })).equals({ p0: 2 })
					attest(validated.a3.in.expression).equals(read.a3.in.expression)
				})

				it("cyclic intersection error on export", config => {
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

				it("valid without failed assumption", config => {
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

				it("nested union branch messages", config => {
					const types = scope(
						{
							a2: { p1: "string" },
							a3: "string[] | a4",
							a4: { p0: "(a2 | a3)[]" }
						},
						config
					).export()

					attest(types.a3({ p0: [{ p0: [null] }] }).toString()).snap(
						"p0[0].p0[0] must be an object or an array (was null), p0[0].p1 must be a string (was missing), p0[0] must be an array (was object) or must be an array (was object)"
					)
				})

				it("recursive union index message", config => {
					const { c } = scope(
						{
							c: { kind: "'c'", "p2?": "b" },
							r: { "[string]": "c" },
							b: "r | c"
						},
						config
					).export()
					const data = {
						kind: "c",
						p2: { kind: "c", p2: { kind: "c", p2: { kind: 0 } } }
					}

					attest(c(data).toString()).snap(
						'p2.kind must be an object (was a string), p2.p2.kind must be an object (was a string) or p2.p2.p2.kind must be an object or "c" (was 0)'
					)
				})

				it("stops at never failure", config => {
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
				it("cyclic transform through aliases", config => {
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

				it("deep config through shared cyclic nodes", config => {
					const chain = scope(
						{
							a: { "p?": "c" },
							c: { q: "b" },
							b: { "r?": "d" },
							d: { q: "b", "s?": "a" }
						},
						config
					).export()
					const { pair }: Record<string, Type> = scope(
						{
							node: { v: "number", "next?": "node" },
							pair: ["node", "&", { w: "string" }]
						} as never,
						config
					).export() as never
					const { a0 }: Record<string, Type> = scope(
						{
							a1: "a1[]",
							a3: { "p1?": "a1" },
							a0: [
								"a3",
								"&",
								{ "p1?": { "p0?": "string" }, "p2?": { "p0?": "a1" } }
							]
						} as never,
						config
					).export() as never
					const { x }: Record<string, Type> = scope(
						{
							a: { p0: ["number", "...", "a[]"] },
							x: ["a", "&", { p0: "Record<string, number>" }]
						} as never,
						config
					).export() as never
					const tagged = scope(
						{
							a: { kind: "'a'", "n?": "b" },
							b: { kind: "'b'", "n?": "a" },
							u: "a | b"
						},
						config
					).export()
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

				it("deep config of a disjoint cyclic morph union", config => {
					const { a0 }: Record<string, Type> = scope(
						{
							a0: "Record<string, a1 | a2>",
							a1: { p0: "string = 'd'", "p1?": "string" },
							a2: { kind: "'a2'", "p0?": "a0", p1: "a2 | null" }
						} as never,
						config
					).export() as never

					attest(
						a0.configure({ description: "x" }, "references")({ k: { p1: "s" } })
					).equals({ k: { p0: "d", p1: "s" } })
					attest(
						a0.onDeepUndeclaredKey("delete")({ k: { p1: "s", z: 1 } })
					).equals({ k: { p0: "d", p1: "s" } })
				})

				it("deep config of a cyclic default", config => {
					const { list }: Record<string, Type> = scope(
						{ list: { p: ["list[]", "=", () => []] } } as never,
						config
					).export() as never
					const { node }: Record<string, Type> = scope(
						{ node: { p: ["node | null", "=", null] } } as never,
						config
					).export() as never

					attest(list.onDeepUndeclaredKey("reject")({})).equals({ p: [] })
					attest(list.configure({ description: "x" }, "references")({})).equals(
						{ p: [] }
					)
					attest(node.onDeepUndeclaredKey("reject")({})).equals({ p: null })
				})

				it("cyclic output closes at entry", config => {
					const $ = scope(
						{
							node: { kind: "'n'", v: "string.trim", "next?": "node" },
							leaf: { kind: "'l'" },
							tree: "node | leaf"
						},
						config
					)
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

				it("transforms a default through an alias", config => {
					const types = scope(
						{
							a: { "b?": "b" },
							b: { v: "string.trim", "a?": "a" },
							holder: { a: ["a", "=", () => ({ b: { v: " d " } })] },
							tuple: [["a", "=", () => ({ b: { v: " e " } })]]
						},
						config
					).export()

					attest(types.holder({})).equals({ a: { b: { v: "d" } } })
					attest(types.tuple([])).equals([{ b: { v: "e" } }])
				})

				it("submodule generic via own generic", config => {
					const sub = scope({ "g<p>": "(p | g<p>)[]" }, config).export()
					const {
						a
					}: Record<string, Type<unknown[]>> = scope(
						{ sub, "h<q>": "sub.g<h<q>>", a: "h<string>" } as never,
						config
					).export() as never

					attest(a.expression).snap("(g<h<string>> | h<string>)[]")
					attest(a([[], [[]]])).equals([[], [[]]])
					attest(a([[1]]).toString()).snap(
						"value at [0][0] must be an array (was number)"
					)
				})
			}
		)
	}

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

	it("disjoint cyclic morph union", () => {
		const def = {
			a0: { p0: "string" },
			a1: "a2",
			a2: { p0: "a1", "p1?": "string.numeric.parse", "p2?": "a3" },
			a3: "a0 | a2"
		} as const
		const types = scope(def).export()
		const reordered = scope({
			a3: def.a3,
			a2: def.a2,
			a1: def.a1,
			a0: def.a0
		}).export()

		attest(reordered.a3.expression).equals(types.a3.expression)
		attest(reordered.a3({ p0: "s" })).equals({ p0: "s" })
	})

	it("indiscriminable cyclic morph union", () => {
		const pipe = { "p0?": "string.json.parse |> a2" } as const
		const message = writeIndiscriminableMorphMessage("{}", "{ p0?: $b }")

		attest(() =>
			scope({ a0: {}, b: pipe, a2: ["a0", "|", { "p0?": "b" }] }).export()
		).throws(message)
		attest(() =>
			scope({ a2: ["a0", "|", { "p0?": "b" }], b: pipe, a0: {} }).export()
		).throws(message)
		attest(() =>
			scope({
				"g<t extends string>": pipe,
				a2: ["a0", "|", { "p0?": "g<string>" }],
				a0: {}
			}).export()
		).throws(writeIndiscriminableMorphMessage("{}", "{ p0?: g<string> }"))
	})

	it("unassignable default in cyclic intersection", () => {
		attest(() =>
			scope({
				a2: ["a4", "&", { "p0?": { p0: ["null", "=", null] } }],
				a4: { "p0?": "a2" }
			}).export()
		).throws("Default for never")
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
				i1: [{ p2: ["a1", "=", null] }, "|", "a1"],
				a1: { "p0?": "null | i1", "p2?": "null" }
			} as never).export()
		).throws("Default for p2 must be an object (was null)")
		attest(() =>
			scope({
				"g0<p0>": "(p0 | g0<a0>)[]",
				a0: ["g0<string[]>", "...", "a1[]"],
				a1: { p1: ["string", "=", "d"] }
			} as never).export()
		).throws(writeIndiscriminableMorphMessage("string[]", "($a0 | g0<$a0>)[]"))
	})

	it("describes a cyclic union", () => {
		const types = scope({
			a: { kind: "'a'", "n?": "b" },
			b: { kind: "'b'", "n?": "a" },
			u: "a | b",
			list: "list[] | string"
		}).export()
		const described = types.u.describe("x")
		const self = type({ v: "string", "n?": "this" }).or("null")

		attest(described.expression).equals(types.u.expression)
		attest(described.description).equals("x")
		attest(types.list.describe("x").description).equals("x")
		attest(self.describe("x").description).equals("x")
		attest(types.u.select({ boundary: "shallow" }).length).equals(10)
	})

	it("closed cycle alias", () => {
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
			group: { members: "user[]" }
		}).export()

		attest(type.schema(types.node.json as never).equals(types.node)).equals(
			true
		)
		attest(type.schema(types.user.json as never).equals(types.user)).equals(
			true
		)
	})

	it("cyclic pipe JSON Schema reference", () => {
		const { a } = scope({ a: { "n?": "string.json.parse |> a" } }).export()

		const { $ref, $defs } = a.toJsonSchema({
			fallback: { morph: ctx => ctx.base }
		}) as { $ref: string; $defs: Record<string, any> }
		const definitionOf = (ref: string) => $defs[ref.slice("#/$defs/".length)]

		attest(definitionOf($ref).type).equals("object")
		attest(definitionOf(definitionOf($ref).properties.n.$ref)).equals({
			type: "string"
		})
	})

	it("non-empty cyclic array json", () => {
		const { a } = scope({
			a: { "p?": ["b", "...", "b[]"] },
			b: { "n?": "b" }
		}).export()

		attest(type.schema(a.json as never).equals(a)).equals(true)
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

	it("cyclic union with subsumed branch", () => {
		const { u }: Record<string, Type> = scope({
			g: { "p0?": "g" },
			u: ["g", "|", { "p0?": "g", "p1?": "string" }]
		} as never).export() as never

		attest(u.or(u).expression).snap("{ p0?: $g }")
		attest(u.extends(u.or(u))).equals(true)
		attest(u.equals(u.or(u))).equals(true)

		const { b }: Record<string, Type> = scope({
			a: { "p0?": "a", "p1?": "a | string", "[/^k\\d$/]": "string" },
			b: "d | c",
			c: { "p0?": "b | number > 0" },
			d: "c | a | string"
		} as never).export() as never

		attest(b.or(b).equals(b)).equals(true)
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
				a: { "kids?": "Partial<b>" },
				b: "string | a[]"
			} as never).export()
		).throws(writeUnsatisfiedParameterConstraintMessage("T", "object", "$b"))
	})

	it("deferred generic constraint", () => {
		const types: Record<string, Type> = scope({
			a: { "y?": "g<a>" },
			"g<t extends a>": { x: "t" }
		} as never).export() as never

		attest(types.a.expression).snap("{ y?: g<$a> }")
		attest(String(types.a({ y: { x: 5 } }))).snap(
			"y.x must be an object (was a number)"
		)
		attest(() =>
			scope({
				a: { "y?": "g<string>" },
				"g<t extends a>": { x: "t" }
			} as never).export()
		).throws(writeUnsatisfiedParameterConstraintMessage("t", "$a", "string"))
	})

	it("generic referenced by own constraint", () => {
		const types: Record<string, Type> = scope({
			"g<t extends a>": { x: "t" },
			a: { "y?": "g<a>" }
		} as never).export() as never

		attest(types.a.expression).snap("{ y?: g<$a> }")

		const { node }: Record<string, Type> = scope({
			"tree<t extends node>": { value: "t", children: "tree<t>[]" },
			node: { id: "string", "parent?": "tree<node>" }
		} as never).export() as never

		attest(
			String(node({ id: "a", parent: { value: { id: 1 }, children: [] } }))
		).snap("parent.value.id must be a string (was a number)")
	})

	it("cyclic subtype of generic constraint", () => {
		const types: Record<string, Type> = scope({
			"g<t extends base>": { v: "t" },
			base: { "n?": "base" },
			derived: { "n?": "derived", x: "string" },
			use: "g<derived>"
		} as never).export() as never

		attest(types.use.expression).snap("{ v: { x: string, n?: $derived } }")
		attest(() =>
			scope({
				use: "g<other>",
				"g<t extends base>": { v: "t" },
				base: { "n?": "base" },
				other: { "n?": "other2" },
				other2: { s: "string", "o?": "other" }
			} as never).export()
		).throws(
			writeUnsatisfiedParameterConstraintMessage(
				"t",
				"{ n?: $base }",
				"{ n?: $other2 }"
			)
		)
	})

	it("deferred union generic argument", () => {
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

	it("recursive generic with recursive default", () => {
		const types = scope({
			"g<p, q>": {
				p0: ["g<q, p> | null", "=", null],
				"p1?": "g<null | q, null | p>",
				"c0?": "g<x0, q>",
				"c1?": "g<x1, q>",
				"c2?": "g<x2, q>"
			},
			x0: {},
			x1: {},
			x2: {}
		}).export()
		const g = types.g("string", "number")

		attest(g({})).equals({ p0: null })
		attest(g({ p0: { p0: 5 } }).toString()).snap(
			"p0.p0 must be an object or null (was a number)"
		)
	})

	it("union of recursive generic instantiations", () => {
		const types: Record<string, Type> = scope({
			"g1<p1, q1>": ["p1", "g2<p1, null, q1>?"],
			"g2<p2, q2, r2>": "(p2 | g1<r2[], q2[]>)[]",
			a0: "g1<a0[], a0> | g2<string, string, string>"
		} as never).export() as never

		attest(types.a0.allows([[]])).equals(true)
		attest(types.a0.allows(["x", [["y"]]])).equals(true)
		attest(types.a0.allows([1])).equals(false)
	})

	it("generic instantiated as another in any order", () => {
		const generics = {
			"g0<p>": "g1<string>",
			"g1<p>": { "p0?": "a3", "p1?": "g1<g0<string>>" }
		} as const
		const first: Record<string, Type> = scope({
			...generics,
			a3: "g0<number>"
		} as never).export() as never
		const last: Record<string, Type> = scope({
			a3: "g0<number>",
			...generics
		} as never).export() as never
		const data = { p1: { p1: { p0: 1 } } }

		attest(first.a3.equals(last.a3)).equals(true)
		attest(String(first.a3(data))).snap(
			"p1.p1.p0 must be an object (was a number)"
		)
		attest(String(last.a3(data))).equals(String(first.a3(data)))
	})

	it("closes a recursive generic's instantiations", () => {
		const types = scope({
			"p<w, x, y, z>": { v: "w", "r?": "p<x, y, z, w>", "s?": "p<x, w, y, z>" },
			"g<t>": { "next?": "g<Record<string, a>>" },
			a: { "n?": "a" },
			permuted: "p<'0', '1', '2', '3'>",
			nested: "g<1>"
		}).export()

		attest(types.permuted({ v: "0", s: { v: "1", r: { v: "0" } } })).equals({
			v: "0",
			s: { v: "1", r: { v: "0" } }
		})
		attest(types.permuted({ v: "0", r: { s: { v: "1" } } }).toString()).snap(
			'r.v must be "1" (was missing)\nr.s.v must be "2" (was "1")'
		)
		attest(types.nested.expression).snap(
			"{ next?: { next?: g<{ [string]: { n?: $a } }> } }"
		)
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
			} as never).export()
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
			scope({ "g<p, q>": { "n?": "g<g<p, p>, q>" } } as never).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
		attest(() =>
			scope({
				"g<t>": { v: "t", "n?": "g<t>" },
				"h<u>": { "n?": "h<g<u>>" },
				x: "h<string>"
			} as never).export()
		).throws(writeUnclosedGenericCycleMessage("h"))
	})

	it("generic argument doubling each level", () => {
		attest(() =>
			scope({
				"g<p>": { "a?": "g<pair<p>>" },
				"pair<t>": { l: "t", r: "t" }
			} as never).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
	})

	it("expansive generic deferred by constraint", () => {
		attest(() =>
			scope({ "g<p extends object>": { "n?": "g<g<p>>" } } as never).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
		attest(() =>
			scope({
				"g<p extends object>": { "p1?": "p", p2: "g<g<p>> | null" }
			} as never).export()
		).throws(writeUnclosedGenericCycleMessage("g"))
	})

	// https://github.com/arktypeio/arktype/issues/1026
	it("filtered open definition", () => {
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

	it("structural reference in progress", () => {
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

	it("thunk of open definition transforms", () => {
		const $ = scope({
			a: { v: "string.numeric.parse", "w?": "w" },
			w: (): type.Any => type({ x: $.type("a | null") })
		})
		const types = $.export()

		attest(types.w({ x: { v: "1" } })).equals({ x: { v: 1 } })
		attest(types.a({ v: "1", w: { x: { v: "2" } } })).equals({
			v: 1,
			w: { x: { v: 2 } }
		})
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

	it("pipes a composite morph into its own alias", () => {
		const modules: Record<string, Type>[] = [
			scope({
				m: ["string", "=>", (s: string) => s.length],
				x: "(m |> x) | number"
			}).export() as never,
			scope({
				m: type("string.trim"),
				x: "(m |> x) | number"
			}).export() as never,
			scope({
				m: { a: "string.trim" },
				x: "(m |> x) | number"
			}).export() as never,
			scope({
				m: "string.trim | null",
				x: "(m |> x) | number"
			}).export() as never,
			scope({ m: "string.trim[]", x: "(m |> x) | number" }).export() as never
		]
		const expressions = modules.map(types => types.x.expression)

		attest(expressions).snap([
			"number | (In: string) => To<$x>",
			"number | (In: string) => To<$x>",
			"number | (In: { a: string }) => To<$x>",
			"number | (In: string) => To<$x> | (In: null) => To<$x>",
			"number | (In: string[]) => To<$x>"
		])
	})

	it("union prop intersected through its own alias", () => {
		const { a } = scope({
			a: { p: "string | a", "q?": ["a", "&", { p: "string" }] }
		}).export()
		const { b }: Record<string, Type> = scope({
			a: { p: "string | b" },
			b: ["a", "&", { p: "b[]" }]
		} as never).export() as never
		const self = type({
			p: "string | this",
			"q?": ["this", "&", { p: "string" }]
		})

		attest(a({ p: "x", q: { p: "y" } })).equals({ p: "x", q: { p: "y" } })
		attest(a({ p: "x", q: { p: { p: "z" } } }).toString()).snap(
			"q.p must be a string (was an object)"
		)
		attest(b.allows({ p: "x" })).equals(false)
		attest(self({ p: "x", q: { p: 1 } }).toString()).snap(
			"q.p must be a string (was a number)"
		)
	})

	it("intersection cycle in any declaration order", () => {
		const first: Record<string, Type> = scope({
			a0: ["a2", "&", { "p0?": "a0 | null" }],
			a2: { "p0?": ["a0 | null"] }
		} as never).export() as never
		const last: Record<string, Type> = scope({
			a2: { "p0?": ["a0 | null"] },
			a0: ["a2", "&", { "p0?": "a0 | null" }]
		} as never).export() as never
		const data = { p0: [{ p0: [null] }] }

		attest(first.a0(data)).equals(data)
		attest(last.a0(data)).equals(data)
		attest(last.a0.expression).equals(first.a0.expression)
		attest(() =>
			scope({
				"g1<p1, q1>": ["p1", "|", { "p0?": "g1<q1, p1>" }],
				a1: { "p0?": "string", p1: ["string", "=", "d"] },
				a2: "g1<string, number>",
				zp: "g1<a2, a1>"
			} as never).export()
		).throws(
			"An unordered union of a type including a morph and a type with overlapping input is indeterminate"
		)
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

	it("cyclic type and primitive", () => {
		const list = scope({ list: "string | list[]" }).export().list
		const strings = list.and("string[]")

		attest(strings.expression).snap("string[]")
		attest(strings.allows([1])).equals(false)
	})

	it("morph union cyclic branch", () => {
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
