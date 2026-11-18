import { attest, contextualize } from "@ark/attest"
import { deepClone, shallowClone } from "@ark/util"

const temporal = (
	globalThis as {
		Temporal?: Record<
			"Instant" | "PlainDate",
			{ from: (iso: string) => object }
		>
	}
).Temporal

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

	if (temporal) {
		const { Instant, PlainDate } = temporal

		it("preserves native Temporal values nested in a deep clone", () => {
			const original = {
				at: Instant.from("2026-11-04T00:00:00Z"),
				dates: [PlainDate.from("2026-11-04")]
			}
			const cloned = deepClone(original)
			attest(cloned !== original).equals(true)
			attest(cloned.dates !== original.dates).equals(true)
			attest(cloned.at.toString()).equals("2026-11-04T00:00:00Z")
			attest(cloned.dates[0].toString()).equals("2026-11-04")
		})

		it("preserves a native Temporal value passed directly to shallowClone", () => {
			const original = PlainDate.from("2026-11-04")
			attest(shallowClone(original).toString()).equals("2026-11-04")
		})
	}

	it("deep clones ordinary objects with a Temporal-like tag", () => {
		const original = {
			[Symbol.toStringTag]: "Temporal.Instant",
			nested: { count: 1 }
		}
		const cloned = deepClone(original)
		attest(cloned !== original).equals(true)
		attest(cloned.nested !== original.nested).equals(true)
		attest(cloned.nested.count).equals(1)
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
