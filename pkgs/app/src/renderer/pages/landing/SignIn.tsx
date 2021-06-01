import React from "react"
import { FormText, FormSubmit, Form, Button, Column } from "@re-do/components"
import { store } from "renderer/common"
import { formatEmail } from "./common"
import {
    useSignInMutation,
    SignInMutationVariables,
    SignInMutation
} from "@re-do/model"

export const SignIn = () => {
    const [submit] = useSignInMutation()
    const disabled = store.get("page") !== "SIGN_IN"
    return (
        <Form<SignInMutationVariables>
            submit={async (data) => {
                const result = await submit({ variables: data })
                store.update({ token: result?.data?.signIn })
            }}
            grow
            full
            justify="center"
        >
            <FormText
                name="email"
                disabled={disabled}
                errorTooltipPlacement="right"
                transform={formatEmail}
                autoFocus
            />
            <FormText
                type="password"
                errorTooltipPlacement="right"
                name="password"
                disabled={disabled}
            />
            <FormSubmit>Sign in</FormSubmit>
        </Form>
    )
}
