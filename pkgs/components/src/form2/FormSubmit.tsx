import React from "react"
import { Button, ButtonProps } from "../buttons"

export type FormSubmitProps = {
    children?: string
    buttonProps?: ButtonProps
}

export const FormSubmit = ({ children, buttonProps }: FormSubmitProps) => {
    return (
        <Button {...buttonProps} type="submit">
            {children ?? "Submit"}
        </Button>
    )
}
