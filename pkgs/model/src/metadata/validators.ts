import { NexusGenInputs } from "../model"
import {} from "validator"
import { model } from "./model"

type CustomValidators = {
    [InputType in keyof NexusGenInputs]?: (
        data: NexusGenInputs[InputType]
    ) => { [K in keyof NexusGenInputs[InputType]]?: string }
}

const customValidators: CustomValidators = {
    SignInInput: ({ email, password }) => ({})
}

const modelValidators = Object.fromEntries(
    Object.entries(model).map(([key, { validator }]) => [key, validator])
)

export const validators = { ...modelValidators, ...customValidators }
