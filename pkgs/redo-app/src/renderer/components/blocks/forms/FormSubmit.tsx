import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { component, GridProps, Response } from "blocks"
import { PrimaryButton, PrimaryButtonProps } from "blocks"
import { MutationComponentType } from "gql"

const styles = (theme: Theme) => createStyles({})

const defaultButtonProps = { text: "Go" }

export type FormSubmitProps<V, R> = GridProps & {
    Mutation: MutationComponentType<V, R>
    unsubmitted?: Array<keyof V>
    onSuccess?: (data: R, results: JSX.Element[]) => any
    onError?: (error: Error, results: JSX.Element[]) => any
    buttonProps?: Partial<PrimaryButtonProps>
}

export const createFormSubmit = <V, R>() =>
    component({
        name: "FormSubmit",
        defaultProps: { unsubmitted: [] } as Partial<FormSubmitProps<V, R>>,
        styles,
        defaultVariables: {} as Partial<V>,
        returnedData: {} as Partial<R>,
        form: true
    })(
        ({
            Mutation,
            unsubmitted,
            buttonProps,
            formik: { values, isValid, submitForm }
        }) => {
            const buttonPropsWithDefaults = Object.assign(
                { ...defaultButtonProps },
                buttonProps
            )
            const submittedValues = { ...values }
            unsubmitted!.forEach(k => delete submittedValues[k])
            return (
                <Mutation variables={submittedValues}>
                    {(submit, { loading, data, error }) => {
                        const handleSubmit = () => {
                            submitForm()
                            if (isValid) {
                                submit()
                            }
                        }

                        return (
                            <Response
                                isLoading={loading}
                                errors={
                                    error
                                        ? error.graphQLErrors.map(
                                              _ => _.message
                                          )
                                        : undefined
                                }
                            >
                                <PrimaryButton
                                    type="submit"
                                    onClick={handleSubmit as any}
                                    key="submit"
                                    {...buttonPropsWithDefaults}
                                />
                            </Response>
                        )
                    }}
                </Mutation>
            )
        }
    )
