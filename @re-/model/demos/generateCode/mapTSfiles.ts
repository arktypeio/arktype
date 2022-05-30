import { fromHere } from "@re-/node"
import { Project, Statement, ts } from "ts-morph"
import { regex } from "./regex.js"

const { tagMatch, blockCommentMatch, commentMatch } = regex

const getComment = (text: string, range: any) =>
    text.slice(range.getPos(), range.getEnd())

const stripCodeTag = (codeTag: string) =>
    codeTag.replace("@re_place", "").trim()

const addFileContentsToMap = (
    fileText: string,
    astStatements: Statement<ts.Statement>[],
    map: Record<string, string>
) => {
    for (const content of astStatements) {
        const range = content.getLeadingCommentRanges()
        if (range.length) {
            const foundMatchingComment = getComment(fileText, range[0]).match(
                tagMatch
            )
            if (
                foundMatchingComment &&
                foundMatchingComment[0].split(" ").length > 2
            ) {
                const tag = stripCodeTag(foundMatchingComment[0])
                map[tag] = content.getText()
            }
        }
    }
}

export const getMapData = () => {
    const project = new Project({
        tsConfigFilePath: fromHere("../tsconfig.json")
    })
    const files = project.getSourceFiles()
    const map: Record<string, string> = {}
    for (const file of files) {
        const fullFileText = file.getFullText()
        const foundMatchingComments = [...fullFileText.matchAll(tagMatch)]
        for (const comment of foundMatchingComments) {
            const tagArray: Array<string> = stripCodeTag(comment[0]).split(" ")
            if (tagArray.length === 1) {
                map[tagArray[0]] = fullFileText
                    .replace(blockCommentMatch, "")
                    .replace(commentMatch, "")
            } else {
                addFileContentsToMap(fullFileText, file.getStatements(), map)
            }
        }
    }
    return map
}
