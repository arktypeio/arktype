import { join } from "path"
import { gqlize } from "gqlize"

export const playground = {
    tabs: [
        {
            endpoint:
                process.env.NODE_ENV === "production"
                    ? "/dev/graphql"
                    : "/graphql",
            query: gqlize({ schema: join(__dirname, "schema.gql") })
        }
    ]
}
