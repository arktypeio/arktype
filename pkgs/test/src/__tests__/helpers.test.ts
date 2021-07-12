import {
    extractVersionFromDirString,
    isCurrentPackageOutdated,
    latestVersionAvailable,
    versionStringToArray
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
            expect(extractVersionFromDirString(testcases[test].dir)).toBe(testcases[test].expected)
        }
    }, 60000)
    test("versionStringToArray", () => {
        const version = "1.45.5"
        const expected = ["1", "45", "5"]
        for (let num in expected) {
            expect(versionStringToArray(version)).toContain(expected[num])
        }

    }, 60000)
    test("isCurrentPackageOutdated", async () => {
        const testcases = [
            { package: "0.0.16", expected: true },
            { package: "0.0.18", expected: true },
            { package: await latestVersionAvailable(), expected: false }
        ]
        for (let test in testcases) {
            let got = await isCurrentPackageOutdated(testcases[test].package as string)
            expect(got).toEqual(testcases[test].expected)
        }
    }, 60000)
})