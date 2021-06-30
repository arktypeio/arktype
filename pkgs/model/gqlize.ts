import { gqlize } from "gqlize"
import { writeFileSync } from "fs"
import { join } from "path"

writeFileSync(
    join(__dirname, "queries.gql"),
    gqlize({ schema: join(__dirname, "schema.gql") })
)
