import React from "react"
import { TextInput } from "../inputs"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import { ErrorText } from "../typography"
import { Column } from "../layouts"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"
import { FormActions, Fields } from "./FormContext"

const stylize = makeStyles((theme: Theme) => ({
    size: { width: "100%" } // height 100% fixes spcing
}))

export type FormTextProps = FormFieldProps & {
    label?: string
    required?: boolean
}

type UpdateFieldErrorsOptions = Pick<FormActions, "validate"> & {
    setError: (key: string, _: string, errors: string) => void
    values: Fields
}

const updateFieldErrors = ({
    setError,
    validate,
    values
}: UpdateFieldErrorsOptions) => {
    const validationResult = validate(values)
    Object.keys(validationResult)
        .filter(input => input === "")
        .forEach(key => {
            setError(key, "error", validationResult[key].join("\n"))
        })
}

export const FormText = ({ name, label, required = false }: FormTextProps) => {
    const { register, errors, validate, getValues, setError } = useFormContext()
    return (
        <Column>
            <TextInput
                name={name}
                label={label ? label : name}
                inputRef={register}
                onBlur={() =>
                    updateFieldErrors({
                        setError,
                        validate,
                        values: getValues()
                    })
                }
            />
            {errors[name].message ? (
                <ErrorText>{errors[name].message.split("\n")}</ErrorText>
            ) : null}
        </Column>
    )
}
