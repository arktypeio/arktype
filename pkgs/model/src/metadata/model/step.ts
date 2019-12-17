import { ModelTypeMetadata } from "./metadata"
import gql from "graphql-tag"

export const Step: ModelTypeMetadata<"Step"> = {
    operations: {},
    validator: ({ action, selector, value }) => ({})
}
