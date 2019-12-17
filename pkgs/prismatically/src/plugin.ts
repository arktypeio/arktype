import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode
} from "graphql"
import gql from "graphql-tag"

type MakeArgs = {
    schema: DocumentNode
}

export const make = ({ schema }: MakeArgs) => {
    const mutationType = schema.definitions.find(
        _ => _.kind === "ObjectTypeDefinition" && _.name.value === "Mutation"
    ) as ObjectTypeDefinitionNode
    const result = mutationType.fields
        ?.map(
            field =>
                `
            mutation ${field.name.value} {
                ${field.name.value}(${field.arguments?.reduce(
                    (argString, arg) =>
                        `${argString}$${arg.name.value}: ${arg.type}, `,
                    ""
                )})
        `
        )
        .join("\n")
    return result
}
