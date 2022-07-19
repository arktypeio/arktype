//prettier-ignore
import assert from "node:assert"
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
const snippetKeys = Object.keys(snippets)
const SNIP_REGEX = /@snip(Start|End|Line)/
const TEST_FILE_KEY = "docgen/test/testFile.md"
const FOLDER_MD_FILE_KEY = "docgen/test/testFiles/test.md"
const FOLDER_TS_FILE_KEY = "docgen/test/testFiles/test.ts"

describe("Extracts snippets from file path", () => {
    it("adds file from filePath", () => {
        assert(snippetKeys.includes(TEST_FILE_KEY))
    })
    it("@snipLine", () => {
        assert.equal(
            snippets[TEST_FILE_KEY].byLabel["line"].text,
            `import { model } from "@re-/model"`
        )
    })
    it("@snipStart - @snipEnd", () => {
        assert(snippets[TEST_FILE_KEY].byLabel["test1"].text.includes("Hello."))
    })
    it("removes @snip(s) from file snippet", () => {
        assert.equal(SNIP_REGEX.test(snippets[TEST_FILE_KEY].all.text), false)
    })
})
describe("Extracts snippets from Folder", () => {
    it("adds files from dirPath", () => {
        assert(snippetKeys.includes(FOLDER_MD_FILE_KEY))
        assert(snippetKeys.includes(FOLDER_TS_FILE_KEY))
    })
})
