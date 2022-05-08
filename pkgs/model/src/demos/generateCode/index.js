import { Project } from "ts-morph"
import path from "path"
import { regex } from "./regex.js"

const { tagMatch, blockCommentMatch, commentMatch } = regex

const project = new Project({})
const files = project.addSourceFilesAtPaths(
    `${path.resolve("./src/demos")}/**/*`
)

const getComment = (text, range) => {
    return text.slice(range.getPos(), range.getEnd())
}
const stripReplaceCodeTag = (codeTag) => {
    return codeTag.replace("@re_place", "").trim()
}
const mapContentsOfFile = (fileText, ASTStatements, map) => {
    for (const content of ASTStatements) {
        const range = content.getLeadingCommentRanges()
        if (range.length) {
            const commentMatch = getComment(fileText, range[0]).match(tagMatch)
            if (commentMatch) {
                if (commentMatch[0].split(" ").length > 2) {
                    const tag = stripReplaceCodeTag(commentMatch[0])
                    map[tag] = content.getText()
                }
            }
        }
    }
    return map
}

export const getMapData = () => {
    let map = {}
    for (const file of files) {
        const fullFileText = file.getFullText()
        const replaceComment = [...fullFileText.matchAll(tagMatch)]
        if (replaceComment.length) {
            for (const comment of replaceComment) {
                const tagArray = stripReplaceCodeTag(comment[0]).split(" ")
                if (tagArray.length === 1) {
                    map[tagArray[0]] = fullFileText
                        .replace(blockCommentMatch, "")
                        .replace(commentMatch, "")
                } else {
                    map = {
                        ...map,
                        ...mapContentsOfFile(
                            fullFileText,
                            file.getStatements(),
                            map
                        )
                    }
                }
            }
        }
    }
    return map
}
