import { attest } from "@arktype/attest"
import { lazily } from "@arktype/util"
import { type Module, scope, type } from "arktype"
import { it } from "vitest"

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
		...threeSixtyNoModule,
		threeSixtyNo: "three|sixty|no"
	})
	attest<{ threeSixtyNo: 3 | 60 | "no" }>($.infer)
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
		foo: "#bar[]",
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

it("generic", () => {
	const types = scope({
		foo: "bar<string>[]",
		"#bar<t>": ["t"]
	}).export()
	attest<[string][]>(types.foo.infer)
})
