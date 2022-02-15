import { getLinePositions, getAbsolutePositions, asNumber } from ".."

const emptyContents = ""

const onlyNewLines = "\n".repeat(50)

const variedLengths = [...Array(20)]
    .map((_, i) => (i % 2 ? "blah".repeat(i) : "\n"))
    .join("\n")

const expectedLines = {
    0: { line: 1, column: 1 },
    50: { line: 12, column: 4 },
    100: { line: 15, column: 23 },
    150: { line: 18, column: 34 },
    200: { line: 21, column: 37 }
}

describe("line positions", () => {
    test("single", () => {
        expect(getLinePositions(variedLengths, [100])).toStrictEqual([
            expectedLines[100]
        ])
    })
    test("multiple", () => {
        expect(
            getLinePositions(
                variedLengths,
                Object.keys(expectedLines).map((k) => asNumber(k)!)
            )
        ).toStrictEqual(Object.values(expectedLines))
    })
    test("new lines", () => {
        expect(getLinePositions(onlyNewLines, [0, 20])).toStrictEqual([
            { line: 1, column: 1 },
            { line: 21, column: 1 }
        ])
    })
    test("empty positions", () => {
        expect(getLinePositions(variedLengths, [])).toStrictEqual([])
    })
    test("empty content", () => {
        expect(() =>
            getLinePositions(emptyContents, [10])
        ).toThrowErrorMatchingInlineSnapshot(
            `"Positions [10] exceed the length of contents."`
        )
    })
})

describe("absolute positions", () => {
    test("single", () => {
        expect(
            getAbsolutePositions(variedLengths, [{ line: 15, column: 23 }])
        ).toStrictEqual([100])
    })
    test("multiple", () => {
        expect(
            getAbsolutePositions(variedLengths, Object.values(expectedLines))
        ).toStrictEqual(Object.keys(expectedLines).map((k) => asNumber(k)))
    })
    test("new lines", () => {
        expect(
            getAbsolutePositions(onlyNewLines, [
                { line: 1, column: 1 },
                { line: 21, column: 1 }
            ])
        ).toStrictEqual([0, 20])
    })
    test("empty positions", () => {
        expect(getAbsolutePositions(variedLengths, [])).toStrictEqual([])
    })
    test("empty content", () => {
        expect(() =>
            getAbsolutePositions(emptyContents, [{ line: 5, column: 3 }])
        ).toThrowErrorMatchingInlineSnapshot(
            `"Positions [{line: 5, column: 3}] exceed the length of contents."`
        )
    })
    test("column doesn't exist in line", () => {
        expect(() =>
            getAbsolutePositions(variedLengths, [{ line: 1, column: 5000 }])
        ).toThrowErrorMatchingInlineSnapshot(
            `"Column 5000 does not exist in line 1."`
        )
    })
})
