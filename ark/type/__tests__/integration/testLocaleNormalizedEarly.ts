import { $ark } from "@ark/schema"
import { normalizeLocale } from "@ark/schema/i18n"
import { strictEqual } from "node:assert/strict"
import { cases } from "./util.ts"

// the renderer is installed before any config has resolved
const resolvedBefore = $ark.cfg !== undefined

const partial = {
	tag: "test",
	line: ctx => `${ctx.propString} → ${ctx.message}`
} satisfies import("arktype").Locale

const normalized = normalizeLocale(partial)

const { type } = await import("arktype")

cases({
	noConfigResolvedBeforeNormalizing: () => strictEqual(resolvedBefore, false),
	normalizedEarlyIsCompletedFromEn: () =>
		strictEqual(typeof normalized.cite, "function"),
	normalizedEarlyRendersLater: () =>
		strictEqual(
			type({ a: "number" })({ a: "x" }).toLocaleString(partial),
			"a → must be a number"
		)
})
