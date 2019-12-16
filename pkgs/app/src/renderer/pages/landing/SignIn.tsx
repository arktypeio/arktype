import React from "react"
import { FormText, FormSubmit, Form, Button, Column } from "@re-do/components"
import gql from "graphql-tag"
import { SignInInput } from "@re-do/model"
import { useMutation } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { submitForm } from "renderer/components/CustomForm"
import { formatEmail } from "./common"

type SignInData = {
    signIn: string
}

const validator = new SignInInput()

export const SignIn = () => {
    const [submit] = useMutation<SignInData, SignInInput>(gql`
        mutation signIn($email: String!, $password: String!) {
            signIn(data: { email: $email, password: $password })
        }
    `)
    return (
        <Form<SignInInput, SignInData>
            validator={validator}
            submit={async fields => {
                const result = await submitForm({
                    submit,
                    fields
                })
                if (result.data && result.data.signIn) {
                    store.mutate({
                        token: result.data.signIn
                    })
                }
                return result
            }}
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
