import React from "react"
import { useFormContext, RegisterOptions } from "react-hook-form"
import { ErrorText, ErrorTextProps } from "../text"
import { TextInput, TextInputProps } from "../inputs"
import { Column } from "../layouts"
import { ValueFrom } from "@re-do/utils"

export type FormTextProps = {
    name: string
    defaultValue?: string
    optional?: boolean
    rules?: RegisterOptions
    errorTooltipPlacement?: ValueFrom<ErrorTextProps, "tooltipPlacement">
} & TextInputProps

export const FormText = ({
    name,
    defaultValue,
    optional,
    rules,
    errorTooltipPlacement,
    label,
    inputProps,
    ...rest
}: FormTextProps) => {
    const {
        register,
        setValue,
        formState: { errors }
    } = useFormContext()
    if (defaultValue) {
        setValue(name, defaultValue)
    }
    return (
        <Column align="center">
            <TextInput
                label={label ?? name}
                inputProps={{
                    ...inputProps,
                    ...register(name, { required: !optional, ...rules })
                }}
                {...rest}
            />
            <div style={{ height: 20 }}>
                {errors?.[name] ? (
                    <ErrorText tooltipPlacement={errorTooltipPlacement}>
                        {errors[name].type}
                    </ErrorText>
                ) : null}
            </div>
        </Column>
    )
}
