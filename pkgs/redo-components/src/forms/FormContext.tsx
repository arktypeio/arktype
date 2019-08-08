import React from "react"
import { useFormContext as useHookFormContext } from "react-hook-form"
import { ResponseState } from "../responses"

export type Fields = Record<string, any>

export type FormErrors<T extends Fields> = { [K in keyof T]?: string[] }

export type FormActions<T extends Fields, D = any> = {
    validate: (fields: T) => FormErrors<T>
    submit: (fields: T) => Promise<ResponseState<D> | void>
}

export const useFormContext = useHookFormContext as () => ReturnType<
    typeof useHookFormContext
> &
    FormActions<Fields> & {
        touched: string[]
        clearError: (name: string) => void
    }
