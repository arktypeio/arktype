import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import {
	ark,
	configure,
	generic,
	keywords,
	scope,
	type,
	type Module
} from "arktype"
import { Scope } from "arktype/internal/scope.ts"

contextualize(() => {
	describe("clean slate", () => {
		it("rejects built-in keywords everywhere", () => {
			attest(() =>
				scope(
					{
						// @ts-expect-error
						a: "string"
					},
					{ ambient: {} }
				).export()
			).throwsAndHasTypeError(writeUnresolvableMessage("string"))

			attest(() =>
				scope(
					{
						// @ts-expect-error
						"box<t extends string>": { v: "t" }
					},
					{ ambient: {} }
				).export()
			).throwsAndHasTypeError(writeUnresolvableMessage("string"))

			const $ = scope({ tag: "'ok'" }, { ambient: {} })

			// @ts-expect-error
			attest(() => $.type("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)
			// @ts-expect-error
			attest(() => $.type("string.email")).throwsAndHasTypeError(
				writeUnresolvableMessage("string.email")
			)
			// @ts-expect-error
			attest(() => $.type("number")).throwsAndHasTypeError(
				writeUnresolvableMessage("number")
			)
			// @ts-expect-error
			attest(() => $.type("Array")).throwsAndHasTypeError(
				writeUnresolvableMessage("Array")
			)
			// @ts-expect-error
			attest(() => $.type("Record<string, number>")).throwsAndHasTypeError(
				writeUnresolvableMessage("Record")
			)
			// @ts-expect-error
			attest(() => $.type("Date")).throwsAndHasTypeError(
				writeUnresolvableMessage("Date")
			)

			const T = $.type("tag")
			// @ts-expect-error
			attest(() => T.and("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)
			// @ts-expect-error
			attest(() => T.or("number")).throwsAndHasTypeError(
				writeUnresolvableMessage("number")
			)

			attest(() =>
				// @ts-expect-error
				$.generic("t")({ v: "t", s: "string" })("'a'")
			).throwsAndHasTypeError(writeUnresolvableMessage("string"))
			attest(() =>
				// @ts-expect-error
				$.generic(["t", "number"])({ v: "t" })
			).throwsAndHasTypeError(writeUnresolvableMessage("number"))
			attest(() =>
				// @ts-expect-error
				$.type("<t extends number>", { v: "t" })
			).throwsAndHasTypeError(writeUnresolvableMessage("number"))

			// @ts-expect-error
			attest(() => $.define("string")).type.errors(
				writeUnresolvableMessage("string")
			)
		})

		it("supports literals, operators, structures, morphs, and local aliases", () => {
			const $ = scope(
				{
					"#priv": "'a' | 'b'",
					pair: ["priv", "1 | 2"],
					item: {
						kind: "priv",
						nums: "(1 | 2)[]",
						"next?": "item"
					},
					"wrap<t>": { value: "t" },
					wrapped: "wrap<priv>",
					counted: ["'x' | 'yy'", "=>", s => s.length]
				},
				{ ambient: {} }
			)

			const types = $.export()
			attest<["a" | "b", 1 | 2]>(types.pair.infer)
			attest<{ value: "a" | "b" }>(types.wrapped.infer)
			attest<number>(types.counted.infer)
			attest<"x" | "yy">(types.counted.inferIn)

			attest(types.pair(["a", 1])).equals(["a", 1])
			attest(types.pair(["c", 1]).toString()).snap('[0] must be "a" or "b"')
			attest(
				types.item({ kind: "b", nums: [1, 2], next: { kind: "a", nums: [] } })
			).equals({ kind: "b", nums: [1, 2], next: { kind: "a", nums: [] } })
			attest(types.wrapped({ value: "a" })).equals({ value: "a" })
			attest(types.counted("yy")).equals(2)
			attest($.type("priv & 'a'")("a")).equals("a")
		})

		it("gates default type attachments and keywords on $.type", () => {
			const $ = scope({ a: "'ok'" }, { ambient: {} })

			// @ts-expect-error
			attest(() => $.type.string).type.errors("does not exist")
			// @ts-expect-error
			attest(() => $.type.number).type.errors("does not exist")
			// @ts-expect-error
			attest(() => $.type.Record).type.errors("does not exist")

			attest("string" in $.type).equals(false)
			attest("number" in $.type).equals(false)
			attest("Record" in $.type).equals(false)
			attest($.type.keywords).equals({})
			attest<{}>($.type.keywords)
			attest(($ as any).ambientAttachments).equals(undefined)
		})

		it("never resolves or leaks the internal ambient sentinel", () => {
			const $ = scope({ a: "'ok'" }, { ambient: {} })

			// @ts-expect-error
			attest(() => $.type(" ambient")).throwsAndHasTypeError(
				writeUnresolvableMessage("ambient")
			)
			// @ts-expect-error
			attest(() => $.type(" ambient[]")).throwsAndHasTypeError(
				writeUnresolvableMessage("ambient")
			)
			// @ts-expect-error
			attest(() => $.type(" ambient | 'ok'")).throwsAndHasTypeError(
				writeUnresolvableMessage("ambient")
			)
			// @ts-expect-error
			attest(() => $.type(" ambient.foo")).throwsAndHasTypeError(
				writeUnresolvableMessage("ambient.foo")
			)

			attest<readonly "a"[]>($.exportedNames)
			attest($.exportedNames).equals(["a"])
			const exported = $.export()
			attest(Object.keys(exported)).equals(["a"])
			// @ts-expect-error
			attest(() => exported[" ambient"]).type.errors("does not exist")
			const imported = $.import()
			attest(Object.keys(imported)).equals(["#a"])
			// @ts-expect-error
			attest(() => imported["# ambient"]).type.errors("does not exist")
			attest($.resolve("a").infer).type.toString.snap('"ok"')
			// @ts-expect-error
			attest(() => $.resolve(" ambient")).type.errors("not assignable")

			// leading-space reference still trims to a real alias named `ambient`
			const namedAmbient = scope({ ambient: "'ok'" }, { ambient: {} })
			attest<"ok">(namedAmbient.type(" ambient").infer)
			attest(namedAmbient.type(" ambient")("ok")).equals("ok")
		})
	})

	describe("module ambient", () => {
		it("resolves from a Scope.export() Module, excludes ambient from exports, and allows shadowing", () => {
			const base = scope({
				id: "string",
				count: "number",
				"#secret": "boolean"
			}).export()

			const $ = scope(
				{
					user: { id: "id", count: "count" },
					// shadow ambient alias publicly without duplicate-alias error
					count: "'one' | 'two'",
					// shadow ambient alias privately without duplicate-alias error
					"#id": "'local'",
					localId: "id"
				},
				{ ambient: base }
			)

			const types = $.export()
			attest<{ id: "local"; count: "one" | "two" }>(types.user.infer)
			attest<"local">(types.localId.infer)
			attest(Object.keys(types)).equals(["user", "count", "localId"])
			attest(types.user({ id: "local", count: "one" })).equals({
				id: "local",
				count: "one"
			})

			// unshadowed scope using base ambient directly
			const $plain = scope(
				{ record: { id: "id", count: "count" } },
				{ ambient: base }
			)
			const plain = $plain.export()
			attest<{ id: string; count: number }>(plain.record.infer)
			attest(plain.record({ id: "u1", count: 3 })).equals({
				id: "u1",
				count: 3
			})
			// ambient aliases are not re-exported
			attest(Object.keys(plain)).equals(["record"])
			// @ts-expect-error
			attest(() => plain.id).type.errors("does not exist")
			// private alias from base is not in ambient
			// @ts-expect-error
			attest(() => $plain.type("secret")).throwsAndHasTypeError(
				writeUnresolvableMessage("secret")
			)
			// global keywords not in base fail
			// @ts-expect-error
			attest(() => $plain.type("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)
			// @ts-expect-error
			attest(() => $plain.type("Date")).throwsAndHasTypeError(
				writeUnresolvableMessage("Date")
			)
		})

		it("resolves from ark.export(...) BoundModule including submodules", () => {
			const $ = scope(
				{
					email: "string.email",
					n: "number.integer",
					pair: ["string", "number"]
				},
				{ ambient: ark.export("string", "number") }
			)

			const types = $.export()
			attest<string>(types.email.infer)
			attest<number>(types.n.infer)
			attest<[string, number]>(types.pair.infer)

			attest(types.email("a@b.com")).equals("a@b.com")
			attest(types.email("nope").toString()).snap("must be an email address")
			attest(types.n(4)).equals(4)
			attest(types.n(1.5).toString()).snap("must be an integer")

			// unincluded globals fail
			// @ts-expect-error
			attest(() => $.type("boolean")).throwsAndHasTypeError(
				writeUnresolvableMessage("boolean")
			)
			// @ts-expect-error
			attest(() => $.type("Date")).throwsAndHasTypeError(
				writeUnresolvableMessage("Date")
			)
		})

		it("accepts full keywords Module", () => {
			const $ = scope(
				{
					map: "Record<string.email, number.integer>"
				},
				{ ambient: keywords }
			)
			const types = $.export()
			attest<Record<string, number>>(types.map.infer)
			attest(types.map({ "a@b.com": 1 })).equals({ "a@b.com": 1 })
			attest(types.map({ "a@b.com": 1.5 }).toString()).snap(
				'["a@b.com"] must be an integer'
			)
		})
	})

	describe("plain record ambient", () => {
		it("resolves Types, Generics, and nested Modules/BoundModules", () => {
			const sub = scope({ tag: "'v1' | 'v2'" }).export()
			const Box = generic("t")({ value: "t" })
			const numFromStr = type("string.numeric.parse")

			const $ = scope(
				{
					a: "str",
					b: "num",
					c: "Box<sub.tag>",
					d: "Rec<str, sub.tag>",
					e: "text.email"
				},
				{
					ambient: {
						str: type.string,
						num: numFromStr,
						Box,
						Rec: keywords.Record,
						sub,
						text: keywords.string
					}
				}
			)

			const types = $.export()
			attest<string>(types.a.infer)
			attest<number>(types.b.infer)
			attest<string>(types.b.inferIn)
			attest<{ value: "v1" | "v2" }>(types.c.infer)
			attest<Record<string, "v1" | "v2">>(types.d.infer)
			attest<string>(types.e.infer)

			attest(types.b("42")).equals(42)
			attest(types.c({ value: "v1" })).equals({ value: "v1" })
			attest(types.d({ k: "v2" })).equals({ k: "v2" })
			attest(types.e("x@y.com")).equals("x@y.com")
			attest<string>($.type.keywords.str.infer)
			attest($.type.keywords.str("hi")).equals("hi")

			// ambient record with a generic named `t` is preserved intact by inferBootstrapped
			const TGeneric = generic("x")({ x: "x" })
			const withT = scope({ wrapped: "t<'ok'>" }, { ambient: { t: TGeneric } })
			attest<{ x: "ok" }>(withT.export().wrapped.infer)
			attest(withT.export().wrapped({ x: "ok" })).equals({ x: "ok" })

			// @ts-expect-error
			attest(() => $.type("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)
		})

		it("supports spreading a Module alongside custom entries", () => {
			const $ = scope(
				{
					email: "string.email",
					id: "custom"
				},
				{
					ambient: {
						...ark.export("string"),
						custom: type.number
					}
				}
			)

			const types = $.export()
			attest<string>(types.email.infer)
			attest<number>(types.id.infer)
			attest(types.email("a@b.com")).equals("a@b.com")
			attest(types.id(7)).equals(7)

			// @ts-expect-error
			attest(() => $.type("number")).throwsAndHasTypeError(
				writeUnresolvableMessage("number")
			)
			// @ts-expect-error
			attest(() => $.type("boolean")).throwsAndHasTypeError(
				writeUnresolvableMessage("boolean")
			)
		})

		it("rejects invalid ambient entries and non-object values", () => {
			attest(() =>
				scope(
					{ a: "'ok'" },
					{
						ambient: {
							// @ts-expect-error
							foo: "string"
						}
					}
				)
			).throwsAndHasTypeError("ambient.foo must be a Type, Generic, or Module")

			attest(() =>
				scope(
					{ a: "'ok'" },
					{
						ambient: {
							...ark.export("string"),
							// @ts-expect-error
							bad: "number"
						}
					}
				)
			).throwsAndHasTypeError("ambient.bad must be a Type, Generic, or Module")

			attest(() =>
				scope(
					{ a: "'ok'" },
					{
						ambient: {
							// @ts-expect-error
							nested: { a: type.string }
						}
					}
				)
			).throwsAndHasTypeError(
				"ambient.nested must be a Type, Generic, or Module"
			)

			attest(() =>
				scope(
					{ a: "'ok'" },
					{
						ambient: {
							// @ts-expect-error
							spreadSub: { ...ark.export("string") }
						}
					}
				)
			).throwsAndHasTypeError(
				"ambient.spreadSub must be a Type, Generic, or Module"
			)

			attest(() =>
				// @ts-expect-error
				scope({ a: "'ok'" }, { ambient: "string" })
			).throwsAndHasTypeError(
				"ambient must be a Module or a record of Types, Generics, or Modules"
			)

			attest(() =>
				// @ts-expect-error
				scope({ a: "'ok'" }, { ambient: 123 })
			).throwsAndHasTypeError(
				"ambient must be a Module or a record of Types, Generics, or Modules"
			)

			attest(() =>
				// @ts-expect-error
				scope({ a: "'ok'" }, { ambient: null })
			).throwsAndHasTypeError(
				"ambient must be a Module or a record of Types, Generics, or Modules"
			)

			attest(() =>
				// @ts-expect-error
				scope({ a: "'ok'" }, { ambient: [] })
			).throwsAndHasTypeError(
				"ambient must be a Module or a record of Types, Generics, or Modules"
			)

			attest(() =>
				// @ts-expect-error
				scope({ a: "'ok'" }, { ambient: type.string })
			).throwsAndHasTypeError(
				"ambient must be a Module or a record of Types, Generics, or Modules"
			)

			attest(() =>
				// @ts-expect-error
				scope({ a: "'ok'" }, { ambient: new Date() })
			).throws(
				"ambient must be a Module or a record of Types, Generics, or Modules"
			)
		})
	})

	describe("composition and isolation", () => {
		it("preserves custom ambient on exported Types in chained methods", () => {
			const isolated = scope(
				{ Foo: "'hello'", Bar: "'world'" },
				{ ambient: {} }
			)
			const exported = isolated.export()
			const picked = isolated.export("Foo")
			const resolved = isolated.resolve("Foo")

			// @ts-expect-error
			attest(() => exported.Foo.and("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)
			// @ts-expect-error
			attest(() => picked.Foo.or("number")).throwsAndHasTypeError(
				writeUnresolvableMessage("number")
			)
			// @ts-expect-error
			attest(() => resolved.and("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)

			const combined = exported.Foo.or("Bar")
			attest<"hello" | "world">(combined.infer)
			attest(combined("world")).equals("world")
		})

		it("spreading an isolated export/import into a default scope leaves default ambient intact", () => {
			const isolated = scope({ Foo: "'hello'" }, { ambient: {} })
			const outer = scope({
				...isolated.export(),
				bar: "string",
				pair: ["Foo", "number"]
			})

			const types = outer.export()
			attest<
				Module<{
					Foo: "hello"
					bar: string
					pair: ["hello", number]
				}>
			>(types)
			attest(types.pair(["hello", 1])).equals(["hello", 1])
			attest(outer.type.string("ok")).equals("ok")

			const viaImport = scope({
				...isolated.import(),
				pair: ["Foo", "string"]
			}).export()
			attest<Module<{ pair: ["hello", string] }>>(viaImport)
			attest(viaImport.pair(["hello", "x"])).equals(["hello", "x"])
		})

		it("supports isolated export as a submodule or another scope's ambient", () => {
			const isolated = scope({ Foo: "'hello'" }, { ambient: {} })
			const asSub = scope({ sub: isolated.export(), x: "sub.Foo" }).export()
			attest<"hello">(asSub.x.infer)
			attest(asSub.x("hello")).equals("hello")

			const chained = scope({ x: "Foo" }, { ambient: isolated.export() })
			attest<"hello">(chained.export().x.infer)
			// @ts-expect-error
			attest(() => chained.type("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)
		})

		it("shadows all of an ambient submodule with a submodule of its name", () => {
			const ambientSub = scope({
				shared: "'ambient'",
				ambientOnly: "'ambient'"
			}).export()
			const localSub = scope({ shared: "'local'" }).export()

			const $ = scope(
				{ sub: localSub, a: "sub.shared" },
				{ ambient: { sub: ambientSub } }
			)

			attest<"local">($.export().a.infer)
			attest($.export().a.expression).snap('"local"')
			// @ts-expect-error
			attest(() => $.type("sub.ambientOnly")).throwsAndHasTypeError(
				writeUnresolvableMessage("sub.ambientOnly")
			)
			// @ts-expect-error
			attest(() => $.type("sub.ambientOnly | 1")).throwsAndHasTypeError(
				writeUnresolvableMessage("sub.ambientOnly")
			)

			// unshadowed, the ambient submodule resolves both
			const unshadowed = scope(
				{ a: "sub.ambientOnly" },
				{ ambient: { sub: ambientSub } }
			)
			attest<"ambient">(unshadowed.export().a.infer)
			attest(unshadowed.export().a.expression).snap('"ambient"')
		})

		it("resolves a private submodule ahead of an ambient submodule of its name", () => {
			const ambientSub = scope({
				shared: "'ambient'",
				ambientOnly: "'ambient'"
			}).export()
			const localSub = scope({
				shared: "'local'",
				localOnly: "'local'"
			}).export()

			const $ = scope(
				{
					"#sub": localSub,
					whole: "sub.shared",
					array: "sub.shared[]",
					expression: "sub.localOnly | 1"
				},
				{ ambient: { sub: ambientSub } }
			)
			const types = $.export()

			attest<"local">(types.whole.infer)
			attest(types.whole.expression).snap('"local"')
			attest<"local"[]>(types.array.infer)
			attest(types.array.expression).snap('"local"[]')
			attest<"local" | 1>(types.expression.infer)
			attest(types.expression.expression).snap('"local" | 1')
			attest(Object.keys(types)).equals(["whole", "array", "expression"])

			// @ts-expect-error
			attest(() => $.type("sub.ambientOnly")).throwsAndHasTypeError(
				writeUnresolvableMessage("sub.ambientOnly")
			)
			// @ts-expect-error
			attest(() => $.type("sub.l")).completions({ "sub.l": ["sub.localOnly"] })
		})

		it("supports Scope.module and type.module with ambient config", () => {
			const m1 = Scope.module({ Foo: "'a'" }, { ambient: {} })
			attest<"a">(m1.Foo.infer)
			// @ts-expect-error
			attest(() => m1.Foo.and("string")).throwsAndHasTypeError(
				writeUnresolvableMessage("string")
			)

			const m2 = type.module(
				{ email: "string.email" },
				{ ambient: ark.export("string") }
			)
			attest<string>(m2.email.infer)
			attest(m2.email("a@b.com")).equals("a@b.com")
			// @ts-expect-error
			attest(() => m2.email.or("number")).throwsAndHasTypeError(
				writeUnresolvableMessage("number")
			)

			attest(() =>
				Scope.module(
					{
						// @ts-expect-error
						a: "string"
					},
					{ ambient: {} }
				)
			).throwsAndHasTypeError(writeUnresolvableMessage("string"))
		})

		it("keeps default scope behavior unchanged with no ambient or ambient: undefined", () => {
			const a = scope({ x: "string" })
			const b = scope({ x: "string" }, { name: "named" })
			const c = scope({ x: "string" }, { ambient: undefined })

			attest<Module<{ x: string }>>(a.export())
			attest<Module<{ x: string }>>(b.export())
			attest<Module<{ x: string }>>(c.export())
			attest(a.type.string("ok")).equals("ok")
			attest(b.type.string("ok")).equals("ok")
			attest(c.type.string("ok")).equals("ok")
		})

		it("rejects ambient in global configure()", () => {
			attest(() =>
				configure({
					// @ts-expect-error
					ambient: {}
				})
			).throwsAndHasTypeError("configure() has no option 'ambient'")
		})
	})

	describe("contextual references", () => {
		it("resolves a generic parameter ahead of an ambient entry of its name", () => {
			const $ = scope(
				{
					"box<t>": { whole: "t", array: "t[]", expression: "t | 2" },
					boxed: "box<'q'>",
					// outside the generic, t is the ambient entry
					plain: "t[]"
				},
				{ ambient: { t: type("1") } }
			)
			const types = $.export()

			attest<{ whole: "q"; array: "q"[]; expression: "q" | 2 }>(
				types.boxed.infer
			)
			attest(types.boxed.expression).snap(
				'{ array: "q"[], expression: "q" | 2, whole: "q" }'
			)
			attest<1[]>(types.plain.infer)
			attest(types.plain.expression).snap("1[]")

			const fromType = $.type("<t>", { v: "t" })("'q'")
			attest<{ v: "q" }>(fromType.infer)
			attest(fromType.expression).snap('{ v: "q" }')

			const fromGeneric = $.generic("t")("t[]")("'q'")
			attest<"q"[]>(fromGeneric.infer)
			attest(fromGeneric.expression).snap('"q"[]')
		})

		it("resolves this ahead of an ambient entry of its name", () => {
			const $ = scope(
				{
					// an alias has no this, so here it's the ambient entry
					aliased: { v: "this" }
				},
				{ ambient: { this: type("1") } }
			)

			attest<{ v: 1 }>($.export().aliased.infer)
			attest($.export().aliased.expression).snap("{ v: 1 }")

			const Node = $.type({ "next?": "this", siblings: "this[]" })
			attest(Node.t).type.toString.snap("{ next?: cyclic; siblings: cyclic[] }")
			attest(Node.expression).snap("{ siblings: this[], next?: this }")
			attest(Node({ siblings: [{ siblings: [] }] })).equals({
				siblings: [{ siblings: [] }]
			})
			attest(Node({ siblings: [1] }).toString()).snap(
				"siblings[0] must be an object"
			)
		})

		it("finds a public alias ahead of a generic parameter of its name", () => {
			const types = scope(
				{
					t: "1",
					"box<t>": { whole: "t", expression: "t | 2" },
					a: "box<'q'>"
				},
				{ ambient: {} }
			).export()

			attest<{ whole: 1; expression: "q" | 2 }>(types.a.infer)
			attest(types.a.expression).snap('{ expression: "q" | 2, whole: 1 }')
		})
	})

	describe("hints and completions", () => {
		it("suggests from custom ambient rather than global Ark", () => {
			const $ = scope(
				{ localAlpha: "'a'" },
				{ ambient: { customWidget: type.string } }
			)

			// typo suggests from custom ambient
			attest(() => $.type("customWidgt" as any)).throws.snap(
				"ParseError: 'customWidgt' is unresolvable. Did you mean 'customWidget'?"
			)
			// typo close to a global keyword does not suggest global Ark
			attest(() => $.type("strng" as any)).throws.snap(
				"ParseError: 'strng' is unresolvable"
			)
			// foreign alias hint (e.g. 'str' -> 'string') is omitted in custom ambient
			// @ts-expect-error
			attest(() => $.type("str")).throwsAndHasTypeError(
				writeUnresolvableMessage("str")
			)
			attest(() => $.type("str" as any)).throws.snap(
				"ParseError: 'str' is unresolvable"
			)
		})

		it("completes from custom ambient and local aliases only", () => {
			const $ = scope(
				{ localSolo: "'a'" },
				{ ambient: { sample: type.string, status: type.number } }
			)

			// @ts-expect-error
			attest(() => $.type("s")).completions({
				s: ["sample", "status"]
			})

			const empty = scope({ sole: "'a'" }, { ambient: {} })
			// @ts-expect-error
			attest(() => empty.type("s")).completions({
				s: ["sole"]
			})
		})
	})
})
