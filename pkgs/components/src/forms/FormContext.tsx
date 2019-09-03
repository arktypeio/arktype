import React, { createContext, useContext, ReactNode, useState } from "react"
import useBaseForm, {
    useFormContext as useReactHookFormContext
} from "react-hook-form"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"

export type SubmissionState<T = any> = {
    data?: T
    loading?: boolean
    errors?: string[]
}

export type Fields = Record<string, any>

export type FormErrors<T extends Fields> = { [K in keyof T]?: string[] }

export type BaseContext<T extends Fields> = ReturnType<
    typeof useReactHookFormContext
> & {
    clearError: (name?: keyof T | Array<keyof T>) => void
}

export type CustomContext<T extends Fields, D = any> = {
    validate: () => FormErrors<T>
    submit: () => Promise<SubmissionState<D> | void>
    submissionState: SubmissionState<D>
    handleBlur: (field: keyof T) => any
}

export type FullContext<T extends Fields, D = any> = BaseContext<T> &
    CustomContext<T, D>

export const createValidator = <T extends Fields>(
    getValues: () => T,
    against: T,
    transformValues?: (fields: T) => T
) => () => {
    const values = transformValues ? transformValues(getValues()) : getValues()
    // Translate class-validator style errors to a map of fields to error string arrays.
    const classValidatorErrors = validateSync(
        plainToClassFromExist(against, values)
    )
    return classValidatorErrors.reduce(
        (errors, current) => {
            return {
                ...errors,
                ...{
                    ...{
                        [current.property]: Object.values(current.constraints)
                    }
                }
            }
        },
        {} as FormErrors<T>
    )
}

export type CreateFormContextArgs<T extends Fields, D = any> = FormContextArgs<
    T,
    D
> & {
    baseContext: BaseContext<T>
    touched: Array<keyof T>
    setTouched: (_: Array<keyof T>) => any
    submissionState: SubmissionState<D>
    setSubmissionState: (_: SubmissionState<D>) => any
}

export const createFormContext = <T extends Fields, D = any>({
    baseContext,
    submit: submitPrevalidated,
    validator,
    staticValues,
    transformValues,
    touched,
    setTouched,
    submissionState,
    setSubmissionState
}: CreateFormContextArgs<T, D>) => {
    const validate = validator
        ? typeof validator === "function"
            ? () =>
                  (validator as (fields: Fields) => FormErrors<T>)(
                      baseContext.getValues()
                  )
            : createValidator<T>(
                  baseContext.getValues as () => T,
                  validator,
                  transformValues
              )
        : () => ({} as FormErrors<T>)

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
            setSubmissionState({ loading: true })
            const response = (await submitPrevalidated(values)) || {}
            setSubmissionState({ ...response, loading: false })
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

    const customContext: CustomContext<T, D> = {
        validate,
        submit,
        submissionState,
        handleBlur
    }

    return {
        ...baseContext,
        ...customContext
    }
}

export type FormContextArgs<T extends Fields, D = any> = {
    submit: (fields: T) => Promise<SubmissionState<D> | void>
    validator?: ((fields: T) => FormErrors<T>) | T
    transformValues?: (fields: T) => T
    staticValues?: any
}

export type FormContextProps<T extends Fields, D = any> = FormContextArgs<
    T,
    D
> & {
    children: ReactNode
}

// @ts-ignore
export const FormContext = createContext<FullContext<Fields>>({})

export const FormProvider = <T extends Fields, D = any>({
    children,
    ...contextArgs
}: FormContextProps<T, D>) => {
    const baseContext = useBaseForm<T>() as BaseContext<T>
    const [touched, setTouched] = useState<Array<keyof T>>([])
    const [submissionState, setSubmissionState] = useState<SubmissionState>({})
    return (
        <FormContext.Provider
            value={createFormContext({
                baseContext,
                submissionState,
                setSubmissionState,
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
    // @ts-ignore
    useContext<FullContext<T, D>>(FormContext)
