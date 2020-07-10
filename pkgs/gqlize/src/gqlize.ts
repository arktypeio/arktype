import {
    DocumentNode,
    ObjectTypeDefinitionNode,
    FieldDefinitionNode,
    InputValueDefinitionNode,
    InputObjectTypeDefinitionNode,
    EnumTypeDefinitionNode,
    TypeNode
} from "graphql"
import { camelCase } from "@re-do/utils"
import { readFileSync } from "fs-extra"
import { format } from "prettier"
import gql from "graphql-tag"

type OperationKind = "Query" | "Mutation"

type MapQuery = (data: OperationData, schema: DocumentNode) => OperationData
type BranchQuery = (
    data: OperationData,
    schema: DocumentNode
) => Record<string, OperationData>

type TransformOutputFields = (
    fields: FieldDefinitionNode[],
    schema: DocumentNode
) => FieldDefinitionNode[]

type QueryConfig = {
    map?: MapQuery
    branch?: BranchQuery
    transformOutputs?: TransformOutputFields
}

type OutputDefinition = {
    name: string
    fields: FieldDefinitionNode[]
}

type OperationData = {
    kind: OperationKind
    name: string
    output: OutputDefinition
    vars?: string
    args?: string
}

type GqlizeArgs = {
    schema: DocumentNode | string
    map?: MapQuery | null
    branch?: BranchQuery | null
    transformOutputs?: TransformOutputFields | null
    queries?: Record<string, QueryConfig>
    maxResultDepth?: number
    maxVariableDepth?: number
    prettify?: boolean
}

type GqlizeConfig = Omit<
    { [K in keyof GqlizeArgs]-?: GqlizeArgs[K] },
    "schema"
> & {
    schema: DocumentNode
}

const getConfig = ({ schema, ...options }: GqlizeArgs): GqlizeConfig => ({
    queries: {},
    transformOutputs: null,
    map: null,
    branch: null,
    maxResultDepth: 4,
    maxVariableDepth: 2,
    prettify: true,
    ...options,
    schema:
        typeof schema === "string"
            ? (gql(readFileSync(schema).toString()) as DocumentNode)
            : schema
})

export const gqlize = (args: GqlizeArgs) => {
    const config = getConfig(args)
    const gqlizedQueries = gqlizeBlock("Query", config)
    const gqlizedMutations = gqlizeBlock("Mutation", config)
    const result = gqlizedQueries + gqlizedMutations
    return config.prettify ? format(result, { parser: "graphql" }) : result
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

export const getOutputDefinition = (name: string, schema: DocumentNode) =>
    ({
        name,
        fields: getObjectDefinition(name, schema)?.fields ?? []
    } as OutputDefinition)

export const getEnumDefinitions = (schema: DocumentNode) =>
    schema.definitions.filter((def) => def.kind === "EnumTypeDefinition")

export const getInputObjectDefinition = (name: string, schema: DocumentNode) =>
    schema.definitions.find(
        (def) =>
            def.kind === "InputObjectTypeDefinition" && def.name.value === name
    ) as InputObjectTypeDefinitionNode

export const getObjectDefinition = (name: string, schema: DocumentNode) =>
    schema.definitions.find(
        (def) => def.kind === "ObjectTypeDefinition" && def.name.value === name
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
    let output = getOutputDefinition(getTypeName(operation.type), config.schema)
    const { map, branch, transformOutputs } = {
        ...config,
        ...config.queries[operation.name.value]
    }
    if (transformOutputs) {
        output = {
            ...output,
            fields: transformOutputs(output.fields, config.schema)
        }
    }
    const { vars, args } = operation.arguments?.length
        ? operation.arguments.reduce(
              ({ vars, args }, operationArg, index) => {
                  const { vars: newVars, args: newArgs } = gqlizeField({
                      field: operationArg,
                      config,
                      path: {
                          names: [output.name.toLowerCase()],
                          types: [output.name]
                      },
                      vars
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
        output,
        vars: operation.arguments ? variableMapToString(vars) : "",
        args: operation.arguments ? args : ""
    }
    let result = ""
    if (branch) {
        const branchedOperations = branch(operationData, config.schema)
        Object.entries(branchedOperations).forEach(([alias, data]) => {
            result += getOperationString(data, config, alias)
        })
    }
    result += getOperationString(
        map ? map(operationData, config.schema) : operationData,
        {
            ...config,
            // Ensure query-level takes precedence
            transformOutputs
        }
    )
    return result
}

const getOperationString = (
    { kind, name, output, vars = "", args = "" }: OperationData,
    config: GqlizeConfig,
    alias?: string
) =>
    `${kind.toLowerCase()} ${alias ?? name}${vars}{${name}${args}${
        output.fields.length ? gqlizeResultFields({ output, config }) : ""
    }}\n`

type VariableMap = Record<string, string>

const variableMapToString = (variableMap: VariableMap) => {
    const entries = Object.entries(variableMap)
    return entries.length
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
        nameParts = [path[path.length - tries - 1], ...nameParts]
        name = camelCase(nameParts)
    }
    return name
}

type GqlizeResultFieldsArgs = {
    output: OutputDefinition
    config: GqlizeConfig
}

const gqlizeResultFields = ({ output, config }: GqlizeResultFieldsArgs) => {
    return `{${output.fields.reduce(
        (gqlized, field) =>
            `${gqlized} ${gqlizeResultField(field, [output.name], 1, config)}`,
        ""
    )}}`
}

const gqlizeResultField = (
    field: FieldDefinitionNode,
    seen: string[],
    depth: number,
    config: GqlizeConfig
): string => {
    if (isScalar(field.type) || isEnum(field.type, config.schema)) {
        return field.name.value
    }
    const typeName = getTypeName(field.type)
    if (
        seen.includes(typeName) ||
        (config.maxResultDepth && depth > config.maxResultDepth)
    ) {
        // If we've already seen this field, ignore it so we don't infinitely recurse
        // If the user passed a maxResultDepth value and we've exceeded it, ignore non-scalar fields
        return ""
    }
    const resultType = getObjectDefinition(typeName, config.schema)
    const fields =
        config.transformOutputs?.(resultType!.fields! as any, config.schema) ??
        resultType!.fields!
    return (
        fields.reduce(
            (gqlized, subField) =>
                `${gqlized} ${gqlizeResultField(
                    subField,
                    [...seen, typeName],
                    depth + 1,
                    config
                )}`,
            `${field.name.value} {`
        ) + "}"
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

export const isEnum = (node: TypeNode, schema: DocumentNode) =>
    getEnumDefinitions(schema).find(
        (def) =>
            (def as EnumTypeDefinitionNode).name.value === getTypeName(node)
    )

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
        isEnum(field.type, config.schema) ||
        // If the field is optional, recursing for variables will break the query if they're required
        !isNonNull(field.type) ||
        path.names.length >= config.maxVariableDepth
    ) {
        const variableName = getVariableName(
            field,
            path.names,
            Object.keys(vars)
        )
        vars[variableName] = getVariableType(field)
        return {
            vars,
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
                vars
            })
            return {
                vars,
                args:
                    index === fieldTypeDef.fields!.length - 1
                        ? `${updatedResult.args}${nestedResult.args}}`
                        : `${updatedResult.args}${nestedResult.args}, `
            }
        },
        { vars, args: `${field.name.value}: {` }
    )
}
