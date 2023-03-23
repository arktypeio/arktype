import { writeFileSync } from "node:fs"
import { operatorTable } from "./buildTable/operators.ts"
import type { ScopeData } from "./writeApi.ts"
import { MarkdownSection } from "./writeApi.ts"

export const generateKeywordMasterList = (
    path: string,
    scopeData: ScopeData[]
) => {
    const md = new MarkdownSection("Keywords")
    md.options({ hide_table_of_contents: true })
    scopeData.forEach((data) => md.section(data.name).text(data.text))
    writeFileSync(path, md.toString())
}

export const operatorsTable = (path: string, tableData: string[]) => {
    const operatingTable = operatorTable(tableData)
    const md = new MarkdownSection("Operators")
    md.options({ hide_table_of_contents: true })
    md.section("Operating Table").text(operatingTable.toString())
    writeFileSync(path, md.toString())
}
