import gql from "graphql-tag"
import { ModelTypeMetadata } from "./metadata"

export const Test: ModelTypeMetadata<"Test"> = {
    operations: {
        create: gql`
            mutation createTest(
                $name: String!
                $tags: [TagCreateWithoutTestInput!]
                $steps: [StepCreateWithoutUserInput!]
            ) {
                createOneTest(
                    data: {
                        name: $name
                        tags: { create: $tags }
                        steps: { create: $steps }
                    }
                ) {
                    id
                }
            }
        `,
    },
    validator: ({ name, steps, tags }) => ({}),
}
