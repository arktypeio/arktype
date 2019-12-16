import { Model, NexusGenInputs } from "./model"
import {} from "validator"

// Map each core model type to an object that maps any of its keys to validation error messages
type ModelValidators = {
    [ModelType in keyof Model]: (
        data: Model[ModelType]
    ) => { [K in keyof Model[ModelType]]?: string }
}

const modelValidators: ModelValidators = {
    Test: ({ name, steps, tags }) => ({}),
    Selector: ({ css }) => ({}),
    Step: ({ action, selector, value }) => ({}),
    Tag: ({ name }) => ({}),
    User: ({ email, password, first, last }) => ({})
}

type CustomValidators = {
    [InputType in keyof NexusGenInputs]?: (
        data: NexusGenInputs[InputType]
    ) => { [K in keyof NexusGenInputs[InputType]]?: string }
}

const customValidators: CustomValidators = {
    SignInInput: ({ email, password }) => ({}),
    SignUpInput: ({ email, password, first, last }) => ({})
}

export const validators = { ...modelValidators, ...customValidators }
