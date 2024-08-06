import { type, type ArkErrors } from "arktype"

const t = type({ s: "string" })

interface RuntimeErrors extends ArkErrors {
	/**must be a string or an object (was number) */
	summary: string
}

const narrowMessage = (e: unknown): e is RuntimeErrors => true

// // ---cut---
// // hover to see the type-level representation
// const getLength = type("string").pipe(s => s.length)

// const out = parseJson("{  }")

// // ---cut-start---
// // just a trick to display the runtime error
// if (!narrowMessage(good)) throw new Error()
// // ---cut-end---

// // hover "good" to see the assertion error
// len.assert(good)
