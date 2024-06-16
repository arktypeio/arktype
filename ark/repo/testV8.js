import { type } from "arktype"
import { fromHere } from "@arktype/fs"

console.log(
	"⏱️  Checking for V8 fast properties (https://v8.dev/blog/fast-properties) on Type...\n"
)

const t = type({
	a: "string",
	b: "number"
})

let hasFastProperties

try {
	hasFastProperties = eval("%HasFastProperties(t)")
} catch {
	throw new Error(`This test must be run in a V8-based runtime with the --allow-natives-syntax flag, e.g.:
node --allow-natives-syntax ${fromHere()}`)
}

if (!hasFastProperties) {
	throw new Error("⚠️  Type instance has been deoptimized.")
}

console.log("🏎️  Type instance has fast properties!")
