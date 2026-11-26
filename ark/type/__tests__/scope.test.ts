import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootSchema,
	writeUnboundableMessage,
	writeGlobalOnlyConfigMessage,
	writeUnresolvableMessage,
	type ArkErrors
} from "@ark/schema"
import { generic, scope, type, type Module, type Scope } from "arktype"
import type { distill } from "arktype/internal/attributes.ts"
import { writeUnexpectedCharacterMessage } from "arktype/internal/parser/shift/operator/operator.ts"
import { keywordModule } from "arktype/internal/scope.ts"

contextualize(() => {
	it("base definition", () => {
		const types = scope({ actual: { name: "string" } }).export()

		const Expected = type({
			name: "string"
		})

		attest<typeof Expected.t>(types.actual.t)
		attest(types.actual.expression).equals(Expected.expression)
		attest(() =>
			// @ts-expect-error
			scope({ a: "strong" }).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
	})

	it("a bound keyword's id is the same whether its scope parsed its schema first", () => {
		// an intersection with an alias serializes as its operands' ids
		const prefixOf = (id: string) => id.replace(/\d+$/, "")
		const parsedFirst = scope({})
		parsedFirst.schema({ domain: "object" })
		attest(prefixOf(parsedFirst.internal.bindRef(intrinsic.object).id)).equals(
			prefixOf(scope({}).internal.bindRef(intrinsic.object).id)
		)
	})

	it("a Type holds a bound keyword, not one with its id the scope created first", () => {
		// ark creates `{ a: unknown }` first, keyed by the id the bound copy keeps
		type("<t>", { a: "t" })("unknown")
		const { T } = scope({ T: "unknown" }).export()
		const a = type({ a: T }).internal.references.find(
			node => node.id === T.internal.id
		)
		attest(a).is(T.internal)
	})

	it("define", () => {
		const aliases = scope.define({ foo: "string", bar: { foo: "foo" } })
		attest<{
			readonly foo: "string"
			readonly bar: {
				readonly foo: "foo"
			}
		}>(aliases).snap({ foo: "string", bar: { foo: "foo" } })
	})

	it("docs example", () => {
		const $ = type.scope({
			// built-in keywords are still available in your scope
			id: "string",
			// but you can also reference your own aliases directly!
			user: { id: "id", friends: "id[]" },
			// your aliases will be autocompleted alongside built-in keywords
			usersById: {
				"[id]": "user | undefined"
			}
		})

		$.export()

		attest<
			Scope<{
				id: string
				user: {
					id: string
					friends: string[]
				}
				usersById: {
					[x: string]:
						| {
								id: string
								friends: string[]
						  }
						| undefined
				}
			}>
		>($)
		attest($.json).snap({
			id: { domain: "string" },
			user: {
				required: [
					{ key: "friends", value: { sequence: "string", proto: "Array" } },
					{ key: "id", value: "string" }
				],
				domain: "object"
			},
			usersById: {
				index: [
					{
						signature: "string",
						value: [
							{
								required: [
									{
										key: "friends",
										value: { sequence: "string", proto: "Array" }
									},
									{ key: "id", value: "string" }
								],
								domain: "object"
							},
							{ unit: "undefined" }
						]
					}
				],
				domain: "object"
			}
		})
	})

	it("type definition inline", () => {
		const $ = scope({ actual: type({ name: "string" }) })
		const types = $.export()

		const Expected = type({ name: "string" })

		attest<typeof Expected.t>(types.actual.t)
		attest(types.actual.expression).equals(Expected.expression)
		attest(types.actual.$.json).equals($.json)

		attest(() =>
			// @ts-expect-error
			scope({ a: type("strong") })
		).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
	})

	it("interdependent", () => {
		const types = scope({
			l: "string > 5",
			r: "string.email <= 10",
			actual: "l & r"
		}).export()

		const Expected = type("string.email <= 10 & string > 5")

		attest<typeof Expected.t>(types.actual.t)
		attest(types.actual.expression).equals(Expected.expression)
	})

	it("object tuple", () => {
		const types = scope({ ref: "string", actual: [{ c: "ref" }] }).export()
		const Expected = type([{ c: "string" }])

		attest<typeof Expected.t>(types.actual.t)
		attest(types.actual.expression).equals(Expected.expression)
	})

	it("doesn't try to validate any in scope", () => {
		const $ = scope({ a: {} as any })
		attest<any>($.resolve("a").infer)

		const T = $.type(["number", "a"])

		attest<[number, any]>(T.infer)
	})

	it("infers input and output", () => {
		const $ = scope({
			a: ["string", "=>", s => s.length]
		})
		attest<number>($.resolve("a").infer)

		attest<string>($.resolve("a").inferIn)
	})

	describe("functions typed from the scope", () => {
		it("a morph of an alias takes its parameter from it", () => {
			const types = scope({
				Base: { text: "string" },
				returned: ["Base", "=>", d => d],
				annotated: ["Base", "=>", (d: { text: string }) => d],
				ignored: ["Base", "=>", () => ({ n: 1 })]
			}).export()

			attest(types.returned.t).type.toString.snap(
				"(In: { text: string }) => Out<{ text: string }>"
			)
			attest(types.annotated.t).type.toString.snap(
				"(In: { text: string }) => Out<{ text: string }>"
			)
			attest(types.ignored.t).type.toString.snap(
				"(In: { text: string }) => Out<{ n: number }>"
			)
			attest(types.returned({ text: "a" })).equals({ text: "a" })
		})

		it("a morph's parameter is typed from whatever its input resolves to", () => {
			const types = scope({
				Base: { text: "string" },
				"#hidden": { n: "number" },
				Linked: { value: "string", "next?": "Linked" },
				Id: "string#id",
				literal: [{ a: "string" }, "=>", d => d.a],
				list: ["Base[]", "=>", l => l.length],
				union: [
					"Base | string",
					"=>",
					u => (typeof u === "string" ? u : u.text)
				],
				fromPrivate: ["hidden", "=>", h => h.n],
				fromCyclic: ["Linked", "=>", l => l.next?.next?.value],
				branded: ["Id", "=>", id => id],
				defaulted: [{ count: "number = 0" }, "=>", d => d.count]
			}).export()

			attest(types.literal.t).type.toString.snap(
				"(In: { a: string }) => Out<string>"
			)
			attest(types.list.t).type.toString.snap(
				"(In: { text: string }[]) => Out<number>"
			)
			attest(types.union.t).type.toString.snap(
				"(In: string | { text: string }) => Out<string>"
			)
			attest(types.fromPrivate.t).type.toString.snap(
				"(In: { n: number }) => Out<number>"
			)
			attest(types.fromCyclic.t).type.toString.snap(`(In: {
	value: string
	next?: cyclic
}) => Out<string | undefined>`)
			attest(types.branded.t).type.toString.snap(
				'(In: string) => Out<Brand<string, "id">>'
			)
			attest(types.defaulted.t).type.toString.snap(
				"(In: { count?: number }) => Out<number>"
			)
		})

		it("infers a morph within an alias and what refers to it", () => {
			const types = scope({
				Base: { text: "string" },
				outer: { inner: ["Base", "=>", d => d.text.length] },
				outers: "outer[]"
			}).export()

			attest(types.outer.t).type.toString.snap(
				"{ inner: (In: { text: string }) => Out<number> }"
			)
			attest(types.outers.t).type.toString.snap(
				"{ inner: (In: { text: string }) => Out<number> }[]"
			)
			attest(types.outers([{ inner: { text: "abc" } }])).equals([{ inner: 3 }])
		})

		it("a predicate beside a morph narrows as its function does", () => {
			const types = scope({
				Base: { text: "string" },
				morphed: ["Base", "=>", d => d.text],
				guarded: ["Base", ":", (d): d is { text: "ok" } => d.text === "ok"],
				checked: [
					"Base",
					":",
					(d, ctx) => d.text !== "" || ctx.mustBe("non-empty")
				]
			}).export()

			attest<{ text: "ok" }>(types.guarded.t)
			attest<{ text: string }>(types.checked.t)
		})

		it("infers a module's morph", () => {
			const types = type.module({
				Base: { text: "string" },
				morphed: ["Base", "=>", d => d.text]
			})

			attest(types.morphed.t).type.toString.snap(
				"(In: { text: string }) => Out<string>"
			)
		})

		it("an invalid alias beside a morph is still an error", () => {
			attest(() =>
				scope({
					Base: { text: "string" },
					morphed: ["Base", "=>", d => d.text],
					// @ts-expect-error
					invalid: "strong"
				}).export()
			).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
		})

		// a function has one type, which it's given before the generic has
		// arguments
		it("a generic's morph is typed from its parameters' constraints", () => {
			const types = scope({
				"boxed<t>": [{ box: "t" }, "=>", b => b.box],
				strings: "boxed<string>"
			}).export()

			attest(types.strings.t).type.toString.snap(
				"(In: { box: string }) => Out<unknown>"
			)
		})

		// TypeScript types every such function of a scope before it knows what
		// any of them returns, so the output of one can't type another's
		// parameter
		it("a morph of another's output needs its parameter annotated", () => {
			const types = scope({
				Base: { text: "string" },
				first: ["Base", "=>", d => d.text],
				second: ["first", "=>", s => s],
				annotated: ["first", "=>", (s: string) => s.length]
			}).export()

			attest(types.second.t).type.toString.snap("(In: never) => Out<any>")
			attest(types.annotated.t).type.toString.snap(
				"(In: { text: string }) => Out<number>"
			)
		})

		// nor can its own input, which isn't known until the morph is
		it("a cycle through a morph ends at it in the morph's input", () => {
			const types = scope({
				A: { "b?": "B", v: "string" },
				B: ["A", "=>", a => a.v]
			}).export()

			attest(types.A.infer).type.toString.snap("{ b?: string; v: string }")
			attest(types.A.inferIn).type.toString.snap(
				"{ b?: { b?: never; v: string }; v: string }"
			)
			attest(types.B.t).type.toString.snap(
				"(In: { b?: never; v: string }) => Out<string>"
			)
			attest(types.A({ v: "a", b: { v: "b", b: { v: "c" } } })).equals({
				v: "a",
				b: "b"
			})
		})
	})

	it("infers its own helpers", () => {
		const $ = scope({
			a: () => $.type("string"),
			b: () => $.type("number")
		})
		const types = $.export()

		attest<string>(types.a.infer)
		attest(types.a.expression).equals("string")
		attest(types.a.$.json).equals($.json)

		attest<number>(types.b.infer)
		attest(types.b.expression).equals("number")
		attest(types.b.$.json).equals($.json)
	})

	it("allows semantically valid helpers", () => {
		const $ = scope({
			n: () => $.type("number"),
			lessThan10: () => $.type("n<10")
		})
		const types = $.export()

		attest<number>(types.n.t)
		attest(types.n.expression).equals("number")

		const Expected = type("number").lessThan(10)

		attest<typeof Expected.t>(types.lessThan10.t)
		attest(types.lessThan10.expression).equals(Expected.expression)
	})

	it("errors on helper parse error", () => {
		attest(() => {
			const $ = scope({
				// @ts-expect-error
				a: () => $.type("kung|foo")
			})
			$.export()
		}).throwsAndHasTypeError(writeUnresolvableMessage("kung"))
	})

	it("errors on semantically invalid helper", () => {
		attest(() => {
			const $ = scope({
				b: () => $.type("boolean"),
				// @ts-expect-error
				lessThan10: () => $.type("b<10")
			})
			$.export()
		}).throwsAndHasTypeError(writeUnboundableMessage("boolean"))
	})

	it("errors on ridiculous unexpected alias scenario", () => {
		attest(() =>
			scope({
				Unexpected: {},
				User: {
					// Previously, using the alias `Unexpected` allowed creating
					// this type string which matched its own error message.
					// @ts-expect-error
					name: "Unexpected character 'c'"
				}
			}).export()
		).throwsAndHasTypeError(writeUnexpectedCharacterMessage("c"))
	})

	it("errors on each reference to an invalid alias", () => {
		const $ = scope({
			a: { b: "b" },
			// @ts-expect-error
			b: { a: "a", c: "bad" }
		})
		attest(() => $.type("a")).throws(writeUnresolvableMessage("bad"))
		attest(() => $.type("a | string")).throws(writeUnresolvableMessage("bad"))
		attest(() => $.type("b")).throws(writeUnresolvableMessage("bad"))
	})

	it("errors on each export after a default in a cycle fails", () => {
		const $ = scope({
			// @ts-expect-error
			a: { b: "c = 1" },
			c: { x: "a" }
		})
		const message = "Default for b must be an object"
		attest(() => $.export()).throws(message)
		attest(() => $.export()).throws(message)
	})

	it("exports from an alias's thunk what's exported before it", () => {
		const $ = scope({ b: "string", a: () => $.export().b })
		attest($.export().a("x")).equals("x")
	})

	it("errors on each export after an alias fails", () => {
		const $ = scope({
			even: ["number", ":", n => n % 2 === 0],
			a: { b: "even = 1" },
			c: { d: "even" }
		})
		const message =
			"Default for b must be valid according to an anonymous predicate"
		attest(() => $.export()).throws(message)
		attest(() => $.export()).throws(message)
		attest(() => $.export("c")).throws(message)
		attest(() => $.import()).throws(message)
	})

	it("autocompletion", () => {
		attest(() => {
			scope({
				foobar: "string",
				// @ts-expect-error
				baz: "foo"
			}).export()
		}).completions({ foo: ["foobar"] })
	})

	it("cross-scope reference", () => {
		const { Apple } = scope({
			Apple: {
				pear: "Pear"
			},
			Pear: {
				tasty: "true"
			}
		}).export()

		const { X } = scope({
			X: Apple
		}).export()

		const out = X({ pear: { tasty: true } })
		attest(out).snap({ pear: { tasty: true } })
	})

	it("throws for a global-only option", () => {
		// @ts-expect-error
		attest(() => scope({}, { numberAllowsInfinity: true })).type.errors(
			"'numberAllowsInfinity' does not exist in type"
		)
		attest(() => scope({}, { onUndeclaredKey: "delete" } as never)).throws(
			writeGlobalOnlyConfigMessage("onUndeclaredKey")
		)
	})

	it("cross-scope intersection", () => {
		const configured = scope({}, { required: { message: () => "configured" } })
		configured.type({ x: "string" }).and({ y: "number" })
		const T = scope({}).type({ x: "string" }).and({ y: "number" })
		attest(T({}).toString()).snap(
			"x must be a string (was missing)\ny must be a number (was missing)"
		)
		// operands shared with the configured scope
		const L = type({ x: "string" })
		const R = type({ y: "number" })
		configured.type([L, "&", R])
		attest(L.and(R)({}).toString()).snap(
			"x must be a string (was missing)\ny must be a number (was missing)"
		)
	})

	describe("cyclic", () => {
		it("base", () => {
			const types = scope({ a: { b: "b" }, b: { a: "a" } }).export()

			const a = {} as { b: typeof b }
			const b = { a }
			a.b = b

			attest(types.a(a)).equals(a)
			attest(types.a({ b: { a: { b: { a: 5 } } } }).toString()).snap(
				"b.a.b.a must be an object"
			)

			// Type hint displays as "..." on hitting cycle (or any if "noErrorTruncation" is true)
			attest({} as typeof types.a.infer).type.toString.snap(
				"{ b: { a: cyclic } }"
			)
			attest({} as typeof types.b.infer.a.b.a.b.a.b.a).type.toString.snap(
				"{ b: { a: cyclic } }"
			)

			// @ts-expect-error
			attest({} as typeof types.a.infer.b.a.b.c).type.errors.snap(
				"Property 'c' does not exist on type '{ a: { b: ...; }; }'."
			)
		})

		const getCyclicScope = () =>
			scope({
				package: {
					name: "string",
					"dependencies?": "package[]",
					"contributors?": "contributor[]"
				},
				contributor: {
					email: "string.email",
					"packages?": "package[]"
				}
			})

		type Package = distill.Out<
			ReturnType<typeof getCyclicScope>["t"]["package"]
		>

		const getCyclicData = () => {
			const packageData = {
				name: "arktype",
				dependencies: [{ name: "typescript" }],
				contributors: [{ email: "david@arktype.io" }]
			} satisfies Package
			packageData.dependencies.push(packageData)
			return packageData
		}

		it("cyclic intersection", () => {
			const types = scope({
				a: { b: "b&a" },
				b: { a: "a&b" }
			}).export()
			attest(types.a.t).type.toString.snap(
				"{ b: { b: cyclic; a: { b: cyclic; a: cyclic } } }"
			)
			attest(types.b.t).type.toString.snap(
				"{ a: { b: { b: cyclic; a: cyclic }; a: cyclic } }"
			)
		})

		it("cyclic union", () => {
			const types = scope({
				a: { b: "b|false" },
				b: { a: "a|true" }
			}).export()
			attest(types.a.t).type.toString.snap(
				"{ b: false | { a: true | cyclic } }"
			)
			attest(types.b.t).type.toString.snap(
				"{ a: true | { b: false | cyclic } }"
			)
		})

		it("allows valid", () => {
			const types = getCyclicScope().export()
			const data = getCyclicData()
			attest(types.package(data)).snap({
				name: "arktype",
				dependencies: [{ name: "typescript" }, "(cycle)" as never],
				contributors: [{ email: "david@arktype.io" }]
			})
		})

		it("adds errors on invalid", () => {
			const types = getCyclicScope().export()
			const data = getCyclicData()
			data.contributors[0].email = "ssalbdivad"
			// https://github.com/arktypeio/arktype/issues/924
			attest(types.package(data).toString()).snap(
				"contributors[0].email must be an email address"
			)
		})

		it("can include cyclic data in message", () => {
			const data = getCyclicData()
			const nonSelfDependent = getCyclicScope().type([
				"package",
				":",
				p => !p.dependencies?.some(d => d.name === p.name)
			])
			attest(nonSelfDependent(data).toString()).snap(
				"must be valid according to an anonymous predicate"
			)
		})

		it("intersect cyclic reference", () => {
			const types = scope({
				arf: {
					b: "bork"
				},
				bork: {
					c: "arf&bork"
				}
			}).export()
			attest(types.arf.infer).type.toString.snap(
				"{ b: { c: { b: cyclic; c: cyclic } } }"
			)
			attest(types.bork.infer).type.toString.snap(
				"{ c: { b: cyclic; c: cyclic } }"
			)

			attest(types.arf.json).equals({
				domain: "object",
				required: [{ key: "b", value: `$ark.${types.bork.internal.id}` }]
			})
			const a = {} as typeof types.arf.infer
			const b = { c: {} } as typeof types.bork.infer
			a.b = b
			b.c.b = b
			b.c.c = b.c

			attest(types.arf.expression).snap("{ b: $bork }")
			attest(types.bork.expression).snap("{ c: $arf&$bork }")

			attest(types.arf(a)).equals(a)
			attest(types.arf({ b: { c: {} } }).toString())
				.snap(`b.c.b must be an object (was missing)
b.c.c must be an object (was missing)`)

			attest(types.bork.json).equals({
				domain: "object",
				required: [
					{
						key: "c",
						value: `$ark.${types.arf.internal.id}&${types.bork.internal.id}`
					}
				]
			})
		})

		it("union cyclic reference", () => {
			const types = scope({
				a: {
					b: "b"
				},
				b: {
					a: "a|3"
				}
			}).export()
			attest(types.a.infer).type.toString.snap("{ b: { a: 3 | cyclic } }")

			attest(types.a.json).equals({
				domain: "object",
				required: [{ key: "b", value: `$ark.${types.b.internal.id}` }]
			})

			const valid: typeof types.a.infer = { b: { a: 3 } }

			attest(types.a(valid)).equals(valid)

			valid.b.a = valid

			// check cyclic
			attest(types.a(valid)).equals(valid)

			attest(types.a({ b: { a: { b: { a: 4 } } } }).toString()).snap(
				"b.a.b.a must be 3"
			)

			attest(types.b.infer).type.toString.snap("{ a: 3 | { b: cyclic } }")
			attest(types.b.json).equals({
				domain: "object",
				required: [
					{ key: "a", value: [`$ark.${types.a.internal.id}`, { unit: 3 }] }
				]
			})
		})

		it("disjoint intersection with a cyclic reference", () => {
			// throws once a resolves, as string.trim & object throws as it's parsed
			attest(() =>
				scope({
					a: {
						b: "string.trim & a | number"
					}
				}).export()
			).throws.snap(
				"ParseError: Intersection of string and object results in an unsatisfiable type"
			)
		})

		// https://github.com/arktypeio/arktype/issues/1138
		it("cyclic array", () => {
			type Value = boolean | number | string | { [k: string]: Value } | Value[]

			const types = scope({
				primitive: "boolean | number | string",
				record: {
					"[string]": "value"
				},
				value: "primitive | record | value[]",
				castValue: "value" as type.cast<Value>
			}).export()

			// TS type display blows up but it's equivalent to Value
			const out = types.value(5)
			// casting to Value also works
			const castOut = types.castValue(5)

			attest<Value | ArkErrors>(out).equals(5)
			attest<Value | ArkErrors>(castOut).equals(5)
		})
	})

	it("can override ambient aliases", () => {
		const types = scope({
			foo: {
				bar: "string"
			},
			string: type.number
		}).export()
		attest<
			Module<{
				string: number
				foo: {
					bar: number
				}
			}>
		>(types)
		attest(types.foo.json).snap({
			required: [{ key: "bar", value: "number" }],
			domain: "object"
		})
	})

	it("module", () => {
		const types = type.module({
			foo: "string",
			bar: "number"
		})
		attest<
			Module<{
				foo: string
				bar: number
			}>
		>(types)
		attest(types.foo.json).snap({ domain: "string" })
		attest(types.bar.json).snap({ domain: "number" })
	})

	it("allows multiple scopes with the same name without collision", () => {
		const s1 = scope({ a: "string" }, { name: "Array" })
		const s2 = scope({ a: "number" }, { name: "Array" })
		attest((s1 as any).name).equals("Array")
		attest((s2 as any).name).equals("Array")

		// Verify parseCache does not cross-pollinate across scopes with the same name
		const t1 = s1.type("a")
		const t2 = s2.type("a")
		attest(t1.expression).equals("string")
		attest(t2.expression).equals("number")
	})

	it("aliases named like Object.prototype members", () => {
		const types = scope({
			toString: "string",
			valueOf: "toString[]",
			"#constructor": "number",
			toLocaleString: "constructor",
			sub: type.module({ a: "string" })
		}).export()
		attest(types.valueOf(["a"])).equals(["a"])
		attest(types.toLocaleString(1)).equals(1)
		attest(types.valueOf([1]).toString()).snap("[0] must be a string")
		attest(() =>
			// @ts-expect-error
			scope({ a: "constructor" }).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("constructor"))
		attest(() =>
			// @ts-expect-error
			scope({ sub: types.sub, a: "sub.toString" }).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("sub.toString"))
		attest(() =>
			// @ts-expect-error
			scope({ sub: types.sub, a: "sub.toString.a" }).export()
		).throwsAndHasTypeError(writeUnresolvableMessage("sub.toString.a"))
	})

	it("generic params named like Object.prototype members", () => {
		const types = scope({
			"box<valueOf>": { v: "valueOf" },
			x: "box<string>"
		}).export()
		attest(types.x({ v: 1 }).toString()).snap("v must be a string")
		const Box = generic("toString")({ v: "toString" })
		attest(Box("number")({ v: "a" }).toString()).snap("v must be a number")
	})

	it("keywords and aliases keep Object.prototype", () => {
		attest(String(type.keywords)).equals("[object Object]")
		attest(String(scope({ a: "string" }).aliases)).equals("[object Object]")
	})

	it("cyclic aliases named like Object.prototype members in separate scopes", () => {
		const L = scope({ toString: { a: "string", "b?": "toString" } }).export()
		const R = scope({ toString: { a: "number", "b?": "toString" } }).export()
		const T = type({ l: L.toString, r: R.toString })
		const data = { l: { a: "x", b: { a: "y" } }, r: { a: 1, b: { a: 2 } } }
		attest(T(data)).equals(data)
	})

	it("root of a scope named like an Object.prototype member", () => {
		const types = scope({ root: "string" }, { name: "toString" }).export()
		attest(types.root.description).snap("a string")
	})

	it("scope frozen before its first parse", () => {
		const $ = Object.freeze(scope({}))
		attest($.type("string")(5).toString()).snap("must be a string")
		attest($.type.and({ a: "string" }, { b: "number" }).expression).snap(
			"{ a: string, b: number }"
		)
		attest($.type.pipe($.type("string"), s => s.length)("abc")).equals(3)
	})

	it("frozen modules and parsers", () => {
		const Frozen: Module<{ root: string }> = Object.freeze(
			keywordModule(
				{ root: () => ["string", "@", "a frozen root"] },
				{ name: "frozen" }
			)
		) as never
		attest(Frozen.root(5).toString()).snap("must be a frozen root")
		const parser = Object.freeze(scope({}).type)
		attest(parser.number("x").toString()).snap("must be a number")
	})
})
