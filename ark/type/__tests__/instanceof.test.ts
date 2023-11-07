import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import { type } from "arktype"
import { suite, test } from "mocha"
import { writeInvalidConstructorMessage } from "../parser/tuple.js"
import type { Ark } from "../scopes/ark.js"
import type { Type } from "../type.js"

suite("instanceof", () => {
	suite("tuple expression", () => {
		test("base", () => {
			const t = type(["instanceof", Error])
			attest<Error>(t.infer)
			attest(t.condition).equals(node(Error).condition)
			const e = new Error()
			attest(t(e).data).equals(e)
			attest(t({}).problems?.summary).snap("Must be an Error (was Object)")
		})
		test("inherited", () => {
			const t = type(["instanceof", TypeError])
			const e = new TypeError()
			// for some reason the return of TypeError's constructor is actually
			// inferred as Error? Disabling this check for now, seems like an anomaly.
			// attest<TypeError>(t.infer)
			attest(t(e).data).equals(e)
			attest(t(new Error()).problems?.summary).snap(
				"Must be an instance of TypeError (was Error)"
			)
		})
		test("multiple branches", () => {
			const t = type(["instanceof", Date, Array])
			attest<Date | unknown[]>(t.infer)
		})
		test("non-constructor", () => {
			// @ts-expect-error
			attest(() => type(["instanceof", () => {}])).type.errors(
				"Type '() => void' is not assignable to type"
			)
		})
		test("user-defined class", () => {
			class ArkClass {
				private isArk = true
			}
			const ark = type(["instanceof", ArkClass])
			attest<Type<ArkClass, Ark>>(ark)
			// not expanded since there are no morphs
			attest(ark.infer).type.toString("ArkClass")
			attest(ark.inferIn).type.toString("ArkClass")
			const a = new ArkClass()
			attest(ark(a).data).equals(a)
			attest(ark({}).problems?.summary).snap(
				"Must be an instance of ArkClass (was Object)"
			)
		})
		// TODO: Fix- Investigate bidirectional check impact on perf to narrow private props without breaking this case:
		// const tt = type({
		// 	f: ["string", "=>", (s) => [] as unknown]
		// })
		// // Should be inferred as {f: unknown}
		// type FF = typeof tt.infer
		// If perf cost too high can use global type config to expand TerminallyInferredObjects
		test("class with private properties", () => {
			class ArkClass {
				private isArk = true
			}
			const ark = type(["instanceof", ArkClass])
			attest<Type<ArkClass, Ark>>(ark)
			// not expanded since there are no morphs
			attest(ark.infer).type.toString("ArkClass")
			attest(ark.inferIn).type.toString("ArkClass")
		})
	})
	suite("root expression", () => {
		test("class", () => {
			const t = type("instanceof", Error)
			attest<Error>(t.infer)
			attest(t.condition).equals(type(["instanceof", Error]).condition)
		})
		test("instance branches", () => {
			const t = type("instanceof", Date, Map)
			attest<Date | Map<unknown, unknown>>(t.infer)
			attest(t.condition).equals(type("Date|Map").condition)
		})
		test("non-constructor", () => {
			// @ts-expect-error just an assignability failure so we can't validate an error message
			attest(() => type("instanceof", new Error())).throws(
				writeInvalidConstructorMessage("Error")
			)
		})
	})
})
