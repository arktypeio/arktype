import React from "react"
import { FormText, FormSubmit, Form, Button, Column } from "@re-do/components"
import { store } from "renderer/common"
import { formatEmail } from "./common"
import {
    useSignInMutation,
    SignInMutation,
    SignInMutationVariables
} from "@re-do/model"

export const SignIn = () => {
    const [submit] = useSignInMutation()
    const disabled =
        store.useQuery({
            page: true
        }).page !== "SIGN_IN"
    return (
        <Form<SignInMutationVariables, SignInMutation>
            submit={submit}
            onData={(data) => store.update({ token: data.signIn })}
            transformValues={({ email, ...rest }) => {
                return {
                    ...rest,
                    email: formatEmail(email)
                }
            }}
        >
            <Column justify="center" grow>
                <FormText
                    name="email"
                    disabled={disabled}
                    tooltipPlacement="right"
                    autoFocus
                />
                <FormText
                    type="password"
                    tooltipPlacement="right"
                    name="password"
                    disabled={disabled}
                />
            </Column>
            <FormSubmit>
                <Button disabled={disabled}>Sign in</Button>
            </FormSubmit>
        </Form>
    )
}
