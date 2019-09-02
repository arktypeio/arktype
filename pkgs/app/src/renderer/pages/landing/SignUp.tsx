import React from "react"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import { Form, FormText, Row, FormSubmit, Button } from "@re-do/components"
import { SignUpInput } from "@re-do/model"
import { store } from "renderer/common"
import { submitForm } from "custom/CustomForm"
import { formatEmail } from "./common"

type SignUpData = {
    signUp: {
        token: string
    }
}

const SIGNUP = gql`
    mutation signUp(
        $firstName: String!
        $lastName: String!
        $email: String!
        $password: String!
    ) {
        signUp(
            firstName: $firstName
            lastName: $lastName
            email: $email
            password: $password
        ) {
            token
        }
    }
`

const validator = new SignUpInput()

export const SignUp = () => {
    const [submit] = useMutation<SignUpData, SignUpInput>(SIGNUP)
    return (
        <Form<SignUpInput, SignUpData>
            validator={validator}
            submit={async fields => {
                const result = await submitForm({ submit, fields })
                if (result.data && result.data.signUp) {
                    store.mutate({
                        token: result.data.signUp.token
                    })
                }
                return result
            }}
            transformValues={({ email, ...rest }) => ({
                ...rest,
                email: formatEmail(email)
            })}
        >
            <>
                <Row>
                    <FormText name="firstName" label="first" autoFocus />
                    <FormText name="lastName" label="last" />
                </Row>
                <FormText name="email" />
                <Row>
                    <FormText type="password" name="password" />
                    <FormText type="password" name="confirm" />
                </Row>
                <FormSubmit>
                    <Button>Sign up</Button>
                </FormSubmit>
            </>
        </Form>
    )
}
