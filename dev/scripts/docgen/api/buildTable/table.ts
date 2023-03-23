import { convertToHTML, possibleFormats } from "./operators.ts"

export const defaultOperatorHeader = ["operator", ...possibleFormats]
export const defaultKeywordsHeader = ["Name", "Type", "Description"]

/**
 * todo
 * When it comes to examples I thought about doing stuff within the TSDocs but it's also a ton of clutter
 * can I either
 *      -> link to the github tests
 *      -> take snippets from the tests and place inside the individual doc
 */
export const githubTestsPath =
    "https://github.com/arktypeio/arktype/blob/main/dev/test/"

export const constructRow = (
    rowData: string[],
    indexesToWrap: string[] = []
) => {
    let row = "| "
    for (const index in rowData) {
        const alteredData = convertToHTML(rowData)
        row += indexesToWrap.includes(index)
            ? `<code>${alteredData[index]}</code>|`
            : `${alteredData[index]} |`
    }
    return row
}

export class Table {
    private table: string[] = []
    private rowStarter = "| "
    constructor(private columns: string[]) {
        this.pushRow(constructRow(this.columns))
        const separator = "---"
        const tableSeparator: string[] = []
        this.columns.forEach((_) => tableSeparator.push(separator))
        this.pushRow(constructRow(tableSeparator))
    }

    pushRow(row: string) {
        this.table.push(row)
    }

    toString() {
        return this.table.join("\n")
    }
}
