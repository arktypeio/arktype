import { gqlize } from "gqlize"
// @ts-ignore
import schema from "./schema.gql"
import { PlaygroundRenderPageOptions } from "apollo-server-lambda"

export const playground: PlaygroundRenderPageOptions = {
    tabs: [
        {
            endpoint: "/dev/graphql",
            query: gqlize({
                schema,
                transformOutputs: (fields) =>
                    fields.filter(
                        (field) => !["user", "test"].includes(field.name.value)
                    ),
            }),
            variables: JSON.stringify(
                {
                    email: "david@redo.qa",
                    password: "redo",
                    name: "Example",
                    steps: [
                        { kind: "click", selector: "#id" },
                        {
                            kind: "set",
                            selector: "#another",
                            value: "hello",
                        },
                    ],
                    tags: [{ name: "fast" }, { name: "easy" }],
                    first: "David",
                    last: "Blass",
                },
                null,
                4
            ),
            headers: { Authorization: "Bearer" },
        },
    ],
}
