import { attest, contextualize } from "@ark/attest"
import { ReadonlyPath } from "@ark/util"

contextualize(() => {
	it("creates an array of a single number", () => {
		const path = new ReadonlyPath(5)

		attest([...path]).snap([5])
	})

	it("arary methods preserve subclass", () => {
		const path = new ReadonlyPath()

		attest(path.slice()).instanceOf(ReadonlyPath)
	})
})
