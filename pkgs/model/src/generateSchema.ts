import gqlize from "gqlize"
import { writeFileSync } from "fs"
import { fromHere } from "@re-do/node-utils"

writeFileSync(
    fromHere("..", "queries.gql"),
    gqlize.gqlize({ schema: fromHere("..", "schema.gql") })
)
