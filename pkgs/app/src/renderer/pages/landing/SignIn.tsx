import React from "react"
import { FormText, FormSubmit, Form, Button, Column } from "@re-do/components"
import { store } from "renderer/common"
import { formatEmail } from "./common"
import {
    useSignInMutation,
    SignInMutation,
    SignInMutationVariables
} from "@re-do/model/dist/react"

export const SignIn = () => {
    const [submit] = useSignInMutation()
    return (
        <Form<SignInMutationVariables, SignInMutation>
            submit={submit}
            onData={data => store.mutate({ token: data.signIn })}
            transformValues={({ email, ...rest }) => {
                return {
                    ...rest,
                    email: formatEmail(email)
                }
            }}
        >
            <Column justify="center" grow>
                <FormText name="email" tooltipPlacement="right" autoFocus />
                <FormText
                    type="password"
                    tooltipPlacement="right"
                    name="password"
                />
            </Column>
            <FormSubmit>
                <Button>Sign in</Button>
            </FormSubmit>
        </Form>
    )
}
