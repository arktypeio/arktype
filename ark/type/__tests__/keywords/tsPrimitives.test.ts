import { attest, contextualize } from "@ark/attest"
import { intrinsic, rootSchema } from "@ark/schema"
import { type } from "arktype"

contextualize(() => {
	it("string strings", () => {
		/**
		 * 	In honor of @ark-expect-beta aka log(n):
		 * 		- Zirco author https://github.com/zirco-lang/zrc
		 * 		- Shameless Rust stan
		 * 		- Occasional user of ArkType libraries
		 * 		- Frequent user of ArkType Discord
		 * 		- Universally renowned two-finger speed typist
		 */
		const string = type("string")
		attest<string>(string.infer)
		attest(string("string")).snap("string")
	})

	it("any", () => {
		const any = type("unknown.any")
		// equivalent to unknown at runtime
		attest(any.json).equals(type.unknown.json)
		// inferred as any
		attest<any>(any.infer)
	})

	it("any in expression", () => {
		const t = type("string", "&", "unknown.any")
		attest<any>(t.infer)
		attest(t.json).equals(intrinsic.string.json)
	})

	it("boolean", () => {
		const boolean = type("boolean")
		attest<boolean>(boolean.infer)
		const expected = rootSchema([{ unit: false }, { unit: true }])
		// should be simplified to simple checks for true and false literals
		attest(boolean.json).equals(expected.json)
	})

	it("never", () => {
		const never = type("never")
		attest<never>(never.infer)
		const expected = rootSchema([])
		// should be equivalent to a zero-branch union
		attest(never.json).equals(expected.json)
	})

	it("never in union", () => {
		const t = type("string|never")
		attest<string>(t.infer)
		attest(t.json).equals(intrinsic.string.json)
	})

	it("unknown", () => {
		const expected = rootSchema({})
		// should be equivalent to an unconstrained predicate
		attest(type("unknown").json).equals(expected.json)
	})
})
