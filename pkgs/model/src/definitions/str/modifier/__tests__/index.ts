import { testOptional } from "./optional.assert.js"

export const testModifier = () => {
    describe("modifier", () => {
        describe("optional", testOptional)
    })
}
