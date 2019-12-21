import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode,
    InputValueDefinitionNode,
    InputObjectTypeDefinitionNode,
    TypeNode
} from "graphql"
import { camelCase } from "@re-do/utils"

type GqlizeArgs = {
    schema: DocumentNode
    maxDepth?: number
    upfilterKeys?: string[]
}

type GqlizeConfig = Required<GqlizeArgs>

const withDefaults = (args: GqlizeArgs): GqlizeConfig => ({
    maxDepth: 2,
    upfilterKeys: [],
    ...args
})

export const gqlize = (args: GqlizeArgs) => {
    return { mutate: gqlizeMutations(withDefaults(args)) }
}

const gqlizeMutations = (config: GqlizeConfig) => {
    const mutationType = config.schema.definitions.find(
        _ => _.kind === "ObjectTypeDefinition" && _.name.value === "Mutation"
    ) as ObjectTypeDefinitionNode | undefined
    return mutationType?.fields?.reduce(
        (mutations, mutation) => ({
            ...mutations,
            [mutation.name.value]: {
                gql: gqlizeMutation({ config, mutation })
            }
        }),
        {}
    )
}

const getInputObjectDefinition = (type: TypeNode, schema: DocumentNode) =>
    (schema.definitions.find(
        def =>
            def.kind === "InputObjectTypeDefinition" &&
            def.name.value === getTypeName(type)
    ) as any) as InputObjectTypeDefinitionNode

const getObjectDefinition = (type: TypeNode, schema: DocumentNode) =>
    (schema.definitions.find(
        def =>
            def.kind === "ObjectTypeDefinition" &&
            def.name.value === getTypeName(type)
    ) as any) as ObjectTypeDefinitionNode

type GqlizeMutationArgs = {
    mutation: FieldDefinitionNode
    config: GqlizeConfig
}

const gqlizeMutation = ({ mutation, config }: GqlizeMutationArgs) => {
    const returnTypeName = getTypeName(mutation.type)
    const { vars, args } = mutation.arguments
        ? mutation.arguments.reduce(
              ({ vars, args }, mutationArg, index) => {
                  const { vars: newVars, args: newArgs } = gqlizeField({
                      field: mutationArg,
                      config,
                      path: {
                          names: [returnTypeName.toLowerCase()],
                          types: [returnTypeName]
                      },
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
    return getMutationString({
        name: mutation.name.value,
        result: gqlizeMutationReturn({ mutation, config }),
        vars: mutation.arguments ? variableMapToString(vars) : "",
        args: mutation.arguments ? args : ""
    })
}

type GetMutationStringOptions = {
    name: string
    result: string
    vars?: string
    args?: string
}

const getMutationString = ({
    name,
    result,
    vars = "",
    args = ""
}: GetMutationStringOptions) =>
    `mutation ${name}${vars}{${name}${args}${result}}`

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
    let nameParts = [name]
    for (let tries = 0; taken.includes(name); tries++) {
        nameParts = [path[tries], ...nameParts]
        name = camelCase(nameParts)
    }
    return name
}

const gqlizeMutationReturn = ({ mutation, config }: GqlizeMutationArgs) => {
    if (isScalar(mutation.type)) {
        return ""
    } else {
        const returnType = getObjectDefinition(mutation.type, config.schema)
        const gqlizedReturn = returnType.fields?.reduce((gqlized, field) => {
            if (isScalar(field.type)) {
                return `${gqlized} ${field.name.value}`
            }
            return gqlized
        }, "{")
        return `${gqlizedReturn}}`
    }
}

const getVariableType = (field: InputValueDefinitionNode) => {
    let variableType = getTypeName(field.type)
    if (isNonNull(field.type)) {
        variableType = `${variableType}!`
    }
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
        : hasNodeKind(node.type, kind)

type GqlizeFieldArgs = {
    field: InputValueDefinitionNode
    config: GqlizeConfig
    path: {
        names: string[]
        types: string[]
    }
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
        path.names,
        Object.keys(vars)
    )
    const candidateResult: GqlizedFieldData = {
        vars: {
            ...vars,
            [candidateVariableName]: getVariableType(field)
        },
        args: `${field.name.value}: $${candidateVariableName}`
    }
    if (isScalar(field.type)) {
        return candidateResult
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
    if (
        isList(field.type) ||
        (upfilteredField && isList(upfilteredField.type)) ||
        path.names.length > config.maxDepth
    ) {
        if (upfilteredField) {
            candidateResult.vars[candidateVariableName] = getVariableType(
                upfilteredField
            )
            candidateResult.args = `${field.name.value}: {${upfilteredField.name.value}: $${candidateVariableName}}`
        }
        return candidateResult
    }
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
            const nestedResult = gqlizeField({
                field: nestedField,
                config,
                path: {
                    names: [...path.names, nestedField.name.value],
                    types: [...path.types, getTypeName(nestedField.type)]
                },
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
