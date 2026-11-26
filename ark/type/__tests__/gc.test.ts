import { attest, contextualize } from "@ark/attest"
import { $ark, rootSchema } from "@ark/schema"
import { firstIssue, match, scope, type, type Scope, type Type } from "arktype"
import { setFlagsFromString } from "node:v8"
import { runInNewContext } from "node:vm"

setFlagsFromString("--expose-gc")
const gc: () => void = runInNewContext("gc")

const nextJob = () => new Promise(resolve => setTimeout(resolve, 0))

// WeakRef targets live until their job ends, and finalizers run between jobs
const collect = async () => {
	await nextJob()
	gc()
	await nextJob()
}

// a closure V8 is still optimizing can keep a type alive past a collection
const collectTarget = async (ref: WeakRef<object>) => {
	for (let i = 0; i < 10 && ref.deref(); i++) await collect()
}

// what a Type captures is collected when the Type is
const capture = (create: (captured: object) => unknown) => {
	const captured = {}
	create(captured)
	return new WeakRef(captured)
}

contextualize(() => {
	it("collects unreferenced types, scopes and schemas", async () => {
		// created outside this async function, whose suspended frame can hold
		// the last value it created
		const create = (): Record<string, WeakRef<object>> => ({
			type: new WeakRef(type({ collected: "string", n: "number > 5" })),
			exported: new WeakRef(
				scope({
					a: { collectedDefault: "string = 'gc'" },
					b: ["string", "number = 1234"]
				}).export().a
			),
			scope: new WeakRef(scope({ a: { collected: "string" } })),
			schema: new WeakRef(
				rootSchema({
					domain: "object",
					required: [{ key: "collectedSchema", value: "string" }]
				})
			)
		})
		const refs = create()
		for (const ref of Object.values(refs)) await collectTarget(ref)
		attest(Object.keys(refs).filter(k => refs[k].deref())).equals([])
		const T = type({ collected: "string", n: "number > 5" })
		attest(T({ collected: "a", n: 6 })).equals({ collected: "a", n: 6 })
		attest(T({ collected: "a", n: 5 }).toString()).snap("n must be more than 5")
	})

	// https://github.com/arktypeio/arktype/issues/1676
	it("values captured by functions", async () => {
		const refs: Record<string, WeakRef<object>> = {
			narrow: capture(captured => type("number").narrow(() => !!captured)(1)),
			pipe: capture(captured => type("number").pipe(n => captured && n)(1)),
			default: capture(captured =>
				type({ a: ["object", "=", () => captured] })({})
			),
			tupleDefault: capture(captured =>
				type(["string", ["object", "=", () => captured]])(["a"])
			),
			match: capture(captured =>
				match({ number: () => captured, default: "assert" })(1)
			),
			message: capture(captured =>
				type("string | number").configure({ message: () => `${captured}` })(
					true
				)
			)
		}
		for (const ref of Object.values(refs)) await collectTarget(ref)
		attest(Object.keys(refs).filter(k => refs[k].deref())).equals([])
	})

	it("symbols a type's meta is keyed by or holds", async () => {
		const create = (): Record<string, WeakRef<object>> => {
			const key = Symbol("gcMetaKey")
			const held = Symbol("gcMetaValue")
			type("string").configure({ [key]: true, held } as never)
			return {
				key: new WeakRef(key as never),
				held: new WeakRef(held as never)
			}
		}
		const refs = create()
		// V8 holds the one symbol a read was keyed by until it's keyed by another
		create()
		for (const ref of Object.values(refs)) await collectTarget(ref)
		attest(Object.keys(refs).filter(k => refs[k].deref())).equals([])
	})

	it("values captured by a type compiled with one it references", async () => {
		const Inner = type({ inner: "string" })
		const capture = () => {
			const captured = {}
			type({ a: Inner, b: ["object", "=", () => captured] })({
				a: { inner: "" }
			})
			return new WeakRef(captured)
		}
		const ref = capture()
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
		attest(Inner({ inner: 5 }).toString()).snap("inner must be a string")
	})

	// https://github.com/arktypeio/arktype/issues/1773
	it("values captured by cyclic types", async () => {
		const refs: Record<string, WeakRef<object>> = {
			this: capture(captured =>
				type({
					value: ["object", "=", () => captured],
					"children?": "this[]"
				})({ children: [{}] })
			),
			thisUnion: capture(captured =>
				type({
					value: ["object", "=", () => captured],
					"next?": "this | null"
				})({ next: { next: null } })
			),
			scope: capture(captured =>
				scope({
					node: { value: ["object", "=", () => captured], "next?": "node" }
				})
					.export()
					.node({ next: {} })
			),
			mutual: capture(captured =>
				scope({
					a: { value: ["object", "=", () => captured], "b?": "b" },
					b: { "a?": "a | null" }
				})
					.export()
					.a({ b: { a: null } })
			),
			// b is registered as a copy of never, which outlives it
			keyword: capture(captured =>
				scope({
					a: { value: ["object", "=", () => captured], "b?": "b" },
					b: "a & never"
				})
					.export()
					.a({})
			)
		}
		for (const ref of Object.values(refs)) await collectTarget(ref)
		attest(Object.keys(refs).filter(k => refs[k].deref())).equals([])
	})

	it("referenced this-cyclic root", async () => {
		let Root: type.Any | null = type({ name: "string", "next?": "this" })
		const Extended = Root.and({ "id?": "number" })
		Root = null
		await collect()
		attest(
			Extended({ name: "a", next: { name: "b", next: { name: 1 } } }).toString()
		).snap("next.next.name must be a string")
	})

	it("referenced this-cyclic root of a scope yet to export", async () => {
		// its aliases resolve each time they're read
		const $ = scope({})
		let Root: type.Any | null = $.type({ name: "string", "next?": "this" })
		const Extended = Root.and({ "id?": "number" })
		Root = null
		await collect()
		attest(
			Extended({ name: "a", next: { name: "b", next: { name: 1 } } }).toString()
		).snap("next.next.name must be a string")
	})

	it("root whose own alias was dropped", async () => {
		const Node = type({ "next?": "this" })
		// never & an alias is never, so no alias holds the id it registered
		const Root = type({ "self?": "this & never", "node?": Node })
		attest(Root({ node: { next: {} } })).equals({ node: { next: {} } })
		await collect()
		attest(Root.internal.tfsById).equals(true)
	})

	it("json of a dropped cyclic type", async () => {
		const create = () => type({ name: "string", "next?": "this" }).json
		const json = create()
		await collect()
		attest(
			String(type.schema(json as never)({ name: "a", next: { name: 1 } }))
		).snap("next.name must be a string")
	})

	it("values captured by definitions that throw", async () => {
		const value = (captured: object) => ["object", "=", () => captured] as const
		const cases: Record<string, (captured: object) => unknown> = {
			this: captured =>
				type({
					value: value(captured),
					"next?": "this",
					// @ts-expect-error
					bad: "nope"
				}),
			export: captured =>
				scope({
					a: { value: value(captured), "b?": "b" },
					// @ts-expect-error
					b: { "a?": "a", bad: "nope" }
				}).export(),
			reference: captured =>
				scope({
					a: { value: value(captured), "b?": "b" },
					// @ts-expect-error
					b: { "a?": "a", bad: "nope" }
				}).type("a[]"),
			// b closes with a, which throws once b is parsed
			member: captured =>
				scope({
					// @ts-expect-error
					a: { "b?": "b", bad: "nope" },
					b: { value: value(captured), "a?": "a" }
				}).export(),
			// a is cached as a union of an alias until b resolves
			pending: captured =>
				scope({
					a: "b | string",
					b: { value: value(captured), "a?": "a" }
				}).type({
					b: "b",
					// @ts-expect-error
					bad: "nope"
				}),
			check: captured =>
				scope({
					a: { value: value(captured), "b?": "b" },
					b: "a & string"
				}).export(),
			// a resolves as its cycle closes, having parsed
			resolution: captured =>
				scope({
					a: "b & string",
					b: { value: value(captured), "a?": "a" }
				}).export(),
			cycle: captured =>
				scope({
					// @ts-expect-error
					a: "b",
					// @ts-expect-error
					b: "a",
					c: { value: value(captured) }
				}).export(),
			thunk: captured =>
				scope({
					a: { value: value(captured), "b?": "b" },
					b: () => {
						throw new Error("thrown by a thunk")
					}
				}).export(),
			generic: captured =>
				scope({
					"box<t>": {
						value: value(captured),
						"next?": "box<t>",
						// @ts-expect-error
						bad: "nope"
					},
					a: "box<string>"
				}).export()
		}
		// the first name to be unresolvable resolves the keywords, which stay registered
		attest(() => type("nope" as never)).throws("'nope' is unresolvable")
		const registered = new Set(Object.keys($ark.nodesById))
		const thrown: Record<string, string> = {}
		const refs: Record<string, WeakRef<object>> = {}
		for (const k in cases) {
			refs[k] = capture(captured => {
				try {
					cases[k](captured)
				} catch (e) {
					thrown[k] = String(e)
				}
			})
		}
		for (const ref of Object.values(refs)) await collectTarget(ref)
		attest(thrown).snap({
			this: "ParseError: 'nope' is unresolvable",
			export: "ParseError: 'nope' is unresolvable",
			reference: "ParseError: 'nope' is unresolvable",
			member: "ParseError: 'nope' is unresolvable",
			pending: "ParseError: 'nope' is unresolvable",
			check:
				"ParseError: Intersection of object and string results in an unsatisfiable type",
			resolution:
				"ParseError: Intersection of object and string results in an unsatisfiable type",
			cycle: "ParseError: Alias 'a' has a shallow resolution cycle: a->b->a",
			thunk: "Error: thrown by a thunk",
			generic: "ParseError: 'nope' is unresolvable"
		})
		attest(Object.keys(refs).filter(k => refs[k].deref())).equals([])
		attest(
			Object.keys($ark.nodesById).filter(id => !registered.has(id))
		).equals([])
	})

	it("cycle parsed again after a thunk it references threw", async () => {
		let calls = 0
		// c is parsed and u cached as a union of an alias when b throws
		const $: Scope = scope({
			a: { "u?": "u", "c?": "c", b: "b" },
			u: "a | string",
			c: { "a?": "a", v: "string" },
			b: () => {
				if (calls++) return type("number")
				throw new Error("thrown by a thunk")
			}
		} as never)
		attest(() => $.export()).throws("thrown by a thunk")
		await collect()
		const types: Record<string, Type> = $.export() as never
		attest(types.c.expression).snap("{ v: string, a?: $a }")
		attest(types.u.expression).snap("string | { b: number, c?: $c, u?: $u }")
		attest(String(types.c({ v: "", a: { b: 1, c: { v: 1 } } }))).snap(
			"a.c.v must be a string"
		)
	})

	it("alias parsed in a thunk that threw", async () => {
		let Parsed: Type | undefined
		const $: Scope = scope({
			a: () => {
				if (Parsed) return type({ v: "number" })
				Parsed = $.type({ "next?": "a" } as never)
				throw new Error("thrown by a thunk")
			}
		} as never)
		attest(() => $.export()).throws("thrown by a thunk")
		await collect()
		// resolved by name, as its thunk is called again
		attest(String(Parsed!({ next: { v: "" } }))).snap("next.v must be a number")
	})

	it("keeps cyclic scope types", async () => {
		const $ = scope({ node: { value: "string", "next?": "node" } })
		const types = $.export()
		await collect()
		attest(types.node({ value: "a", next: { value: 1 } }).toString()).snap(
			"next.value must be a string"
		)
		attest($.type("node[]")([{ value: "a", next: { value: "b" } }])).equals([
			{ value: "a", next: { value: "b" } }
		])
	})

	it("unknown union after collection", async () => {
		await collect()
		const T = type(
			"string | number | bigint | symbol | object | boolean | null | undefined"
		)
		attest(T.expression).equals("unknown")
		const $ = scope({})
		$.export()
		$.type("string")
		await collect()
		attest(
			$.type(
				"string | number | bigint | symbol | object | boolean | null | undefined"
			).expression
		).equals("unknown")
	})

	// built from nodes, which the parse cache doesn't hold
	it("unfinalized parse after collection", async () => {
		const configured = () =>
			type({ a: "string" })
				.get("a")
				.or(type.instanceOf(WeakSet))
				.configure({ examples: ["gc"] }, "self")
		const cases = [
			[
				() => type({ k: "'gcZeta' | 'gcAlpha'" }).get("k").or(type.unit(7007)),
				() => type.enumerated("gcZeta", "gcAlpha", 7007),
				2
			],
			[
				() => type({ a: "string" }).get("a").or(type.instanceOf(WeakMap)),
				() =>
					type.$.node("union", {
						branches: [
							type.$.node("domain", { domain: "string" }),
							type.$.node("proto", { proto: WeakMap })
						]
					}),
				0
			],
			[() => type(configured()), configured, 0]
		] as const
		for (const [compiled, unfinalized, input] of cases) {
			let T: type.Any | null = compiled()
			const message = String(T(input))
			T = null
			await collect()
			attest(String(unfinalized()(input))).equals(message)
		}
	})

	it("errors release the data they found their issues in", async () => {
		const T = type({ a: "string", b: "number" })
		// each issue holds its value, not the object holding it
		const create = (read: (errors: type.errors) => unknown) => {
			const data = { a: 0, b: 1 }
			const errors = T(data) as type.errors
			read(errors)
			return [errors, new WeakRef(data)] as const
		}
		for (const read of [
			(errors: type.errors) => errors.summary,
			(errors: type.errors) => [firstIssue(errors), errors.issues]
		]) {
			const [errors, ref] = create(read)
			await collectTarget(ref)
			attest(ref.deref()).equals(undefined)
			attest(errors.summary).equals("a must be a string")
		}
	})

	it("optional prop input after collection", async () => {
		let First: type.Any | null = type({ read: ["number", "=", 5] })
		attest(First.in.expression).snap("{ read?: number }")
		First = null
		await collect()
		attest(type({ read: ["number", "=", 5], b: "string" }).in.expression).snap(
			"{ b: string, read?: number }"
		)
	})

	it("bounds the string parse cache so dropped string types are collected", async () => {
		const create = () => {
			const first = new WeakRef(type.raw('"gcBounded0" | number'))
			for (let i = 1; i < 5000; i++) type.raw(`"gcBounded${i}" | number`)
			return first
		}
		const ref = create()
		await collectTarget(ref)
		attest(ref.deref()).equals(undefined)
	})
})
