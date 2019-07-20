import React from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Response } from "../responses"
import { PrimaryButton, PrimaryButtonProps } from "../buttons"
import { MutationComponentType } from "gql"
import { connect, FormikProps } from "formik"

const styles = makeStyles((theme: Theme) => {})

const defaultButtonProps = { text: "Go" }
type FormProps<F> = { formik: FormikProps<F> }

export type FormSubmitProps<V, R> = GridProps & {
    Mutation: MutationComponentType<V, R>
    unsubmitted?: Array<keyof V>
    onSuccess?: (data: R, results: JSX.Element[]) => any
    onError?: (error: Error, results: JSX.Element[]) => any
    buttonProps?: Partial<PrimaryButtonProps>
}

export const FormSubmit = ({
    Mutation,
    unsubmitted,
    buttonProps,
    formik: { values, isValid, submitForm }
}: FormSubmitProps) => {
    const buttonPropsWithDefaults = Object.assign(
        { ...defaultButtonProps },
        buttonProps
    )
    const submittedValues = { ...values }
    unsubmitted!.forEach(k => delete submittedValues[k])

    const handleSubmit = () => {
        submitForm()
        if (isValid) {
            submit()
        }
    }

    return (
        <Response
            isLoading={loading}
            errors={error ? error.graphQLErrors.map(_ => _.message) : undefined}
        >
            <PrimaryButton
                type="submit"
                onClick={handleSubmit as any}
                key="submit"
                {...buttonPropsWithDefaults}
            />
        </Response>
    )
}
