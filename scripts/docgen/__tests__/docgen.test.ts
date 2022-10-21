import { relative } from "node:path"
import { test } from "mocha"
import { Project } from "ts-morph"
import { assert } from "../../../@arktype/assert/src/index.js"
import { config } from "../main.js"
import { extractSnippets } from "../snippets/extractSnippets.js"
import { fromHere, walkPaths } from "@arktype/node"

test("snippet extraction", () => {
    const sourcePaths = walkPaths(fromHere("testFiles")).map((path) =>
        relative(config.dirs.repoRoot, path)
    )
    const project = new Project()
    const snippetsByPath = extractSnippets(sourcePaths, project)
    assert(snippetsByPath).snap()
})
