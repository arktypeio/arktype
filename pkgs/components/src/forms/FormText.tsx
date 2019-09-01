import React from "react"
import { TextInput, TextInputProps } from "../inputs"
import { ErrorText } from "../text"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"

export type FormTextProps = FormFieldProps & TextInputProps

export const FormText = ({
    name,
    label,
    onBlur,
    onKeyDown,
    ...rest
}: FormTextProps) => {
    const { register, errors, updateErrors, touched, submit } = useFormContext()
    return (
        <div>
            <TextInput
                name={name}
                label={label ? label : name}
                inputRef={register}
                onBlur={event => {
                    onBlur && onBlur(event)
                    if (!touched.includes(name)) {
                        touched.push(name)
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
        </div>
    )
}
