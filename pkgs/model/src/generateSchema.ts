import gqlize from "gqlize"
import { writeFileSync } from "fs"
import { dirName } from "@re-do/node-utils"

writeFileSync(
    dirName("..", "queries.gql"),
    gqlize.gqlize({ schema: dirName("..", "schema.gql") })
)
