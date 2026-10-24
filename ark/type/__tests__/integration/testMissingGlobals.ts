import { strictEqual, throws } from "node:assert/strict"

// e.g. a mini program, an AudioWorklet or an embedded V8 or QuickJS
for (const name of [
	"Blob",
	"File",
	"FormData",
	"Headers",
	"Request",
	"Response",
	"URL"
])
	Reflect.deleteProperty(globalThis, name)

const { writeUnresolvableMessage } = await import("@ark/schema")
const { type } = await import("arktype")
const { cases } = await import("./util.ts")

cases({
	validates: () => {
		const T = type({ "source?": "string | number" })
		strictEqual(T.allows({ source: 1 }), true)
		strictEqual(
			T({ source: true }).toString(),
			"source must be a number or a string (was boolean)"
		)
	},
	describesClassesNamedLikeMissingGlobals: () => {
		class Blob {}
		class Headers {}
		strictEqual(
			type("Date")(new Blob()).toString(),
			"must be a Date (was an object)"
		)
		strictEqual(
			type("Date")(new Headers()).toString(),
			"must be a Date (was an object)"
		)
	},
	rejectsKeywordsOfMissingGlobals: () => {
		const message = writeUnresolvableMessage("Blob")
		throws(() => type("Blob"), { message })
		throws(() => type("Blob | string"), { message })
	}
})
