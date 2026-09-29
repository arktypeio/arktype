import { attest, contextualize } from "@ark/attest"
import { deepClone } from "@ark/util"

contextualize(() => {
	it("should return a deep clone of a simple object", () => {
		const obj = { a: 1, b: 2, c: 3 }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
	})

	it("should return a deep clone of a nested object", () => {
		const obj = { a: 1, b: { c: 2 } }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b !== obj.b).equals(true)
	})

	it("should handle cycles correctly", () => {
		const obj: any = { a: 1 }
		obj.self = obj
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.self === cloned).equals(true)
	})

	it("should handle deep cycles correctly", () => {
		const obj: any = { a: 1, b: { c: 2 } }
		obj.b.self = obj
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b.self === cloned).equals(true)
	})

	it("should handle null values correctly", () => {
		const obj = { a: 1, b: null }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
	})

	it("should handle undefined values correctly", () => {
		const obj = { a: 1, b: undefined }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
	})

	it("should handle arrays correctly", () => {
		const obj = { a: 1, b: [2, 3, 4] }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b !== obj.b).equals(true)
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

	it("defines properties it could assign through a Proxy prototype", () => {
		const traps: string[] = []
		const proto = new Proxy(
			{},
			{
				has: (target, k) => {
					traps.push(`has ${String(k)}`)
					return Reflect.has(target, k)
				},
				// stores nothing
				set: (_, k) => {
					traps.push(`set ${String(k)}`)
					return true
				}
			}
		)
		const original = Object.create(proto)
		Object.defineProperties(original, {
			a: { value: 1, writable: true, enumerable: true, configurable: true },
			b: {
				value: { c: 2 },
				writable: true,
				enumerable: true,
				configurable: true
			}
		})

		const cloned = deepClone(original)

		attest(Object.getPrototypeOf(cloned) === proto).equals(true)
		attest(Object.getOwnPropertyDescriptors(cloned)).equals(
			Object.getOwnPropertyDescriptors(original)
		)
		attest(cloned.b !== original.b).equals(true)
		attest(traps).equals([])
	})
})
