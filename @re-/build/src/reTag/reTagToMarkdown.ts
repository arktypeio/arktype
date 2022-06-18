import { join } from "node:path"
import { remark } from "remark"
import remarkParse from "remark-parse"
import { findPackageRoot, fromCwd, readFile, writeFile } from "../fs.js"
import { BlocksByPath } from "./reTag.js"

const CODE_TAG = "code"
const GENERATED = "***GENERATED***"
const MARKDOWN_TAG_MATCH = /(\*{3}GENERATED\*{3}( )+)?( )*\w+(\.(ts|js))?/

const generateCode =
    (mapData: Record<string, string>) => (markdownParentNode: any) => {
        for (const child in markdownParentNode.children) {
            const node = markdownParentNode.children[child]
            if (
                node.type === CODE_TAG &&
                node.meta &&
                MARKDOWN_TAG_MATCH.test(node.meta)
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
    }

export type ReTagToMarkdownArgs = {
    data: BlocksByPath
    destination?: string
}

export const updateMarkdownTags = async ({
    data,
    destination
}: ReTagToMarkdownArgs) => {
    const packageRoot = findPackageRoot(fromCwd())
    const mdPath = destination ?? join(packageRoot, "README.md")
    const mdFile = readFile(mdPath)
    const file = await remark()
        .use(remarkParse)
        .use(generateCode, data)
        .process(mdFile)
    writeFile(mdPath, file.toString())
}
