import { createContext } from "react"
import useReactHookForm, {
    useFormContext as useReactHookFormContext,
    FormContext as ReactHookFormContext
} from "react-hook-form"

export type ResponseState<T = any> = {
    data?: T
    loading?: boolean
    errors?: string[]
}

export type Fields = Record<string, any>

export type FormErrors<T extends Fields> = { [K in keyof T]?: string[] }

export type BaseContext = ReturnType<typeof useReactHookFormContext> & {
    clearError: (name?: string | string[]) => void
}

export type CustomContext<T extends Fields, D = any> = {
    validate: () => FormErrors<T>
    updateErrors: () => void
    submit: () => Promise<ResponseState<D> | void>
    submitState: ResponseState<D>
    touched: Array<keyof T>
}

export type FullContext<T extends Fields, D = any> = BaseContext &
    CustomContext<Fields>

export const useFormContext = <T extends Fields, D = any>() =>
    useReactHookFormContext() as FullContext<T, D>
