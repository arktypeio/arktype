import { attest, contextualize } from "@ark/attest"
import { defineLazily } from "@ark/util"

const lazyCount = (o: object): (() => number) => {
	let computed = 0
	defineLazily(o, "k", () => ++computed)
	return () => computed
}

contextualize(() => {
	it("holds its result as a plain property once read", () => {
		const o = {} as { k: number }
		const computed = lazyCount(o)
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
		attest(Object.getOwnPropertyDescriptor(o, "k")?.value).equals(1)
	})

	it("assign before read", () => {
		const o = {} as { k: number }
		const computed = lazyCount(o)
		o.k = 5
		attest(o.k).equals(5)
		attest(computed()).equals(0)
	})

	it("reads through an object frozen before its first read", () => {
		const o = {} as { k: number }
		const computed = lazyCount(o)
		Object.freeze(o)
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
	})

	it("reads through an object sealed before its first read", () => {
		const o = {} as { k: number }
		const computed = lazyCount(o)
		Object.seal(o)
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
	})

	it("reads through a non-extensible object inheriting it", () => {
		const proto = {}
		const computed = lazyCount(proto)
		const o = Object.preventExtensions(Object.create(proto)) as { k: number }
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
	})
})
