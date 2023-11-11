import { attest } from "@arktype/attest"
import { lazily } from "@arktype/util"
import type { Ark, Module } from "arktype"
import { scope, type } from "arktype"

describe("scope imports", () => {
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

	it("single", () => {
		const $ = scope({
			...threeSixtyNoModule
		}).scope({ threeSixtyNo: "three|sixty|no" })
		attest<{ threeSixtyNo: 3 | 60 | "no" }>($.infer)
	})

	it("multiple", () => {
		const base = scope({
			...threeSixtyNoModule,
			...yesModule,
			extra: "true"
		})

		const imported = base.scope({
			a: "three|sixty|no|yes|extra"
		})

		attest<{ a: 3 | 60 | "no" | "yes" | true }>(imported.infer)
	})

	// TODO: fix, tests for more duplicate scenarios
	// it("duplicate alias", () => {
	//     attest(() =>
	//         scope({ a: "boolean" })
	//             .scope(
	//                 // @ts-expect-error
	//                 { a: "string" }
	//             )
	//             .export()
	//     ).throwsAndHasTypeError(writeDuplicateAliasesMessage("a"))
	// })

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
				exports: {
					hasCrept: true
					public: string | true | 3
				}
				locals: {
					three: 3
					no: "no"
					private: string
				}
				ambient: Ark
			}>
		>(types)
	})
})

describe("private aliases", () => {
	it("non-generic", () => {
		const types = scope({
			foo: "bar[]",
			"#bar": "boolean"
		}).export()
		attest(Object.keys(types)).equals(["foo"])
		attest(types.foo.json).equals(type("boolean[]").json)
		attest<
			Module<{
				exports: { foo: boolean[] }
				locals: { bar: boolean }
				ambient: Ark
			}>
		>(types)
	})
	it("generic", () => {
		const types = scope({
			foo: "bar<string>[]",
			"#bar<t>": ["t"]
		}).export()
		attest<[string][]>(types.foo.infer)
	})
})
