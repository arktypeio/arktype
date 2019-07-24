import React from "react"
import { TextInput } from "../inputs"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import { ErrorText } from "../typography"
import { Column } from "../layouts"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"

const stylize = makeStyles((theme: Theme) => ({
    size: { width: "100%" } // height 100% fixes spcing
}))

export type FormTextProps = FormFieldProps & {
    label?: string
    required?: boolean
}

export const FormText = ({ name, label, required = false }: FormTextProps) => {
    const { register, errors, validate, getValues, setError } = useFormContext()
    const updateFieldErrors = () => {
        const validationResult = validate(getValues())
        Object.keys(validationResult)
            .filter(input => input === "")
            .forEach(key => {
                setError(key, "error", validationResult[key].join("\n"))
            })
    }
    return (
        <Column>
            <TextInput
                name={name}
                label={label ? label : name}
                inputRef={register}
                onBlur={updateFieldErrors}
            />
            {errors[name] ? (
                <ErrorText>{errors[name].message.split("\n")}</ErrorText>
            ) : null}
        </Column>
    )
}
