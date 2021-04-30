import { ValueFrom } from "@re-do/utils"
import { RegisterOptions, FieldError } from "react-hook-form"
import { ErrorTextProps } from "../text"

export const defaultErrorMessages = {
    required: "We need this!",
    min: "Too small.",
    max: "Too big.",
    minLength: "Too short.",
    maxLength: "Too long.",
    valueAsNumber: "Not a number.",
    valueAsDate: "Not a date."
}

export const getDefaultErrorMessage = (error: FieldError) =>
    error.type in defaultErrorMessages
        ? (defaultErrorMessages as any)[error.type]
        : "That doesn't look right."

export type FormInputProps<T> = {
    name: string
    defaultValue?: T
    optional?: boolean
    rules?: RegisterOptions
    errorTooltipPlacement?: ValueFrom<ErrorTextProps, "tooltipPlacement">
    errorMessage?: string | ((e: FieldError) => string)
}
