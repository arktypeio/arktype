import { type } from "arktype"
import { strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

// resolves arktype's config before the renderer is installed
const T = type({ a: "number" })

const { en } = await import("arktype/locales/en")

cases({
	localeSpreadFromLateEn: () =>
		strictEqual(
			T({ a: "x" }).toLocaleString({
				...en,
				tag: "test",
				message: ctx => `${ctx.propString}: ${ctx.problem}`
			}),
			"a: must be a number (was a string)"
		)
})
