import React from "react"
import { useFormContext, Controller } from "react-hook-form"
import { FormControlLabel } from "@material-ui/core"
import Checkbox, { CheckboxProps } from "@material-ui/core/Checkbox"
import { FormInputProps } from "./FormInput"

export type FormCheckProps = FormInputProps<boolean> &
    CheckboxProps & { label?: string }

export const FormCheck = ({
    name,
    rules,
    label,
    defaultValue,
    ...rest
}: FormCheckProps) => {
    const { control } = useFormContext()
    return (
        <Controller
            {...{
                name,
                control,
                defaultValue: defaultValue ?? false,
                rules,
                render: ({ field }) => (
                    <FormControlLabel
                        control={<Checkbox {...rest} {...field} />}
                        label={label ?? name}
                    />
                )
            }}
        ></Controller>
    )
}
