import { fromHere, fromDir, readJson } from "@re-do/node"
import { version as testVersion } from "../install.js"

const repoRoot = fromHere("..", "..", "..", "..")
const fromRepoRoot = fromDir(repoRoot)

test("Matches app version", () => {
    const appVersion = readJson(
        fromRepoRoot("pkgs", "app", "package.json")
    ).version
    expect(appVersion).toEqual(testVersion)
})

test("Matches website version", () => {
    const websiteVersion = readJson(
        fromRepoRoot("pkgs", "website", "package.json")
    ).version
    expect(websiteVersion).toEqual(testVersion)
})
