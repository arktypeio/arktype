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
            ArrowFunction.parser.allows({
                definition: "(boolean)=>number",
                assignment: "function",
                ...testArgs
            })
        )
    })
})
