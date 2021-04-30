import React from "react"
import { useFormContext } from "react-hook-form"
import { Button, ButtonProps } from "../buttons"

export type FormSubmitProps = {
    children?: string
    buttonProps?: ButtonProps
}

export const FormSubmit = ({ children, buttonProps }: FormSubmitProps) => {
    const {
        formState: { isValid }
    } = useFormContext()
    return (
        <Button {...buttonProps} type="submit" disabled={!isValid}>
            {children ?? "Submit"}
        </Button>
    )
}
