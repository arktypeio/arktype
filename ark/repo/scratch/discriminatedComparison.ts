// import z from "zod"
import { bench } from "@arktype/attest"
import { type } from "arktype"

bench("arktype", () => {
	// Union is automatically discriminated using shallow or deep keys
	const user = type({
		kind: "'admin'",
		"powers?": "string[]"
	})
		.or({
			kind: "'superadmin'",
			"superpowers?": "string[]"
		})
		.or({
			kind: "'pleb'"
		})
}).types([4182, "instantiations"])

// bench("zod", () => {
//     // Union must be manually discriminated using only shallow keys
//     const user = z.discriminatedUnion("kind", [
//         z.object({
//             kind: z.literal("admin"),
//             powers: z.string().array().optional()
//         }),
//         z.object({
//             kind: z.literal("superadmin"),
//             superpowers: z.string().array().optional()
//         }),
//         z.object({
//             kind: z.literal("pleb")
//         })
//     ])
// }).types([86522, "instantiations"])
