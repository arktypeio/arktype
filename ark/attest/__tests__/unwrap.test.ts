import { attest, contextualize } from "@ark/attest"

contextualize(() => {
	it("unwraps unversioned", () => {
		attest(attest({ foo: "bar" }).unwrap()).equals({
			foo: "bar"
		})
	})

	it("unwraps serialized", () => {
		attest(
			attest({ foo: Symbol("unwrappedSymbol") }).unwrap({ serialize: true })
		).snap({ foo: "Symbol(unwrappedSymbol)" })
	})
})
