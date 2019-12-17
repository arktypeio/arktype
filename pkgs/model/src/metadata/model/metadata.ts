import { Model } from "../../model"
import {} from "validator"
import { DocumentNode } from "graphql"
import gql from "graphql-tag"

/** Map each core model type to a validation function returning an object
 *  that maps any of its keys to validation error messages */
type ModelValidator<ModelType extends keyof Model> = (
    data: Model[ModelType]
) => { [K in keyof Model[ModelType]]?: string }

export type OperationName = "create" | "read" | "update" | "delete" | "find"

export type Operations = { [Name in OperationName]?: DocumentNode }

export type ModelTypeMetadata<ModelType extends keyof Model> = {
    validator: ModelValidator<ModelType>
    operations: Operations
}

export type ModelMetadata = {
    [ModelType in keyof Model]: ModelTypeMetadata<ModelType>
}
