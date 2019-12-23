import React, { createContext, useContext, ReactNode, useState } from "react"
import useBaseForm, {
    useFormContext as useReactHookFormContext
} from "react-hook-form"
import { MutationTuple, MutationResult, ApolloError } from "@apollo/client"

export type Fields = Record<string, any>

export type FormErrors<T extends Fields> = { [K in keyof T]?: string[] }

export type BaseContext<T extends Fields> = ReturnType<
    typeof useReactHookFormContext
> & {
    clearError: (name?: keyof T | Array<keyof T>) => void
}

export type MutationSubmit<T extends Fields, D = any> = MutationTuple<D, T>[0]

export type CustomContext<T extends Fields, D = any> = {
    validate: () => FormErrors<T>
    submit: () => void
    resultState: MutationResult<D>
    handleBlur: (field: keyof T) => any
}

export type FullContext<T extends Fields, D = any> = BaseContext<T> &
    CustomContext<T, D>

export type CreateFormContextArgs<T extends Fields, D = any> = FormContextArgs<
    T,
    D
> & {
    baseContext: BaseContext<T>
    touched: Array<keyof T>
    setTouched: (_: Array<keyof T>) => any
    resultState: MutationResult<D>
    setResultState: (_: MutationResult<D>) => any
}

export const createFormContext = <T extends Fields, D = any>({
    baseContext,
    submit: submitPrevalidated,
    validate: validateArg,
    staticValues,
    transformValues,
    touched,
    setTouched,
    resultState,
    setResultState,
    onData,
    onError
}: CreateFormContextArgs<T, D>) => {
    const validate = (): FormErrors<T> =>
        validateArg?.(baseContext.getValues() as T) || {}
    const updateErrors = (
        touched: Array<keyof T>,
        validationResult: FormErrors<T>
    ) => {
        touched.forEach(key => {
            if (validationResult[key] && validationResult[key]!.length) {
                baseContext.setError(
                    key as any,
                    "error",
                    validationResult[key]!.join("\n")
                )
            } else {
                baseContext.clearError(key)
            }
        })
    }

    const submit = async () => {
        let values = {
            ...baseContext.getValues(),
            ...staticValues
        } as T
        const validationResult = validate()
        if (
            Object.values(validationResult).every(
                errors => !errors || !errors.length
            )
        ) {
            values = transformValues ? transformValues(values) : values
            setResultState({ called: true, loading: true })
            const { data, errors } =
                (await submitPrevalidated({ variables: values })) || {}
            const finalResponseState: MutationResult<D> = {
                loading: false,
                called: true
            }
            if (data) {
                finalResponseState.data = data
                onData?.(data)
            }
            if (errors) {
                const error = new ApolloError({
                    graphQLErrors: errors
                })
                finalResponseState.error = error
                onError?.(error)
            }
            setResultState(finalResponseState)
        } else {
            updateErrors(touched, validationResult)
        }
    }

    const handleBlur = (field: keyof T) => {
        const firstTouch = touched.includes(field)
        const updatedTouched = firstTouch ? touched : [...touched, field]
        if (firstTouch) {
            setTouched([...touched, field])
        }
        updateErrors(updatedTouched, validate())
    }

    const customContext = {
        validate,
        submit,
        submissionState: resultState,
        handleBlur
    }

    return {
        ...baseContext,
        ...customContext
    }
}

export type FormContextArgs<T extends Fields, D = any> = {
    submit: MutationSubmit<T, D>
    validate?: (fields: T) => FormErrors<T>
    transformValues?: (fields: T) => T
    onData?: (data: D) => void | Promise<void>
    onError?: (error: ApolloError) => void | Promise<void>
    staticValues?: any
}

export type FormContextProps<T extends Fields, D = any> = FormContextArgs<
    T,
    D
> & {
    children: ReactNode
}

export const FormContext = createContext({} as any)

export const FormProvider = <T extends Fields, D = any>({
    children,
    ...contextArgs
}: FormContextProps<T, D>) => {
    const baseContext = useBaseForm<T>() as BaseContext<T>
    const [touched, setTouched] = useState<Array<keyof T>>([])
    const [resultState, setResultState] = useState<MutationResult<D>>({
        called: false,
        loading: false
    })
    return (
        <FormContext.Provider
            value={createFormContext({
                baseContext,
                resultState,
                setResultState,
                touched,
                setTouched,
                ...contextArgs
            })}
        >
            {children}
        </FormContext.Provider>
    )
}

export const useFormContext = <T extends Fields, D = any>() =>
    useContext<FullContext<T, D>>(FormContext as any)
