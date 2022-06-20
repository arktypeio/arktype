import { randomUUID } from "node:crypto"
import { Project, SourceFile } from "ts-morph"
import { addBlockToMaps, getComment } from "./helpers.js"
import { regex } from "./regex.js"
import { StatementStack } from "./statementStack.js"

const getNameFromGrabComment = (comment: string, name?: string) => {
    const NAME_TAG = "-name:"

    const commentHasNameLine = comment.match(regex.nameGrab)
    const nameLine =
        name ??
        (commentHasNameLine
            ? commentHasNameLine[0].replace(NAME_TAG, "").trim()
            : `unnamedGrab${randomUUID()}`)

    return {
        tagName: nameLine
    }
}

const prepCommentThenMap = (
    comment: string,
    text: string,
    mappedData: Record<string, string>
) => {
    const data = getNameFromGrabComment(comment)
    addBlockToMaps(data.tagName, text, mappedData)
}

const mapBlocksAndStatements = (
    file: SourceFile,
    text: string,
    mappedData: Record<string, string>
) => {
    const statementStack = new StatementStack()
    let blockFlagActive = false

    const statements = file.getStatements()
    for (const statement of statements) {
        const leadingCommentRange = statement.getLeadingCommentRanges()
        for (const range of leadingCommentRange) {
            const comment = getComment(text, range)
            if (regex.statementGrab.test(comment)) {
                prepCommentThenMap(comment, statement.getText(), mappedData)
            }
            if (regex.blockEndGrab.test(comment)) {
                blockFlagActive = false
                prepCommentThenMap(
                    comment,
                    statementStack.toString(),
                    mappedData
                )
            } else if (regex.blockGrab.test(comment)) {
                blockFlagActive = true
                statementStack.push("", true)
            }
        }
        if (blockFlagActive) {
            statementStack.push(statement.getText())
        }
    }
    const eof = file.getLastToken()
    const eofCommentRange = eof.getLeadingCommentRanges()
    if (eofCommentRange) {
        for (const range of eofCommentRange) {
            const comment = getComment(file.getFullText(), range)
            if (regex.blockEndGrab.test(comment)) {
                blockFlagActive = false
                prepCommentThenMap(
                    comment,
                    statementStack.toString(),
                    mappedData
                )
            }
        }
    }
}
export const getMapData = (project: Project, map: Record<string, string>) => {
    for (const file of project.getSourceFiles()) {
        const text = file.getFullText()
        const fileName = file.getBaseName()
        addBlockToMaps(fileName, text, map)
        if (regex.blockOrStatementGrab.test(text)) {
            mapBlocksAndStatements(file, text, map)
        }
    }
}
