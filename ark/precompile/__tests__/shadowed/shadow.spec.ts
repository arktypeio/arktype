import { expect, test } from "vitest"
import { observe } from "./observe.ts"

test("observes what the Node driver observes", async () => {
	const { reported, ...expected } = JSON.parse(process.env.EXPECTED!)
	expect(JSON.parse(JSON.stringify(await observe()))).toEqual(expected)
})
