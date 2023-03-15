// Ideally I think it should be generated to a new keywords.mdx file that would neatly
// list them all, the scope they belong to, and a description for the validation ones.
// You can use whatever method you want to get that to happen. The goals are:

import { readFileSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fromHere } from "../../runtime/fs.ts"
import { shell } from "../../runtime/shell.ts"

const docsPath = fromHere("..", "..", "arktype.io", "docs", "api")

const paths = [
    join(docsPath, "jsobjectsscope.md"),
    join(docsPath, "tskeywordsscope.md"),
    join(docsPath, "validationscope.md")
]

const keywordData = []

for (const path of paths) {
    const contents = readFileSync(path, { encoding: "utf-8" })

    let descriptionObject
    const descriptionMatcher = /(?<=descriptions: ).+/
    const matchedDescription = contents.match(descriptionMatcher)
    if (matchedDescription) {
        descriptionObject = JSON.parse(matchedDescription[0])
    }

    const scopeContents = contents.match(/```ts[\s\S]*?```/)
    if (!scopeContents) {
        continue
    }
    const objectMatch = scopeContents[0].match(/{[\s\S]*?}/)
    if (!objectMatch) {
        continue
    }
    const matchedObject = objectMatch[0].split("\n")
    const props = matchedObject.slice(1, matchedObject.length - 1)
    type Keywords = {
        path: string
        types: Record<string, Record<string, string>>
    }
    const keywords: Keywords = {
        path: relative(".", path),
        types: {}
    }
    for (const prop of props) {
        const keyword = prop.trim().match(/^([^:]+):(.+)$/)
        if (keyword) {
            keywords.types[keyword[1]] = {
                type: keyword[2],
                comment: descriptionObject
                    ? descriptionObject[keyword[1]] ?? ""
                    : ""
            }
        }
    }
    keywordData.push(keywords)
}

let newContents = ""
const tableHeader = `| Name   | Type   | Description          |\n| ------ | ------ | -------------------- |`
for (const data of keywordData) {
    const section = []
    section.push(`\n## ${data.path}`)
    section.push(tableHeader)
    Object.entries(data.types).forEach((type) => {
        const comment = type[1].comment
        const additional = comment.length ? comment : "----"
        section.push(`| ${type[0]} | ${type[1].type} | ${additional} |`)
    })
    newContents += `${section.join("\n")}\n`
}
const outputPath = join(docsPath, "outputKeywords.md")
// writeFileSync(outputPath, newContents)
// shell(`pnpm prettier --write ${outputPath}`)
