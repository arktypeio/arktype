import React, { useState } from "react"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"
import useReactHookForm, {
    FormContext as ReactHookFormContext
} from "react-hook-form"
import { Column, ColumnProps } from "../layouts"
import { Fields, CustomContext, ResponseState, FormErrors } from "./FormContext"

export type FormProps<T extends Fields, D = any> = {
    children:
        | JSX.Element
        | JSX.Element[]
        | ((state: ResponseState<D>) => JSX.Element)
    submit: (fields: T) => Promise<ResponseState<D> | void>
    validator?: ((fields: T) => FormErrors<T>) | T
    staticValues?: any
    transformValues?: (fields: T) => T
    columnProps?: ColumnProps
}

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

export const Form = <T extends Fields, D = any>({
    children,
    validator,
    submit: submitValid,
    staticValues,
    transformValues,
    columnProps
}: FormProps<T, D>) => {
    const formContext = useReactHookForm<T>()
    const [submitState, setSubmitState] = useState<ResponseState>({})
    const [touched, setTouched] = useState<Array<keyof T>>([])
    const validate = validator
        ? typeof validator === "function"
            ? () =>
                  (validator as (fields: Fields) => FormErrors<T>)(
                      formContext.getValues()
                  )
            : createValidator<T>(
                  formContext.getValues as () => T,
                  validator,
                  transformValues
              )
        : () => ({} as FormErrors<T>)
    const updateErrors = () => {
        const validationResult = validate()
        touched.forEach(key => {
            if (validationResult[key] && validationResult[key]!.length) {
                formContext.setError(
                    key,
                    "error",
                    validationResult[key]!.join("\n")
                )
            } else {
                formContext.clearError(key)
            }
        })
    }
    const submit = async () => {
        let values = {
            ...formContext.getValues(),
            ...staticValues
        } as T
        if (
            Object.values(validate()).every(errors => !errors || !errors.length)
        ) {
            values = transformValues ? transformValues(values) : values
            setSubmitState({ loading: true })
            const response = (await submitValid(values)) || {}
            setSubmitState({ ...response, loading: false })
        }
    }
    const customContext: CustomContext<T, D> = {
        validate,
        submit,
        submitState,
        touched,
        setTouched,
        updateErrors
    }
    return (
        <ReactHookFormContext {...formContext} {...customContext}>
            <Column align="center" full {...columnProps}>
                {typeof children === "function"
                    ? children(submitState)
                    : children}
            </Column>
        </ReactHookFormContext>
    )
}
