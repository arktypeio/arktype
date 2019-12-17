import { ModelTypeMetadata } from "./metadata"
import gql from "graphql-tag"

export const User: ModelTypeMetadata<"User"> = {
    operations: {
        create: gql`
            mutation signUp(
                $email: String!
                $password: String!
                $first: String!
                $last: String!
            ) {
                signUp(
                    data: {
                        email: $email
                        password: $password
                        first: $first
                        last: $last
                    }
                )
            }
        `
    },
    validator: ({ email, password, first, last }) => ({})
}
