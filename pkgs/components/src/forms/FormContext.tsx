import React, { createContext, useContext, ReactNode, useState } from "react"
import {
    useForm,
    useFormContext as useReactHookFormContext
} from "react-hook-form"

// TODO: Fix these types
type MutationTuple<D, T> = any
export type MutationResult<D> = any
type ApolloError = any

export type Fields = Record<string, any>

export type FormErrors<T extends Fields> = { [K in keyof T]?: string[] }

export type BaseContext = ReturnType<typeof useReactHookFormContext>

export type MutationSubmit<T extends Fields, D = any> = MutationTuple<D, T>[0]

export type CustomContext<T extends Fields, D = any> = {
    validate: () => FormErrors<T>
    submit: () => void
    resultState: MutationResult<D>
    handleBlur: (field: keyof T) => any
}

export type FullContext<T extends Fields, D = any> = BaseContext &
    CustomContext<T, D>

export type CreateFormContextArgs<T extends Fields, D = any> = FormContextArgs<
    T,
    D
> & {
    baseContext: BaseContext
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
        touched.forEach((key) => {
            if (validationResult[key] && validationResult[key]!.length) {
                baseContext.setError(key as any, {
                    type: "error",
                    message: validationResult[key]!.join("\n")
                })
            } else {
                baseContext.clearErrors(key as string)
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
                (errors) => !errors || !errors.length
            )
        ) {
            values = transformValues
                ? { ...values, ...transformValues(values) }
                : values
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
                finalResponseState.error = errors
                onError?.(errors)
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
        resultState,
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
    transformValues?: (fields: T) => Partial<T>
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
    const baseContext: any = useForm<T>()
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
