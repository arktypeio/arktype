import { attest } from "@arktype/test"
import { arktypes, scope } from "../type/main.js"
import { suite, test } from "mocha"

suite("tsGenerics", () => {
	// test("in scope", () => {
	//     const types = scope({
	//         t: "Record<string, number>"
	//     }).export()
	//     attest(types.t.infer).typed as Record<string, number>
	// })
	// test("in module", () => {
	//     const t = arktypes.Record("string", "number")
	//     attest(t.infer).typed as Record<string, number>
	// })
})
