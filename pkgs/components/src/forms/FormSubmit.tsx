import React from "react"
import { useFormContext, UseFormReturn } from "react-hook-form"
import { Button, ButtonProps } from "../buttons"
import { LoadingAnimation } from "../loading"
import { ErrorText } from "../text"

export type FormSubmitProps = {
    children?: string
    buttonProps?: ButtonProps
}

export const FormSubmit = ({ children, buttonProps }: FormSubmitProps) => {
    const {
        formState: { isValid, isSubmitting },
        submitError
    } = useFormContext() as UseFormReturn & { submitError: string }
    return isSubmitting ? (
        <LoadingAnimation />
    ) : (
        <>
            <Button {...buttonProps} type="submit" disabled={!isValid}>
                {children ?? "Submit"}
            </Button>
            {submitError ? <ErrorText>{submitError}</ErrorText> : null}
        </>
    )
}
