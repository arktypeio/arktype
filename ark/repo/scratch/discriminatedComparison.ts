import { bench } from "@arktype/attest"
import { type } from "arktype"
import z from "zod"

/** Measured with typescript@5.4.5, zod@3.23.8, arktype@2.0.0-dev.16 */

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
}).types([7801, "instantiations"])

bench("zod", () => {
	const user = z.union([
		z.object({
			kind: z.literal("admin"),
			powers: z.string().array().optional()
		}),
		z.object({
			kind: z.literal("superadmin"),
			superpowers: z.string().array().optional()
		}),
		z.object({
			kind: z.literal("pleb")
		})
	])
}).types([24944, "instantiations"])

bench("zod discriminated", () => {
	// Union must be manually discriminated using only shallow keys
	const user = z.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("admin"),
			powers: z.string().array().optional()
		}),
		z.object({
			kind: z.literal("superadmin"),
			superpowers: z.string().array().optional()
		}),
		z.object({
			kind: z.literal("pleb")
		})
	])
}).types([71312, "instantiations"])
