import { fromHere, readFile, writeFile } from "@re-/node"
import { remark } from "remark"
import parseMarkdown from "remark-parse"
import { regex } from "./regex.js"

const README_PATH = fromHere("../../README.md")
const CODE_TAG = "code"
const GENERATED = "***GENERATED***"

const visitor = (root: any, mapData: any) => {
    for (const child in root.children) {
        const node = root.children[child]
        if (
            node.type === CODE_TAG &&
            node.meta &&
            regex.markdownTagMatch.test(node.meta)
        ) {
            const metaData = node.meta.replace(GENERATED, "").trim()
            if (mapData[metaData]) {
                node.value = mapData[metaData]
                if (!node.meta.includes(GENERATED)) {
                    node.meta = `${GENERATED} ${node.meta}`
                }
            }
        }
    }
    return root
}
const generateCode = (options: any) => (tree: any) => {
    visitor(tree, options.mapData)
}

export const replaceMarkupCode = async (mapData: any) => {
    const mdFile = readFile(README_PATH)
    const file = await remark()
        .use(parseMarkdown)
        .use(generateCode, { mapData })
        .process(mdFile)
    writeFile(README_PATH, file.toString())
}
