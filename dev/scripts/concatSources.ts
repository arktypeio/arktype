import { writeFileSync } from "node:fs"
import { getSourceFileEntries } from "../runtime/fs.ts"

const allContents = getSourceFileEntries()
    .filter(([path]) => path.startsWith("src") || path.startsWith("dev/test"))
    .reduce(
        (result, [path, text]) => `${result}

// *** FILE: ${path} ***
${text}`,
        ""
    )

writeFileSync("source.temp.ts", allContents)
