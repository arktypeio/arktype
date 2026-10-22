import { expect, test } from "vitest"
import { results } from "./main.ts"

test("validates under the configuration", () => {
	expect(`${JSON.stringify(results)}\n`).toBe(process.env.EXPECTED)
})
