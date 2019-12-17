import { ModelTypeMetadata } from "./metadata"
import gql from "graphql-tag"

export const Tag: ModelTypeMetadata<"Tag"> = {
    operations: {},
    validator: ({ name }) => ({})
}
