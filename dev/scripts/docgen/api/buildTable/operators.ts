import type { TsTagData } from "../tsDocTransforms.ts"
import { defaultOperatorHeader, Table } from "./table.ts"

export const operatorTable = (tableData: string[]) => {
    const operatingTable = new Table(defaultOperatorHeader)
    for (const data of tableData) {
        operatingTable.pushRow(data)
    }
    return operatingTable
}

export const possibleFormats = ["string", "tuple", "helper"]

export const getFormats = (tagData: TsTagData) => {
    return possibleFormats.reduce((formatsArr, possible) => {
        const supportsFormat =
            tagData[possible] === undefined ? "❌" : tagData[possible][0]
        formatsArr.push(supportsFormat)
        return formatsArr
    }, [] as string[])
}

const specialChars: { [k: string]: string } = {
    "\n": "",
    "<": "&lt;",
    ">": "&gt;",
    "|": "&vert;"
}

const specialCharsKeys = Object.keys(specialChars)

export const convertToHTML = (row: string[]) => {
    return row.map((item) => {
        specialCharsKeys.forEach(
            (char) => (item = item.replaceAll(char, specialChars[char]))
        )

        return item
    })
}
