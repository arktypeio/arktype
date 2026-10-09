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
		const String = type("string")
		attest<string>(String.infer)
		attest(String("string")).snap("string")
	})

	it("any", () => {
		const Any = type("unknown.any")
		// equivalent to unknown at runtime
		attest(Any.json).equals(type.unknown.json)
		// inferred as any
		attest<any>(Any.infer)
	})

	it("any in expression", () => {
		const T = type("string", "&", "unknown.any")
		attest<any>(T.infer)
		attest(T.json).equals(intrinsic.string.json)
	})

	it("boolean", () => {
		const Boolean = type("boolean")
		attest<boolean>(Boolean.infer)
		const Expected = rootSchema([{ unit: false }, { unit: true }])
		// should be simplified to simple checks for true and false literals
		attest(Boolean.json).equals(Expected.json)
	})

	it("never", () => {
		const Never = type("never")
		attest<never>(Never.infer)
		const Expected = rootSchema([])
		// should be equivalent to a zero-branch union
		attest(Never.json).equals(Expected.json)
	})

	it("never in union", () => {
		const T = type("string|never")
		attest<string>(T.infer)
		attest(T.json).equals(intrinsic.string.json)
	})

	it("unknown", () => {
		const Expected = rootSchema({})
		// should be equivalent to an unconstrained predicate
		attest(type("unknown").json).equals(Expected.json)
	})
})
