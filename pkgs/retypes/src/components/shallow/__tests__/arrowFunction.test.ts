import { ArrowFunction } from "../arrowFunction.js"

const testArgs = {
    typeSet: {},
    path: [],
    seen: [],
    ignoreExtraneousKeys: false
}

describe("ArrowFunction", () => {
    test("allows", () => {
        expect(
            ArrowFunction.parse.allows({
                definition: "(boolean)=>number",
                assignment: "function",
                ...testArgs
            })
        )
    })
})
