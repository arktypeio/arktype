import { gqlize } from "gqlize"
// @ts-ignore
import schema from "./schema.gql"

export const playground = {
    tabs: [
        {
            endpoint:
                process.env.NODE_ENV === "production"
                    ? "/dev/graphql"
                    : "/graphql",
            query: gqlize({ schema }),
        },
    ],
}
