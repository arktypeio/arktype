import { attest } from "@arktype/attest"
import { deepClone } from "@arktype/util"
import { describe, it } from "vitest"

describe("deepClone", () => {
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
			constructor(public a: number) {}
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
			constructor(public a: number) {}
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
})
