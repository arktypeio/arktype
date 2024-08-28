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

	it("should preserve the prototype of the object", () => {
		class MyClass {
			a: number

			constructor(a: number) {
				this.a = a
			}
		}
		const obj = new MyClass(1)
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned).instanceOf(MyClass)
	})

	it("should handle deep cycles correctly", () => {
		const obj: any = { a: 1, b: { c: 2 } }
		obj.b.self = obj
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b.self === cloned).equals(true)
	})

	it("should preserve the prototype of nested objects", () => {
		class MyClass {
			a: number

			constructor(a: number) {
				this.a = a
			}
		}
		const obj = { a: 1, b: new MyClass(2) }
		const cloned = deepClone(obj)
		attest<typeof obj>(cloned).equals(obj)
		attest(cloned !== obj).equals(true)
		attest(cloned.b !== obj.b).equals(true)
		attest(cloned.b instanceof MyClass).equals(true)
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

	it("should handle array subclasses with extra properties correctly", () => {
		class MyArray extends Array {
			extraProp = "extra"
		}

		const arr = new MyArray()
		arr.push(1, 2, 3)
		const cloned = deepClone(arr)

		attest<MyArray>(cloned).equals(arr)
		attest(cloned !== arr).equals(true)
		attest(cloned.extraProp).equals(arr.extraProp)
	})

	it("rebinds methods", () => {
		class MyClass {
			a: number

			constructor(a: number) {
				this.a = a
			}

			getA() {
				return this.a
			}

			setA(a: number) {
				this.a = a
			}
		}

		const original = new MyClass(5)
		const cloned = deepClone(original)

		attest(cloned.getA()).equals(5)

		cloned.a = 6

		attest(cloned.getA()).equals(6)

		cloned.setA(7)

		attest(cloned.getA()).equals(7)

		attest(original.a).equals(5)
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

	it("Set", () => {
		const original = new Set([1, 2, 3])
		const cloned = deepClone(original)
		attest(cloned).instanceOf(Set)
		attest(cloned.has(1)).equals(true)
		attest(cloned.has(4)).equals(false)

		cloned.add(4)
		attest(cloned.has(4)).equals(true)
		attest(original.has(4)).equals(false)
	})

	it("Map", () => {
		const original = new Map([
			[1, 2],
			[3, 4]
		])
		const cloned = deepClone(original)
		attest(cloned).instanceOf(Map)
		attest(cloned.get(1)).equals(2)
		attest(cloned.get(4)).equals(undefined)
		cloned.set(5, 6)
		attest(cloned.get(5)).equals(6)
		attest(original.get(5)).equals(undefined)
	})
})
