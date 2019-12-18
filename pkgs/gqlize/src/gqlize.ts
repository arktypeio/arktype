import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode,
    InputValueDefinitionNode,
    InputObjectTypeDefinitionNode,
    TypeNode
} from "graphql"

type GqlizeArgs = {
    schema: DocumentNode
    maxDepth?: number
    upfilterKeys?: string[]
}

type GqlizeConfig = Required<GqlizeArgs>

const withDefaults = (args: GqlizeArgs): GqlizeConfig => ({
    maxDepth: 1,
    upfilterKeys: [],
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
    const { vars, args } = mutation.arguments
        ? mutation.arguments.reduce(
              ({ vars, args }, mutationArg, index) => {
                  const { vars: newVars, args: newArgs } = gqlizeField({
                      field: mutationArg,
                      config,
                      path: [],
                      vars: {}
                  })
                  return {
                      vars: {
                          ...vars,
                          ...newVars
                      },
                      args:
                          index === mutation.arguments!.length - 1
                              ? `${args}${newArgs})`
                              : `${args}${newArgs}, `
                  }
              },
              {
                  vars: {},
                  args: "("
              }
          )
        : { vars: {}, args: "" }
    return `mutation ${mutation.name.value}${
        mutation.arguments ? variableMapToString(vars) : ""
    } {
    ${mutation.name.value}${args}
}`
}

type VariableMap = Record<string, string>

const variableMapToString = (variableMap: VariableMap) => {
    const entries = Object.entries(variableMap)
    return entries
        ? `(${entries
              .reduce(
                  (variables, [name, type]) => [
                      ...variables,
                      `$${name}: ${type}`
                  ],
                  [] as string[]
              )
              .join(", ")})`
        : ""
}

const getVariableName = (
    field: InputValueDefinitionNode,
    path: string[],
    taken: string[]
) => {
    let name = field.name.value
    let nextParentIndex = path.length - 2
    while (taken.includes(name)) {
        name = `${path[nextParentIndex]}${name
            .charAt(0)
            .toUpperCase()}${name.slice(1)}`
        nextParentIndex--
    }
    return name
}

const getVariableType = (field: InputValueDefinitionNode) => {
    let variableType = getTypeName(field.type)
    if (isList(field.type)) {
        variableType = `[${variableType}]`
    }
    return variableType
}

const scalarNames = ["Int", "Float", "String", "ID", "Boolean"]

const getTypeName = (node: TypeNode): string =>
    node.kind === "NamedType" ? node.name.value : getTypeName(node.type)

const isScalar = (node: TypeNode) => scalarNames.includes(getTypeName(node))

const isList = (node: TypeNode) => hasNodeKind(node, "ListType")

const isNonNull = (node: TypeNode) => hasNodeKind(node, "NonNullType")

const hasNodeKind = (node: TypeNode, kind: string): boolean =>
    node.kind === kind
        ? true
        : node.kind === "NamedType"
        ? false
        : isList(node.type)

type GqlizeFieldArgs = {
    field: InputValueDefinitionNode
    config: GqlizeConfig
    path: string[]
    vars: VariableMap
}

type GqlizedFieldData = {
    vars: VariableMap
    args: string
}

const gqlizeField = ({
    field,
    config,
    path,
    vars
}: GqlizeFieldArgs): GqlizedFieldData => {
    const candidateVariableName = getVariableName(
        field,
        path,
        Object.keys(vars)
    )
    if (isScalar(field.type) || path.length > config.maxDepth) {
        return {
            vars: {
                ...vars,
                [candidateVariableName]: getVariableType(field)
            },
            args: `${field.name.value}: $${candidateVariableName}`
        }
    }
    const fieldTypeDef = getInputObjectDefinition(field.type, config.schema)
    if (!fieldTypeDef.fields) {
        throw new Error(`Couldn't locate fields for type ${field.type}.`)
    }
    const getUpfilteredField = (baseField: InputObjectTypeDefinitionNode) =>
        baseField.fields?.find(({ name }) =>
            config.upfilterKeys.includes(name.value)
        )
    const upfilteredField = getUpfilteredField(fieldTypeDef)
    if (upfilteredField) {
        const { vars: upfilteredVars, args: upfilteredArgs } = gqlizeField({
            field: upfilteredField,
            config,
            path,
            vars
        })
        return {
            vars: upfilteredVars,
            args: `${field.name.value}: {${upfilteredArgs}}`
        }
    }
    return fieldTypeDef.fields.reduce(
        (updatedResult, nestedField, index) => {
            if (!isNonNull(nestedField.type)) {
                const nestedFieldTypeDef = getInputObjectDefinition(
                    nestedField.type,
                    config.schema
                )
                if (
                    !(
                        (
                            nestedFieldTypeDef &&
                            // TODO: Fix upfiltering to happen early enough
                            getUpfilteredField(nestedFieldTypeDef)
                        )
                        // Probably at the field inspection level
                    )
                )
                    // For now, the default is to ignore non-nullable types
                    return updatedResult
            }
            const name = nestedField.name.value
            const nestedResult = gqlizeField({
                field: nestedField,
                config,
                path: [...path, name],
                vars: updatedResult.vars
            })
            return {
                vars: nestedResult.vars,
                args:
                    index === fieldTypeDef.fields!.length - 1
                        ? `${updatedResult.args}${nestedResult.args}}`
                        : `${updatedResult.args}${nestedResult.args}, `
            }
        },
        { vars, args: `${field.name.value}: {` }
    )
}
