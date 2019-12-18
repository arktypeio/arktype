import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode,
    InputValueDefinitionNode,
    InputObjectTypeDefinitionNode,
    TypeNode
} from "graphql"
import { split } from "@re-do/utils"

type GqlizeArgs = {
    schema: DocumentNode
    maxDepth?: number
    ignoreKeys?: string[]
    omitKeys?: string[]
}

type GqlizeConfig = Required<GqlizeArgs>

const withDefaults = (args: GqlizeArgs): GqlizeConfig => ({
    maxDepth: 1,
    ignoreKeys: [],
    omitKeys: [],
    ...args
})

export const gqlize = (args: GqlizeArgs) => {
    return gqlizeMutations(withDefaults(args))
}

const gqlizeMutations = (config: GqlizeConfig) => {
    const mutationType = config.schema.definitions.find(
        _ => _.kind === "ObjectTypeDefinition" && _.name.value === "Mutation"
    ) as ObjectTypeDefinitionNode | undefined
    return mutationType?.fields
        ?.map(mutation => gqlizeMutation({ config, mutation }))
        .join("\n")
}

const getInputObjectDefinition = (type: TypeNode, schema: DocumentNode) =>
    (schema.definitions.find(
        def =>
            def.kind === "InputObjectTypeDefinition" &&
            def.name.value === getTypeName(type)
    ) as any) as InputObjectTypeDefinitionNode

type GqlizeMutationArgs = {
    mutation: FieldDefinitionNode
    config: GqlizeConfig
}

const gqlizeMutation = ({ mutation, config }: GqlizeMutationArgs) => {
    const transformedFields = transformFields({
        fields: mutation.arguments as NestableField[],
        config
    })
    return `mutation ${mutation.name.value}${
        mutation.arguments
            ? inputFieldsToVariables({
                  fields: transformedFields,
                  config
              })
            : ""
    } {
    ${mutation.name.value}
}`
}

type InputFieldsToVariablesArgs = {
    fields: NestableField[]
    config: GqlizeConfig
    path?: string[]
    variableMap?: Record<string, string>
}

const inputFieldsToVariables = (args: InputFieldsToVariablesArgs) =>
    `(${Object.entries(inputFieldsToVariableMap(args))
        .reduce(
            (variables, [name, type]) => [...variables, `$${name}: ${type}`],
            [] as string[]
        )
        .join(", ")})`

const getVariableName = (
    field: InputValueDefinitionNode,
    path: string[],
    taken: string[]
) => {
    let name = field.name.value
    let nextParentIndex = path.length - 1
    while (taken.includes(name)) {
        name = `${path[nextParentIndex]}${name
            .charAt(0)
            .toUpperCase()}${name.slice(1)}`
        nextParentIndex--
    }
    return name
}

const inputFieldsToVariableMap = ({
    fields,
    config,
    variableMap = {},
    path = []
}: InputFieldsToVariablesArgs): Record<string, string> => {
    const [variableFields, recursibleFields] =
        path.length < config.maxDepth
            ? split(fields, _ => isScalar(_.type))
            : [fields, []]
    const newVariables = variableFields.reduce(
        (newVariables, field) => ({
            ...newVariables,
            [getVariableName(
                field,
                path,
                Object.keys({ ...variableMap, ...newVariables })
            )]: getTypeName(field.type)
        }),
        {} as Record<string, string>
    )
    return recursibleFields.reduce(
        (updatedVariableMap, field) =>
            inputFieldsToVariableMap({
                fields: field.fields!,
                config,
                variableMap: updatedVariableMap,
                path: [...path, field.name.value]
            }),
        { ...variableMap, ...newVariables }
    )
}

const scalarNames = ["Int", "Float", "String", "ID", "Boolean"]

const getTypeName = (node: TypeNode): string =>
    node.kind === "NamedType" ? node.name.value : getTypeName(node.type)

const isScalar = (node: TypeNode) => scalarNames.includes(getTypeName(node))

type TransformFieldsArgs = {
    fields: NestableField[]
    config: GqlizeConfig
}

type NestableField = InputValueDefinitionNode & {
    fields?: NestableField[]
}

const transformFields = ({
    fields,
    config
}: TransformFieldsArgs): NestableField[] => {
    const { omitKeys, ignoreKeys, schema } = config
    const [fieldsToRemove, fieldsToKeep] = split(
        fields as InputValueDefinitionNode[],
        field =>
            !isScalar(field.type) &&
            ((omitKeys.includes(field.name.value) ||
                ignoreKeys.includes(field.name.value)) as boolean)
    )
    const modifiedFields = fieldsToKeep.map(fieldToKeep =>
        isScalar(fieldToKeep.type)
            ? fieldToKeep
            : {
                  ...fieldToKeep,
                  fields: transformFields({
                      fields: getInputObjectDefinition(fieldToKeep.type, schema)
                          .fields! as NestableField[],
                      config
                  })
              }
    )
    const replacementFields = fieldsToRemove.reduce(
        (replacementFields, fieldToRemove) => {
            if (omitKeys.includes(fieldToRemove.name.value)) {
                // If we're omitting the key, we don't need to recurse or find its value
                return replacementFields
            } else if (ignoreKeys.includes(fieldToRemove.name.value)) {
                const fieldType = getInputObjectDefinition(
                    fieldToRemove.type,
                    schema
                )
                return [
                    ...replacementFields,
                    ...transformFields({
                        fields: fieldType.fields! as NestableField[],
                        config
                    })
                ]
            } else {
                // Default case; should never happen
                return replacementFields
            }
        },
        [] as NestableField[]
    )
    return [...modifiedFields, ...replacementFields]
}
