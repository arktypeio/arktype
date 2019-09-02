import React from "react"
import { TextInput, TextInputProps } from "../inputs"
import { ErrorText } from "../text"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"
import { Column } from "../layouts"

export type FormTextProps = FormFieldProps & TextInputProps

export const FormText = ({
    name,
    label,
    onBlur,
    onKeyDown,
    ...rest
}: FormTextProps) => {
    const {
        register,
        errors,
        updateErrors,
        touched,
        setTouched,
        submit
    } = useFormContext()
    return (
        <Column>
            <TextInput
                name={name}
                label={label ? label : name}
                inputRef={register}
                onBlur={event => {
                    onBlur && onBlur(event)
                    if (!touched.includes(name)) {
                        setTouched([...touched, name])
                    }
                    updateErrors()
                }}
                onKeyDown={event => {
                    onKeyDown && onKeyDown(event)
                    event.key === "Enter" && submit()
                }}
                {...rest}
            />
            <div style={{ height: 20 }}>
                {errors[name] && errors[name].message ? (
                    <ErrorText>{errors[name].message.split("\n")}</ErrorText>
                ) : null}
            </div>
        </Column>
    )
}
