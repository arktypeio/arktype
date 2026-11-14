import { deepStrictEqual } from "node:assert/strict"

// e.g. Hermes, which lacks ListFormat and PluralRules, or a small-icu Node
const intl = Object.getOwnPropertyDescriptors(Intl)
for (const name of Object.getOwnPropertyNames(Intl))
	Reflect.deleteProperty(Intl, name)

// any method whose output follows the host's locale throws
const localized = [
	[Number.prototype, "toLocaleString"],
	[BigInt.prototype, "toLocaleString"],
	[Date.prototype, "toLocaleString"],
	[Date.prototype, "toLocaleDateString"],
	[Date.prototype, "toLocaleTimeString"],
	[String.prototype, "localeCompare"],
	[String.prototype, "toLocaleLowerCase"],
	[String.prototype, "toLocaleUpperCase"]
] as const
const methods = localized.map(([proto, name]) => proto[name as never])
for (const [proto, name] of localized) {
	Object.defineProperty(proto, name, {
		value: () => {
			throw new Error(`${name} reads the host's locale`)
		},
		configurable: true,
		writable: true
	})
}

process.env.TZ = "Asia/Tokyo"

const { de } = await import("arktype/locales/de")
const { matrixOf } = await import("../locales/matrix.ts")
const { cases } = await import("./util.ts")

const rendered = { jit: matrixOf(de), jitless: matrixOf(de, true) }

Object.defineProperties(Intl, intl)
for (const [i, [proto, name]] of localized.entries())
	Object.defineProperty(proto, name, { value: methods[i] })
process.env.TZ = "UTC"

cases({
	rendersWithoutIntlInAnyTimeZone: () => {
		deepStrictEqual(rendered.jit, matrixOf(de))
		deepStrictEqual(rendered.jitless, matrixOf(de))
	}
})
