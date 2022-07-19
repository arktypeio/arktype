import { join } from "node:path"
import { assert } from "@re-/assert"
import { fromHere, readPackageJson } from "@re-/node"
import { Project } from "ts-morph"
import { PackageJson } from "type-fest"
import { DocGenSnippetExtractionConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"
import { extractPackageSnippets } from "../snippets/extractSnippets.js"

const rootDir = fromHere("..", "..")
const packageJsonData: PackageJson = readPackageJson(rootDir)
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
    rootDir,
    packageJsonData
}
const project = new Project()
const snippets = extractPackageSnippets({
    project,
    sources,
    packageMetadata
})
const SNIP_REGEX = /@snip(Start|End|Line)/
const TEST_FILE_KEY = join("docgen", "test", "testFile.md")
const FOLDER_MD_FILE_KEY = join("docgen", "test", "testFiles", "test.md")
const FOLDER_TS_FILE_KEY = join("docgen", "test", "testFiles", "test.ts")

describe("Extracts snippets from file path", () => {
    it("adds file from filePath", () => {
        assert(snippets[TEST_FILE_KEY])
    })
    it("@snipLine", () => {
        assert(snippets[TEST_FILE_KEY].byLabel["line"].text).snap(
            `import { model } from "@re-/model"`
        )
    })
    it("@snipStart - @snipEnd", () => {
        assert(snippets[TEST_FILE_KEY].byLabel["test1"].text).snap(`Hello.`)
    })
    it("removes @snip(s) from file snippet", () => {
        assert(SNIP_REGEX.test(snippets[TEST_FILE_KEY].all.text)).equals(false)
    })
})
describe("Extracts snippets from Folder", () => {
    it("adds snippets from dirPath", () => {
        assert(snippets[FOLDER_MD_FILE_KEY])
        assert(snippets[FOLDER_MD_FILE_KEY].byLabel.textSnip.text).snap(
            `labore et dolore magna aliqua. Nam libero justo laoreet sit. Rutrum tellus pellentesque eu tincidunt tortor`
        )
        assert(snippets[FOLDER_TS_FILE_KEY].byLabel.commentStatement.text).snap(
            `// But a model can also validate your data at runtime...`
        )
    })
})
