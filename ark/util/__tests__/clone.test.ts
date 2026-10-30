import { attest, contextualize } from "@ark/attest"
import { deepClone } from "@ark/util"

contextualize(() => {
	it("nested object", () => {
		const obj = { a: 1, b: { c: 2 } }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b !== obj.b).equals(true)
	})

	it("cycles", () => {
		const obj: any = { a: 1, b: { c: 2 } }
		obj.b.self = obj
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b.self).is(cloned)
	})

	it("arrays", () => {
		const obj = { a: 1, b: [2, 3, 4] }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned.b !== obj.b).equals(true)
	})

	it("keeps other builtins by reference", () => {
		const obj = { m: new Map() }
		attest(deepClone(obj).m).is(obj.m)
	})

	it("Date", () => {
		const original = new Date(2000, 1)
		const cloned = deepClone(original)
		attest(cloned).instanceOf(Date)
		attest(cloned.toISOString()).equals(original.toISOString())
		original.setDate(original.getDate() + 1)
		attest(cloned.getDate()).equals(1)
		attest(original.getDate()).equals(2)
		cloned.setDate(3)
		attest(cloned.getDate()).equals(3)
		attest(original.getDate()).equals(2)
	})

	it("can handle own getters", () => {
		let callCount = 0
		const o = {
			get foo() {
				return `foo${++callCount}`
			}
		}

		const cloned = deepClone(o)

		attest(cloned).snap({ foo: "foo2" })
		attest(o.foo).snap("foo3")
		attest(cloned.foo).snap("foo4")
	})
})
