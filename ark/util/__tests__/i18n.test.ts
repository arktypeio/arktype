import { attest, contextualize } from "@ark/attest"
import { isolate, listPattern } from "@ark/util"

contextualize(() => {
	const list = listPattern(
		{ two: " or ", middle: ", ", end: ", or " },
		{ two: " and ", middle: ", ", end: ", and " }
	)

	it("lists by type", () => {
		attest(list([], "or")).equals("")
		attest(list(["a", "b"], "and")).equals("a and b")
		attest(list(["a", "b", "c"], "or")).equals("a, b, or c")
	})

	it("isolate", () => {
		attest(isolate("a.b")).equals("\u2068a.b\u2069")
	})
})
