import { attest, contextualize } from "@ark/attest"
import { writeDuplicateAliasError, type Morph } from "@ark/schema"
import { scope, type, type Module } from "arktype"
import { writePrefixedPrivateReferenceMessage } from "../parser/semantic/validate.js"

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
			it("single", ctx => {
				const types = scope({
					...ctx.threeSixtyNoModule,
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
					"#private": "uuid"
				}).export()

				attest(Object.keys(types)).equals(["hasCrept", "public"])

				attest(types.public.json).equals(type("3|'no'|uuid|true").json)

				attest<
					Module<{
						hasCrept: true
						public: string | true | 3
						"#three": 3
						"#no": "no"
						"#private": string
					}>
				>(types)
			})
		}
	)

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
		).throwsAndHasTypeError(writePrefixedPrivateReferenceMessage("#kekw"))
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
	})
})
