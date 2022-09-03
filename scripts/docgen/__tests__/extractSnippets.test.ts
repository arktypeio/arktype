import { relative } from "node:path"
import { describe, test } from "mocha"
import { Project } from "ts-morph"
import { PackageJson } from "type-fest"
import { DocGenSnippetExtractionConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"
import { extractPackageSnippets } from "../snippets/extractSnippets.js"
import { assert } from "@re-/assert"
import { fromHere, fromPackageRoot, readPackageJson } from "@re-/node"

const repoRoot = fromPackageRoot()
const packageJsonData: PackageJson = readPackageJson(repoRoot)
const testFilesFolder = fromHere("testFiles")
const testFile = fromHere("testFile.md")
const sources: DocGenSnippetExtractionConfig[] = [
    {
        path: testFilesFolder
    },
    {
        path: testFile
    }
]
const packageMetadata: PackageMetadata = {
    name: "testData",
    version: "0.0.1",
    rootDir: repoRoot,
    packageJsonData
}
const project = new Project()
const snippets = extractPackageSnippets({
    project,
    sources,
    packageMetadata
})
const SNIP_REGEX = /@snip(Start|End|Line)/
const getFileKey = (...pathFromHere: string[]) =>
    relative(repoRoot, fromHere(...pathFromHere))
const TEST_FILE_KEY = getFileKey("testFile.md")
const FOLDER_MD_FILE_KEY = getFileKey("testFiles", "test.md")
const FOLDER_TS_FILE_KEY = getFileKey("testFiles", "test.ts")

describe("Extracts snippets from file path", () => {
    test("adds file from filePath", () => {
        assert(snippets[TEST_FILE_KEY])
    })
    test("@snipLine", () => {
        assert(snippets[TEST_FILE_KEY]["line"].text).snap(
            `import { type } from "@re-/type"`
        )
    })
    test("@snipStart - @snipEnd", () => {
        assert(snippets[TEST_FILE_KEY]["test1"].text).snap(`Hello.`)
    })
    test("removes @snip(s) from file snippet", () => {
        assert(SNIP_REGEX.test(snippets[TEST_FILE_KEY].all.text)).equals(false)
    })
})
describe("Extracts snippets from Folder", () => {
    test("adds snippets from dirPath", () => {
        assert(snippets[FOLDER_MD_FILE_KEY])
        assert(snippets[FOLDER_MD_FILE_KEY].textSnip.text).snap(
            `labore et dolore magna aliqua. Nam libero justo laoreet sit. Rutrum tellus pellentesque eu tincidunt tortor`
        )
        assert(snippets[FOLDER_TS_FILE_KEY].commentStatement.text).snap(
            `// But a type can also validate your data at runtime...`
        )
    })
})
