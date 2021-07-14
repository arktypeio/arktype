import {
    extractVersionFromDirString,
    isCurrentVersionOutdated
}
    from "../installHelpers"

describe("Helper functions", () => {
    test("extractVersionFromDirString", () => {
        const testcases = [
            { dir: "/.blahblah/0.0.34/.redo/0.0.4", expected: "0.0.4" },
            { dir: "dir/0.2.3/random/.redo02.3.4/.redo/0.4.1", expected: "0.4.1" },
            { dir: "/.redo/231241/0.02.3", expected: undefined },
            { dir: "/.redo/1.2", expected: undefined },
            { dir: "/0.2.3", expected: undefined }
        ]
        for (let test in testcases) {
            const {dir, expected} = testcases[test]
            expect(extractVersionFromDirString(dir)).toBe(expected)
        }
    }, 60000)

    test("isCurrentVersionOutdated", async () => {
        const testcases = [
            { current: "0.0.18", newVersion: "0.1.1", expected: true },
            { current: "0.1.0", newVersion: "0.1.1", expected: true },
            { current: "0.1.1", newVersion: "0.1.1", expected: false },
            { current: "99.99.99", newVersion: "0.1.1", expected: false }
        ]
        for (let test in testcases) {
            const {current, newVersion} = testcases[test]
            let outdated = isCurrentVersionOutdated(current, newVersion)
            expect(outdated).toEqual(testcases[test].expected)
        }
    }, 60000)
})