import { attest, contextualize } from "@arktype/attest"
import { writeDuplicateAliasError } from "@arktype/schema"
import { lazily } from "@arktype/util"
import { type Module, scope, type } from "arktype"
import { writePrefixedPrivateReferenceMessage } from "../parser/semantic/validate.js"

const threeSixtyNoScope = lazily(() =>
	scope({
		three: "3",
		sixty: "60",
		no: "'no'"
	})
)
const yesScope = lazily(() => scope({ yes: "'yes'" }))

const threeSixtyNoModule = lazily(() => threeSixtyNoScope.export())
const yesModule = lazily(() => yesScope.export())

contextualize(() => {
	it("single", () => {
		const types = scope({
			...threeSixtyNoModule,
			threeSixtyNo: "three|sixty|no"
		}).export()
		attest<Module<{ threeSixtyNo: 3 | 60 | "no" }>>(types)
	})

	it("multiple", () => {
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

	it("import & export", () => {
		const threeSixtyNoScope = scope({
			three: "3",
			sixty: "60",
			no: "'no'"
		})

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

	// TODO: reenable
	// it("generic", () => {
	// 	const types = scope({
	// 		foo: "bar<string>[]",
	// 		"#bar<t>": ["t"]
	// 	}).export()
	// 	attest<[string][]>(types.foo.infer)
	// })
})
