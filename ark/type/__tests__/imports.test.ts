import { attest, contextualize } from "@ark/attest"
import { writeDuplicateAliasError } from "@ark/schema"
import { scope, type, type BoundModule, type Module, type Type } from "arktype"
import { writePrefixedPrivateReferenceMessage } from "arktype/internal/parser/ast/validate.ts"

contextualize(() => {
	contextualize.each(
		"threeSixtyNoScope",
		() => {
			const threeSixtyNoScope = scope({
				three: "3",
				sixty: "60",
				no: "'no'"
			})
			const threeSixtyNoModule = threeSixtyNoScope.export()

			const yesScope = scope({ yes: "'yes'" })
			const yesModule = yesScope.export()

			return {
				threeSixtyNoScope,
				threeSixtyNoModule,
				yesScope,
				yesModule
			}
		},
		it => {
			it("single", ({ threeSixtyNoModule }) => {
				const types = scope({
					...threeSixtyNoModule,
					threeSixtyNo: "three|sixty|no"
				}).export()

				attest<
					Module<{
						three: 3
						sixty: 60
						no: "no"
						threeSixtyNo: 3 | 60 | "no"
					}>
				>(types)
			})

			it("multiple", ({ threeSixtyNoModule, yesModule }) => {
				const base = scope({
					...threeSixtyNoModule,
					...yesModule,
					extra: "true"
				})

				const imported = scope({
					...base.import(),
					a: "three|sixty|no|yes|extra"
				})

				const exports = imported.export()

				attest<Module<{ a: 3 | 60 | "no" | "yes" | true }>>(exports)
			})

			it("import & export", ({ threeSixtyNoScope }) => {
				const scopeCreep = scope({
					hasCrept: "true"
				})

				const types = scope({
					...threeSixtyNoScope.import("three", "no"),
					...scopeCreep.export(),
					public: "hasCrept|three|no|private",
					"#private": "string.uuid"
				}).export()

				attest(Object.keys(types)).equals(["hasCrept", "public"])

				attest(types.public.json).equals(type("3|'no'|string.uuid|true").json)

				// have to snapshot the module since TypeScript treats it as bivariant
				attest(types).type.toString.snap(`Module<{
	public: true | 3 | uuid | "no"
	hasCrept: true
}>`)
			})
		}
	)

	it("binds destructured exports", () => {
		const types = scope({
			foo: "1",
			bar: "foo",
			baz: "bar"
		}).export("baz")

		attest<
			BoundModule<
				{
					baz: 1
				},
				{
					foo: 1
					bar: 1
					baz: 1
				}
			>
		>(types)

		const t = types.baz.or({
			foo: "foo",
			bar: "bar",
			baz: "baz"
		})

		attest<
			Type<
				| 1
				| {
						foo: 1
						bar: 1
						baz: 1
				  },
				{
					foo: 1
					bar: 1
					baz: 1
				}
			>
		>(t)
		attest(t.expression).snap("{ bar: 1, baz: 1, foo: 1 } | 1")
		attest(t.$.json).snap({
			foo: { unit: 1 },
			bar: { unit: 1 },
			baz: { unit: 1 }
		})
	})

	it("non-generic", () => {
		const types = scope({
			foo: "bar[]",
			"#bar": "boolean"
		}).export()
		attest(Object.keys(types)).equals(["foo"])
		attest(types.foo.json).equals(type("boolean[]").json)
		attest<
			Module<{
				foo: boolean[]
				"#bar": boolean
			}>
		>(types)
	})

	it("autocompletes private references", () => {
		const $ = scope({
			"#kekw": "true"
		})

		// @ts-expect-error
		attest(() => $.type("kek")).completions({
			kek: ["kekw"]
		})

		// @ts-expect-error
		attest(() => $.type("#")).completions({})
	})

	it("errors on private reference with #", () => {
		attest(() =>
			scope({
				// @ts-expect-error
				xdd: "#kekw",
				"#kekw": "true"
			}).export()
		).throwsAndHasTypeError(writePrefixedPrivateReferenceMessage("kekw"))
	})

	it("errors on private reference with # in expression", () => {
		attest(() =>
			scope({
				// @ts-expect-error
				xdd: "string|#kekw",
				"#kekw": "true"
			}).export()
		).throwsAndHasTypeError(writePrefixedPrivateReferenceMessage("kekw"))
	})

	it("errors on public and private refrence with same name", () => {
		attest(() =>
			scope({
				kekw: "1",
				// @ts-expect-error
				"#kekw": "1"
			}).export()
		).throwsAndHasTypeError(writeDuplicateAliasError("kekw"))
		attest(() =>
			scope({
				// @ts-expect-error
				"#kekw": "1",
				kekw: "1"
			}).export()
		).throwsAndHasTypeError(writeDuplicateAliasError("kekw"))
	})

	it("private generic", () => {
		const types = scope({
			foo: "bar<string>[]",
			"#bar<t>": ["t"]
		}).export()

		const expected = type(["string"]).array()

		attest<typeof expected.t>(types.foo.t)
		attest(types.foo.expression).snap("[string][]")
		attest(types.foo.expression).equals(expected.expression)
	})
})
