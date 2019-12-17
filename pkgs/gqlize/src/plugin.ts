import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode,
    InputValueDefinitionNode,
    InputObjectTypeDefinitionNode,
    TypeNode
} from "graphql"
import gql from "graphql-tag"

const scalarNames = ["Int", "Float", "String", "ID", "Boolean"]

const isScalar = (typeName: string) => scalarNames.includes(typeName)

const getTypeName = (node: TypeNode): string =>
    node.kind === "NamedType" ? node.name.value : getTypeName(node.type)

type BaseConversionArgs = {
    schema: DocumentNode
    maxDepth: number
}

type WithOptionalKeys<T extends object, Keys extends keyof T> = Omit<T, Keys> &
    { [K in Keys]?: T[K] }

type GqlizeArgs = WithOptionalKeys<BaseConversionArgs, "maxDepth">

export const gqlize = ({ schema, maxDepth = 2 }: GqlizeArgs) => {
    return gqlizeMutations({ schema, maxDepth })
}

type GqlizeMutationsArgs = BaseConversionArgs

const gqlizeMutations = ({ schema, maxDepth }: GqlizeMutationsArgs) => {
    const mutationType = schema.definitions.find(
        _ => _.kind === "ObjectTypeDefinition" && _.name.value === "Mutation"
    ) as ObjectTypeDefinitionNode | undefined
    return mutationType?.fields
        ?.map(mutation => gqlizeMutation({ mutation, schema, maxDepth }))
        .join("\n")
}

const getInputObjectDefinition = (typeName: string, schema: DocumentNode) =>
    (schema.definitions.find(
        def =>
            def.kind === "InputObjectTypeDefinition" &&
            def.name.value === typeName
    ) as any) as InputObjectTypeDefinitionNode

type GqlizeMutationArgs = BaseConversionArgs & {
    mutation: FieldDefinitionNode
}

const gqlizeMutation = ({ mutation, schema, maxDepth }: GqlizeMutationArgs) =>
    `mutation ${mutation.name.value}${
        mutation.arguments
            ? inputFieldsToVariables({
                  fields: mutation.arguments,
                  schema,
                  maxDepth
              })
            : ""
    } {
    ${mutation.name.value}
}`

type InputFieldsToVariablesArgs = BaseConversionArgs & {
    fields: readonly InputValueDefinitionNode[]
}

const inputFieldsToVariables = (args: InputFieldsToVariablesArgs) =>
    `(${inputFieldsToVarStrings(args).join(", ")})`

const inputFieldsToVarStrings = ({
    fields,
    schema,
    maxDepth
}: InputFieldsToVariablesArgs): string[] => {
    return fields.reduce((varStrings, field) => {
        const typeName = getTypeName(field.type)
        if (isScalar(typeName) || maxDepth === 0) {
            return [...varStrings, `$${field.name.value}: ${typeName}`]
        }
        const inputType = getInputObjectDefinition(typeName, schema)
        return [
            ...varStrings,
            ...inputFieldsToVarStrings({
                fields: inputType.fields!,
                schema,
                maxDepth: maxDepth - 1
            })
        ]
    }, [] as string[])
}

const makeMutationReturn = () => {}
