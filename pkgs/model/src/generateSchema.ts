import gqlize from "gqlize"
import { writeFileSync } from "fs"
import { join, dirname } from "path"

let projectDir: string

try {
    projectDir = join(__dirname, "..")
} catch {
    // @ts-ignore
    projectDir = join(dirname(new URL(import.meta.url).pathname), "..")
}

writeFileSync(
    join(projectDir, "queries.gql"),
    gqlize.gqlize({ schema: join(projectDir, "schema.gql") })
)
