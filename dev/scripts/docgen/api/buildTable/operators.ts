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
    const formats: string[] = []
    for (const possibleFormat of possibleFormats) {
        const format =
            tagData[possibleFormat] === undefined
                ? ""
                : tagData[possibleFormat][0]
        formats.push(format)
    }
    return formats
}
