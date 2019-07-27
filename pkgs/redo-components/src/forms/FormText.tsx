import React, { useState } from "react"
import { TextInput } from "../inputs"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import { ErrorText } from "../typography"
import { Column } from "../layouts"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"
import { FormActions, Fields } from "./FormContext"

export type FormTextProps = FormFieldProps & {
    label?: string
    required?: boolean
}

type UpdateFieldErrorsOptions = Pick<FormActions<Fields>, "validate"> & {
    setError: (key: string, _: string, errors: string) => void
    clearError: (key: string) => void
    values: Fields
    touched: string[]
}

const updateFieldErrors = ({
    setError,
    clearError,
    validate,
    values,
    touched
}: UpdateFieldErrorsOptions) => {
    const validationResult = validate(values)
    Object.keys(values)
        .filter(input => touched.includes(input))
        .forEach(key => {
            if (
                key in validationResult &&
                validationResult[key] &&
                validationResult[key]!.length
            ) {
                setError(key, "error", validationResult[key]!.join("\n"))
            } else {
                clearError(key)
            }
        })
}

export const FormText = ({ name, label }: FormTextProps) => {
    const {
        register,
        errors,
        validate,
        getValues,
        setError,
        clearError,
        touched
    } = useFormContext()
    console.log(errors)
    const [state, setState] = useState("")
    return (
        <Column>
            <TextInput
                name={name}
                label={label ? label : name}
                inputRef={register}
                onChange={e => setState(e.target.value)}
                value={state}
                onBlur={() => {
                    if (!touched.includes(name)) {
                        touched.push(name)
                    }
                    updateFieldErrors({
                        setError,
                        validate,
                        values: getValues(),
                        touched,
                        clearError
                    })
                }}
            />
            {errors[name] && errors[name].message ? (
                <ErrorText>{errors[name].message.split("\n")}</ErrorText>
            ) : null}
        </Column>
    )
}
