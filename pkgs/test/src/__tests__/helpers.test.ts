import {
    extractVersionFromDirString,
    isNewVersionAvailable,
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
    //wastes calls to isNewVersionAvailable but if you need proof it works. 
    // test("isNewVersionAvailable", async () => {
    //     const testcases = [
    //         { package: "0.0.18", expected: true },
    //         { package: await latestVersionAvailable(), expected: false },
    //         { package: "99.99.99", expected: false }
    //     ]
    //     for (let test in testcases) {
    //         let {outdated} = await isNewVersionAvailable(testcases[test].package as string)
    //         expect(outdated).toEqual(testcases[test].expected)
    //     }
    // }, 60000)
})