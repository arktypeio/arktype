import { attest, contextualize } from "@ark/attest"
import { rootSchema } from "@ark/schema"
import { type } from "arktype"
import { writeInvalidConstructorMessage } from "arktype/internal/parser/tupleExpressions.ts"

contextualize(() => {
	describe("tuple expression", () => {
		it("base", () => {
			const t = type(["instanceof", Error])
			attest<Error>(t.infer)
			const expected = rootSchema(Error)
			attest(t.json).equals(expected.json)
			const e = new Error()
			attest(t(e)).equals(e)
			attest(t(e)).equals(e)
			attest(t({}).toString()).snap("must be an Error (was object)")
			attest(t(undefined).toString()).snap("must be an Error (was undefined)")
		})

		it("fluent", () => {
			const t = type.instanceOf(Error)

			const expected = type(["instanceof", Error])

			attest<typeof expected.t>(t.t)
			attest(t.expression).equals(expected.expression)
		})

		it("inherited", () => {
			const t = type(["instanceof", TypeError])
			const e = new TypeError()
			// for some reason the return of TypeError's constructor is actually
			// inferred as Error? Disabling this check for now, seems like an anomaly.
			// attest<TypeError>(t.infer)
			attest(t(e)).equals(e)
			attest(t(new Error()).toString()).snap(
				"must be an instance of TypeError (was Error)"
			)
		})
		it("abstract", () => {
			abstract class Base {
				abstract foo: string
			}
			class Sub extends Base {
				foo = ""
			}
			const t = type(["instanceof", Base])
			attest<Base>(t.infer)
			const sub = new Sub()
			attest(t(sub)).equals(sub)
		})
		it("multiple branches", () => {
			const t = type(["instanceof", Date, Array])
			attest<Date | unknown[]>(t.infer)
		})
		it("non-constructor", () => {
			// @ts-expect-error
			attest(() => type(["instanceof", () => {}])).type.errors(
				"Type '() => void' is not assignable to type"
			)
		})

		// If perf cost too high can use global type config to expand ArkEnv.preserve
		it("user-defined class", () => {
			class ArkClass {
				isArk = true
			}
			const ark = type(["instanceof", ArkClass])
			attest<ArkClass>(ark.t)
			// not expanded since there are no morphs
			attest(ark.infer).type.toString("ArkClass")
			attest(ark.in.infer).type.toString("ArkClass")
			const a = new ArkClass()
			attest(ark(a)).equals(a)
			attest(ark({}).toString()).snap(
				"must be an instance of ArkClass (was object)"
			)
		})
		it("bidirectional checks doesn't break pipe inference", () => {
			const tt = type({
				f: ["string", "=>", () => [] as unknown]
			})
			// Should be inferred as {f: unknown}
			attest<{ f: unknown }>(tt.infer)
		})

		it("class with private properties", () => {
			class ArkClass {
				private isArk = true
			}
			const ark = type(["instanceof", ArkClass])

			attest<ArkClass>(ark.t)
			// not expanded since there are no morphs
			attest(ark.infer).type.toString("ArkClass")
			attest(ark.in.infer).type.toString("ArkClass")
		})
	})

	describe("root expression", () => {
		it("class", () => {
			const t = type("instanceof", Error)
			attest<Error>(t.infer)
			attest(t.json).equals(type(["instanceof", Error]).json)
		})
		it("instance branches", () => {
			const t = type("instanceof", Date, Map)
			attest<Date | Map<unknown, unknown>>(t.infer)
			attest(t.json).equals(type("Date | Map").json)
		})
		it("non-constructor", () => {
			// @ts-expect-error just an assignability failure so we can't validate an error message
			attest(() => type("instanceof", new Error())).throws(
				writeInvalidConstructorMessage("Error")
			)
		})
	})
})
