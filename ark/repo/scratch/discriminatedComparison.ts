import { bench } from "@ark/attest"
import { type } from "arktype"
import z from "zod"

/** Measured with typescript@5.4.5, zod@3.23.8, arktype@2.0.0-dev.16 */

type({
	foo: "never"
})
z.object({})
z.union([z.string(), z.number()])
z.discriminatedUnion("foo", [
	z.object({
		foo: z.literal(1)
	}),
	z.object({
		foo: z.literal(2)
	})
])

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

	const also = type({
		tag: "'admin'",
		"powers?": "string[]"
	})
		.or({
			tag: "'superadmin'",
			"superpowers?": "string[]"
		})
		.or({
			tag: "'pleb'"
		})
}).types([5448, "instantiations"])

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
}).types([23757, "instantiations"])

bench("zod discriminated", () => {
	// Union must be manually discriminated using only shallow keys
	const user = z
		.discriminatedUnion("kind", [
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
		.or(
			z.discriminatedUnion("tag", [
				z.object({
					tag: z.literal("admin"),
					powers: z.string().array().optional()
				}),
				z.object({
					tag: z.literal("superadmin"),
					superpowers: z.string().array().optional()
				}),
				z.object({
					tag: z.literal("pleb")
				})
			])
		)
}).types([70123, "instantiations"])
