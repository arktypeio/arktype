import {} from "validator"
import { model } from "./model"
import { SignInInput, SignUpInput } from "../model"

type CustomInputs = {
    SignInInput: SignInInput
    SignUpInput: SignUpInput
}

type CustomValidator<ModelType extends keyof CustomInputs> = (
    data: CustomInputs[ModelType]
) => { [K in keyof CustomInputs[ModelType]]?: string }

type CustomValidators = {
    [ModelType in keyof CustomInputs]: CustomValidator<ModelType>
}

const customValidators: CustomValidators = {
    SignInInput: ({ email, password }) => ({}),
    SignUpInput: ({ email, password, first, last }) => ({})
}

const modelValidators = Object.fromEntries(
    Object.entries(model).map(([key, { validator }]) => [key, validator])
)

export const validators = { ...modelValidators, ...customValidators }
