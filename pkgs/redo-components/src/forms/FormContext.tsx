import React from "react"
import { useFormContext as useHookFormContext } from "react-hook-form"
import { ResponseState } from "../responses"

export const useFormContext = useHookFormContext as () => ReturnType<
    typeof useHookFormContext
> &
    FormActions

export type Fields = Record<string, any>

export type FormActions = {
    validate: (fields: Fields) => Record<string, string[]>
    submit: (fields: Fields) => Promise<ResponseState>
}
