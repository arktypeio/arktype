import { attest, contextualize } from "@ark/attest"
import { defineLazily } from "@ark/util"

const lazyCount = (o: object): (() => number) => {
	let computed = 0
	defineLazily(o, "k", () => ++computed)
	return () => computed
}

contextualize(() => {
	it("caches as own property", () => {
		const o = {} as { k: number }
		const computed = lazyCount(o)
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
		attest(Object.getOwnPropertyDescriptor(o, "k")?.value).equals(1)
	})

	it("frozen before read", () => {
		const o = {} as { k: number }
		const computed = lazyCount(o)
		Object.freeze(o)
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
	})

	it("inheritor", () => {
		const proto = {}
		const computed = lazyCount(proto)
		const o = Object.create(proto) as { k: number }
		attest(o.k).equals(1)
		attest(o.k).equals(1)
		attest(computed()).equals(1)
		attest(Object.keys(o)).equals([])
	})

	it("resolves each key with one thunk", () => {
		const o = {} as { a: string; b: string }
		const resolve = (k: string) => k.toUpperCase()
		defineLazily(o, "a", resolve)
		defineLazily(o, "b", resolve)
		attest([o.a, o.b]).equals(["A", "B"])
	})
})
