import { expect, test } from "vitest"
import { observe } from "./observe.ts"

test("observes what the Node driver observes", async () => {
	expect(JSON.parse(JSON.stringify(await observe()))).toEqual(
		JSON.parse(process.env.EXPECTED!)
	)
})
