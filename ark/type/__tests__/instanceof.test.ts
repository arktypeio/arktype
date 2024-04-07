import { attest } from "@arktype/attest"
import { type Ark, schema } from "@arktype/schema"
import { type } from "arktype"
import { writeInvalidConstructorMessage } from "../parser/tuple.js"
import type { Type } from "../type.js"

describe("instanceof", () => {
	describe("tuple expression", () => {
		it("base", () => {
			const t = type(["instanceof", Error])
			attest<Error>(t.infer)
			const expected = schema(Error)
			attest(t.json).equals(expected.json)
			const e = new Error()
			attest(t(e).out).equals(e)
			attest(t({}).errors?.summary).snap("must be an Error (was object)")
		})
		it("inherited", () => {
			const t = type(["instanceof", TypeError])
			const e = new TypeError()
			// for some reason the return of TypeError's constructor is actually
			// inferred as Error? Disabling this check for now, seems like an anomaly.
			// attest<TypeError>(t.infer)
			attest(t(e).out).equals(e)
			attest(t(new Error()).errors?.summary).snap(
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
			attest(t(sub).out).equals(sub)
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
		it("user-defined class", () => {
			class ArkClass {
				private isArk = true
			}
			const ark = type(["instanceof", ArkClass])
			attest<Type<ArkClass, {}>>(ark)
			// not expanded since there are no morphs
			attest(ark.infer).type.toString("ArkClass")
			attest(ark.in.infer).type.toString("ArkClass")
			const a = new ArkClass()
			attest(ark(a).out).equals(a)
			attest(ark({}).errors?.summary).snap(
				"must be an instance of ArkClass (was object)"
			)
		})
		// TODO: Fix- Investigate bidirectional check impact on perf to narrow private props without breaking this case:
		// const tt = type({
		// 	f: ["string", "=>", (s) => [] as unknown]
		// })
		// // Should be inferred as {f: unknown}
		// type FF = typeof tt.infer
		// If perf cost too high can use global type config to expand TerminallyInferredObjects
		it("class with private properties", () => {
			class ArkClass {
				private isArk = true
			}
			const ark = type(["instanceof", ArkClass])
			attest<Type<ArkClass, {}>>(ark)
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
			attest(t.json).equals(type("Date|Map").json)
		})
		it("non-constructor", () => {
			// @ts-expect-error just an assignability failure so we can't validate an error message
			attest(() => type("instanceof", new Error())).throws(
				writeInvalidConstructorMessage("Error")
			)
		})
	})
})
