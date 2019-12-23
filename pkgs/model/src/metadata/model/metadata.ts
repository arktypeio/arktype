import {} from "validator"
import { DocumentNode } from "graphql"
import { Selector, Step, Tag, Test, User } from "../../model"

export type Model = {
    Selector: Selector
    Step: Step
    Tag: Tag
    Test: Test
    User: User
}

/** Map each core model type to a validation function returning an object
 *  that maps any of its keys to validation error messages */
export type ModelValidator<ModelType extends keyof Model> = (
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
