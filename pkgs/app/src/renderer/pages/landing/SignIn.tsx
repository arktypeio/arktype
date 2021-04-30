import React from "react"
import { FormText, FormSubmit, Form, Button, Column } from "@re-do/components"
import { store } from "renderer/common"
import { formatEmail } from "./common"
import { useSignInMutation } from "@re-do/model"

export const SignIn = () => {
    const [submit] = useSignInMutation()
    const disabled =
        store.useQuery({
            page: true
        }).page !== "SIGN_IN"
    return (
        <Form
            submit={async (data) => {
                const result = await submit()
                store.update({ token: result?.data?.signIn })
            }}
        >
            <Column justify="center" grow>
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
            </Column>
            <FormSubmit>Sign in</FormSubmit>
        </Form>
    )
}
