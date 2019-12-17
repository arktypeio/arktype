import { ModelTypeMetadata } from "./metadata"
import gql from "graphql-tag"

export const Selector: ModelTypeMetadata<"Selector"> = {
    operations: {},
    validator: ({ css }) => ({})
}
