import React from "react"
import { TextInput, TextInputProps } from "../inputs"
import { ErrorText, ErrorTextProps } from "../text"
import { useFormContext } from "./FormContext"
import { FormFieldProps } from "./FormField"
import { Column } from "../layouts"

export type FormTextProps = FormFieldProps &
    TextInputProps &
    Pick<ErrorTextProps, "tooltipPlacement">

export const FormText = ({
    name,
    label,
    onBlur,
    onKeyDown,
    tooltipPlacement,
    ...rest
}: FormTextProps) => {
    const { register, errors, handleBlur, submit } = useFormContext()
    return (
        <Column align="center">
            <TextInput
                name={name}
                label={label ? label : name}
                inputRef={register}
                onBlur={event => {
                    onBlur && onBlur(event)
                    handleBlur(name)
                }}
                onKeyDown={event => {
                    onKeyDown && onKeyDown(event)
                    event.key === "Enter" && submit()
                }}
                {...rest}
            />
            <div style={{ height: 20 }}>
                {errors?.[name]?.message ? (
                    <ErrorText tooltipPlacement={tooltipPlacement}>
                        {errors[name]!.message!.split("\n")}
                    </ErrorText>
                ) : null}
            </div>
        </Column>
    )
}
