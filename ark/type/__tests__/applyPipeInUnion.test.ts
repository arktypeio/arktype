import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("type.or applies pipe on the matching instanceOf branch and returns the transformed value", () => {
		class TypeA {
			type = "typeA"
			constructor() {}
		}

		class TypeB {
			type = "typeB"
			constructor() {}
		}

		const typeA = new TypeA()

		const Thing = type.or(
			type.instanceOf(TypeB),
			type.string.pipe(_value => new TypeB()),
			type.instanceOf(TypeA).pipe(_value => new TypeB())
		)

		const out = Thing.assert(typeA)
		attest(out instanceof TypeB).equals(true)
	})
})
