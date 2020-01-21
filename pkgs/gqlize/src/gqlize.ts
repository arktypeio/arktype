import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode,
    InputValueDefinitionNode,
    InputObjectTypeDefinitionNode,
    TypeNode
} from "graphql"
import { camelCase } from "@re-do/utils"
import { readFileSync } from "fs-extra"
import gql from "graphql-tag"

type MappedQueries = Record<
    string,
    (data: OperationData, schema: DocumentNode) => Record<string, OperationData>
>

type OperationKind = "Query" | "Mutation"

type OperationData = {
    kind: OperationKind
    name: string
    result: ObjectTypeDefinitionNode
    vars?: string
    args?: string
}

type GqlizeArgs = {
    schema: DocumentNode | string
    maxVariableDepth?: number
    maxResultDepth?: number
    mapped?: MappedQueries
}

type GqlizeConfig = {
    schema: DocumentNode
    maxDepth: number
    maxResultDepth: number | null
    mapped: MappedQueries
}

const getConfig = ({
    maxVariableDepth,
    maxResultDepth,
    mapped,
    schema
}: GqlizeArgs): GqlizeConfig => ({
    maxDepth: maxVariableDepth ?? 2,
    maxResultDepth: maxResultDepth ?? null,
    schema:
        typeof schema === "string"
            ? (gql(readFileSync(schema).toString()) as DocumentNode)
            : schema,
    mapped: mapped ?? {}
})

export const gqlize = (args: GqlizeArgs) => {
    const config = getConfig(args)
    const gqlizedQueries = gqlizeBlock("Query", config)
    const gqlizedMutations = gqlizeBlock("Mutation", config)
    return gqlizedQueries + gqlizedMutations
}

const gqlizeBlock = (operationKind: OperationKind, config: GqlizeConfig) => {
    const operation = getObjectDefinition(operationKind, config.schema)
    return (
        operation?.fields?.reduce(
            (gqlized, field) =>
                gqlized +
                gqlizeOperation({
                    config,
                    operation: field,
                    operationKind
                }),
            ""
        ) ?? ""
    )
}

export const getInputObjectDefinition = (name: string, schema: DocumentNode) =>
    schema.definitions.find(
        def =>
            def.kind === "InputObjectTypeDefinition" && def.name.value === name
    ) as InputObjectTypeDefinitionNode

export const getObjectDefinition = (name: string, schema: DocumentNode) =>
    schema.definitions.find(
        def => def.kind === "ObjectTypeDefinition" && def.name.value === name
    ) as ObjectTypeDefinitionNode | undefined

type GqlizeOperationArgs = {
    operation: FieldDefinitionNode
    config: GqlizeConfig
    operationKind: OperationKind
}

const gqlizeOperation = ({
    operation,
    config,
    operationKind
}: GqlizeOperationArgs) => {
    const returnTypeName = getTypeName(operation.type)
    const { vars, args } = operation.arguments
        ? operation.arguments.reduce(
              ({ vars, args }, operationArg, index) => {
                  const { vars: newVars, args: newArgs } = gqlizeField({
                      field: operationArg,
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
                          index === operation.arguments!.length - 1
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
    const operationData: OperationData = {
        kind: operationKind,
        name: operation.name.value,
        result: operation.type,
        vars: operation.arguments ? variableMapToString(vars) : "",
        args: operation.arguments ? args : ""
    }
    let result = ""
    if (operation.name.value in config.mapped) {
        const mappedOperations = config.mapped[operation.name.value](
            operationData,
            config.schema
        )
        Object.entries(mappedOperations).forEach(
            ([alias, mappedOperationData]) => {
                result += getOperationString(mappedOperationData, alias)
            }
        )
    }
    result += getOperationString(operationData)
    return result
}

const getOperationString = (
    { kind, name, result, vars = "", args = "" }: OperationData,
    alias?: string
) => `${kind.toLowerCase()} ${alias ?? name}${vars}{${name}${args}${result}}\n`
//isScalar(operation.type)

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

type GqlizeResultArgs = {
    type: ObjectTypeDefinitionNode
    config: GqlizeConfig
    transformFields?: (
        fields: readonly FieldDefinitionNode[]
    ) => FieldDefinitionNode[]
}

const gqlizeResult = ({ type, config, transformFields }: GqlizeResultArgs) => {
    const recurse = (
        field: FieldDefinitionNode,
        seen: FieldDefinitionNode[],
        depth: number
    ): string => {
        const resultType = getObjectDefinition(
            getTypeName(field.type),
            config.schema
        )
        let fields = resultType!.fields!
        if (depth === 0 && transformFields) {
            fields = transformFields(fields)
        }
        const gqlizedResult = fields.reduce((gqlized, field) => {
            let resultWithNewValue = `${gqlized} ${field.name.value}`
            if (!isScalar(field.type)) {
                if (
                    seen.includes(field) ||
                    (config.maxResultDepth && depth > config.maxResultDepth)
                ) {
                    // If we've already seen this field, ignore it so we don't infinitely recurse
                    // If the user passed a maxResultDepth value and we've exceeded it, ignore non-scalar fields
                    return gqlized
                }
                resultWithNewValue += ` ${recurse(
                    field,
                    [...seen, field],
                    depth + 1
                )}`
            }
            return resultWithNewValue
        }, "{")
        return `${gqlizedResult}}`
    }
    return type.fields?.reduce(
        (gqlized, field) => gqlized + recurse(field, [], 1),
        ""
    )
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

export const getTypeName = (node: TypeNode): string =>
    node.kind === "NamedType" ? node.name.value : getTypeName(node.type)

export const isScalar = (node: TypeNode) =>
    scalarNames.includes(getTypeName(node))

export const isList = (node: TypeNode) => hasNodeKind(node, "ListType")

export const isNonNull = (node: TypeNode) => hasNodeKind(node, "NonNullType")

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
    if (
        isScalar(field.type) ||
        isList(field.type) ||
        path.names.length > config.maxDepth
    ) {
        const variableName = getVariableName(
            field,
            path.names,
            Object.keys(vars)
        )
        return {
            vars: {
                ...vars,
                [variableName]: getVariableType(field)
            },
            args: `${field.name.value}: $${variableName}`
        }
    }
    const fieldTypeDef = getInputObjectDefinition(
        getTypeName(field.type),
        config.schema
    )
    if (!fieldTypeDef.fields) {
        throw new Error(`Couldn't locate fields for type ${field.type}.`)
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
