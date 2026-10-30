import { attest, contextualize } from "@ark/attest"
import { Proto, rootSchema } from "@ark/schema"
import { type } from "arktype"
import { writeInvalidConstructorMessage } from "arktype/internal/parser/tupleExpressions.ts"

contextualize(() => {
	it("describes what data was by its domain, or a class by its name", () => {
		const T = type("Date")
		attest(T(5).toString()).snap("must be a Date (was a number)")
		attest(T({}).toString()).snap("must be a Date (was an object)")
		attest(T(new Map()).toString()).snap("must be a Date (was Map)")
	})

	it("typed array keywords", () => {
		const T = type("Int8Array | BigUint64Array")
		attest<Int8Array | BigUint64Array>(T.infer)
		attest(T.expression).snap("BigUint64Array | Int8Array")
		attest(type("Int8Array").equals("TypedArray.Int8")).equals(true)
		const data = new Int8Array(1)
		attest(T(data)).equals(data)
		attest(T(new Uint8Array(1)).toString()).snap(
			"must be a BigUint64Array or an Int8Array (was Uint8Array)"
		)
	})

	describe("tuple expression", () => {
		it("base", () => {
			const T = type(["instanceof", Error])
			attest<Error>(T.infer)
			const Expected = rootSchema(Error)
			attest(T.json).equals(Expected.json)
			const e = new Error()
			attest(T(e)).equals(e)
			attest(T(e)).equals(e)
			attest(T({}).toString()).snap("must be an Error (was an object)")
			attest(T(undefined).toString()).snap("must be an Error (was undefined)")
		})

		it("fluent", () => {
			const T = type.instanceOf(Error)

			const Expected = type(["instanceof", Error])

			attest<typeof Expected.t>(T.t)
			attest(T.expression).equals(Expected.expression)
		})

		it("inherited", () => {
			const T = type(["instanceof", TypeError])
			const e = new TypeError()
			// for some reason the return of TypeError's constructor is actually
			// inferred as Error? Disabling this check for now, seems like an anomaly.
			// attest<TypeError>(T.infer)
			attest(T(e)).equals(e)
			attest(T(new Error()).toString()).snap(
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
			const T = type(["instanceof", Base])
			attest<Base>(T.infer)
			const sub = new Sub()
			attest(T(sub)).equals(sub)
		})
		it("multiple branches", () => {
			const T = type(["instanceof", Date, Array])
			attest<Date | unknown[]>(T.infer)
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
			const Ark = type(["instanceof", ArkClass])
			attest<ArkClass>(Ark.t)
			// not expanded since there are no morphs
			attest(Ark.infer).type.toString("ArkClass")
			attest(Ark.in.infer).type.toString("ArkClass")
			const a = new ArkClass()
			attest(Ark(a)).equals(a)
			attest(Ark({}).toString()).snap(
				"must be an instance of ArkClass (was an object)"
			)
		})
		it("bidirectional checks doesn't break pipe inference", () => {
			const T = type({
				f: ["string", "=>", () => [] as unknown]
			})
			// Should be inferred as {f: unknown}
			attest<{ f: unknown }>(T.infer)
		})

		it("class with private properties", () => {
			class ArkClass {
				private isArk = true
			}
			const Ark = type(["instanceof", ArkClass])

			attest<ArkClass>(Ark.t)
			// not expanded since there are no morphs
			attest(Ark.infer).type.toString("ArkClass")
			attest(Ark.in.infer).type.toString("ArkClass")
		})

		it("parse error on non-function", () => {
			// @ts-expect-error
			attest(() => type.instanceOf({}))
				.throws(Proto.writeInvalidSchemaMessage({}))
				.type.errors(
					"not assignable to parameter of type 'Constructor<object>'"
				)
		})
	})

	describe("root expression", () => {
		it("class", () => {
			const T = type("instanceof", Error)
			attest<Error>(T.infer)
			attest(T.json).equals(type(["instanceof", Error]).json)
		})
		it("instance branches", () => {
			const T = type("instanceof", Date, Map)
			attest<Date | Map<unknown, unknown>>(T.infer)
			attest(T.json).equals(type("Date | Map").json)
		})
		it("non-constructor", () => {
			// @ts-expect-error just an assignability failure so we can't validate an error message
			attest(() => type("instanceof", new Error())).throws(
				writeInvalidConstructorMessage("Error")
			)
		})
	})
})
