import { readFile, writeFile } from "fs/promises"
import path from "path"
import { remark } from "remark"
import parseMarkdown from "remark-parse"
import { regex } from "./regex.js"
const README_PATH = path.resolve("./README.md")
const CODE_TAG = "code"
const GENERATED = "***GENERATED***"

const visitor = (root, mapData, keys) => {
    if (!keys) {
        keys = Object.keys(mapData)
    }
    for (const child in root.children) {
        const node = root.children[child]
        if (node.type === CODE_TAG && node.meta) {
            if (node.meta.match(regex.markdownTagMatch)) {
                const metaData = node.meta.replace(GENERATED, "").trim()
                if (mapData[metaData]) {
                    node.value = mapData[metaData]
                    if (!node.meta.includes(GENERATED)) {
                        node.meta = `${GENERATED} ${node.meta}`
                    }
                }
            }
        }
    }
    return root
}
const generateCode = (options) => async (tree) => {
    visitor(tree, options.mapData)
}

export const replaceMarkupCode = async (mapData) => {
    const mdFile = await readFile(README_PATH, "utf-8")
    const file = await remark()
        .use(parseMarkdown)
        .use(generateCode, { mapData })
        .process(mdFile)
    await writeFile(README_PATH, file.toString())
}
