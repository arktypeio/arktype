import { CommentRange } from "ts-morph"
import { regex } from "./regex.js"

export const addBlockToMaps = (
    blockName: string,
    text: string,
    mappedData: Record<string, string>
) => {
    mappedData[blockName] = stripTextOfGrabComments(text)
}

export const getComment = (text: string, range: CommentRange) =>
    text.slice(range.getPos(), range.getEnd())

export const stripTextOfGrabComments = (text: string) => {
    const matches = [...text.matchAll(regex.comment)]
    let strippedText = text
    for (const match of matches) {
        strippedText = strippedText.replace(match[0], "")
    }
    return strippedText
}
