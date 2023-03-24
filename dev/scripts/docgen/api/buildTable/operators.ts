import type { TsTagData } from "../tsDocTransforms.ts"
import { constructHeader, defaultOperatorHeader } from "./table.ts"

export const operatorTable = (tableData: string[]) => {
    const operatingTable: string[] = []
    constructHeader(defaultOperatorHeader, operatingTable)
    for (const row of tableData) {
        operatingTable.push(row)
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
