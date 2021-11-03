import React from "react"
import { useFormContext, UseFormReturn } from "react-hook-form"
import { Button, ButtonProps } from "../buttons"
import { LoadingAnimation } from "../loading"
import { ErrorText } from "../text"

export type FormSubmitProps = {
    children?: string
    buttonProps?: ButtonProps
    disableAfterValidSubmission?: boolean
}

export const FormSubmit = ({
    children,
    buttonProps,
    disableAfterValidSubmission
}: FormSubmitProps) => {
    const {
        formState: { isValid, isSubmitting, isSubmitSuccessful },
        submitError
    } = useFormContext() as any as {
        formState: UseFormReturn["formState"]
        submitError: string
    }
    return isSubmitting ? (
        <LoadingAnimation />
    ) : (
        <>
            <Button
                {...buttonProps}
                type="submit"
                disabled={
                    !isValid ||
                    (!!disableAfterValidSubmission && isSubmitSuccessful)
                }
            >
                {children ?? "Submit"}
            </Button>
            {submitError ? <ErrorText>{submitError}</ErrorText> : null}
        </>
    )
}
