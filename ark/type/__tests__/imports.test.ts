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

				attest(Object.keys(exports)).equals(["a"])
				attest(exports.a.expression).snap('"no" | "yes" | 3 | 60 | true')

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
	public: string | true | 3
	hasCrept: true
}>`)
			})
		}
	)

	it("docs example", () => {
		const shapeScope = scope({
			// aliases with a "#" prefix are treated as private
			"#baseShapeProps": {
				perimeter: "number",
				area: "number"
			},
			ellipse: {
				// when referencing a private alias, the "#" should not be included
				"...": "baseShapeProps",
				radii: ["number", "number"]
			},
			rectangle: {
				"...": "baseShapeProps",
				width: "number",
				height: "number"
			}
		})

		// private aliases can be referenced from any scoped definition,
		// even outside the original scope
		const partialShape = shapeScope.type("Partial<baseShapeProps>")

		attest<{
			perimeter?: number
			area?: number
		}>(partialShape.t)
		attest<typeof shapeScope>(partialShape.$)

		attest(partialShape.expression).snap(
			"{ area?: number, perimeter?: number }"
		)

		// when the scope is exported to a Module, they will not be included
		// hover to see the Scope's exports
		const shapeModule = shapeScope.export()

		attest(Object.keys(shapeModule)).equals(["ellipse", "rectangle"])
		attest(shapeModule).type.toString.snap(`Module<{
	ellipse: {
		perimeter: number
		area: number
		radii: [number, number]
	}
	rectangle: {
		perimeter: number
		area: number
		width: number
		height: number
	}
}>`)
	})

	it("docs import example", () => {
		const utilityScope = scope({
			"withId<o extends object>": {
				"...": "o",
				id: "string"
			}
		})

		const userModule = type.module({
			// because we use `import()` here, we can reference our utilities
			// internally, but they will not be included in `userModule`.
			// if we used `export()` instead, `withId` could be accessed on `userModule`.
			...utilityScope.import(),
			payload: {
				name: "string",
				age: "number"
			},
			db: "withId<payload>"
		})

		attest(Object.keys(userModule)).equals(["payload", "db"])
		attest(userModule).type.toString.snap(`Module<{
	payload: { name: string; age: number }
	db: { name: string; age: number; id: string }
}>`)
	})

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

		const T = types.baz.or({
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
		>(T)
		attest(T.expression).snap("{ bar: 1, baz: 1, foo: 1 } | 1")
		attest(T.$.json).snap({
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

		const Expected = type(["string"]).array()

		attest<typeof Expected.t>(types.foo.t)
		attest(types.foo.expression).snap("[string][]")
		attest(types.foo.expression).equals(Expected.expression)
	})
})
