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

	it("returns objects with internal slots as is", () => {
		class Subclassed extends Map<string, number> {}
		// shaped like a Temporal polyfill: state outside the object, own tag
		const slots = new WeakMap<object, string>()
		class Polyfilled {
			declare [Symbol.toStringTag]: string
			constructor() {
				slots.set(this, "slot")
			}
			get value() {
				return slots.get(this)
			}
		}
		Polyfilled.prototype[Symbol.toStringTag] = "Temporal.Instant"

		const original = {
			subclassed: new Subclassed([["a", 1]]),
			view: new DataView(new ArrayBuffer(1)),
			polyfilled: new Polyfilled()
		}
		const cloned = deepClone(original)
		attest(cloned !== original).equals(true)
		attest(cloned.subclassed).is(original.subclassed)
		attest(cloned.view).is(original.view)
		attest(cloned.polyfilled.value).equals("slot")
	})

	it("copies a class instance with its prototype", () => {
		class Point {
			nested = { x: 1 }
		}
		const original = new Point()
		const cloned = deepClone(original)
		attest(cloned).instanceOf(Point)
		attest(cloned !== original).equals(true)
		attest(cloned.nested !== original.nested).equals(true)
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

	it("does not treat plain objects with constructor: Date as Dates", () => {
		const fakeDate = { constructor: Date, a: { nested: 1 } }
		const cloned = deepClone(fakeDate)
		attest(cloned instanceof Date).equals(false)
		attest(cloned !== fakeDate).equals(true)
		attest(cloned.a !== fakeDate.a).equals(true)
		attest(cloned.a).equals({ nested: 1 })
		attest(cloned.constructor).is(Date)

		const fakeWithGetTime = { constructor: Date, getTime: () => 0 }
		const clonedWithGetTime = deepClone(fakeWithGetTime)
		attest(clonedWithGetTime instanceof Date).equals(false)
		attest(clonedWithGetTime.getTime).is(fakeWithGetTime.getTime)
	})

	it("deeply clones symbol-keyed nested objects and cycles", () => {
		const sym = Symbol("nested")
		const cycSym = Symbol("cyc")
		const orig: Record<symbol, any> = {
			[sym]: { count: 1 }
		}
		orig[cycSym] = { back: orig }

		const cloned = deepClone(orig)
		attest(cloned !== orig).equals(true)
		attest(cloned[sym] !== orig[sym]).equals(true)
		attest(cloned[sym]).equals({ count: 1 })
		attest(cloned[cycSym] !== orig[cycSym]).equals(true)
		attest(cloned[cycSym].back).is(cloned)
	})
})
