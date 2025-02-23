import { scope, type } from "arktype"
import { z } from "zod"

const zodUser = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("admin"), powers: z.string().array().optional() }),
	z.object({
		kind: z.literal("superadmin"),
		superpowers: z.string().array().optional()
	}),
	z.object({ kind: z.literal("pleb") })
])

export const arkUser = type({
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
