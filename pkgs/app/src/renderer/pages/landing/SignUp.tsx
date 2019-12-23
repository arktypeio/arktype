import React from "react"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import {
    Form,
    FormText,
    Row,
    FormSubmit,
    Button,
    Column
} from "@re-do/components"
import { useSignUpMutation } from "@re-do/model/dist/react"
import { store } from "renderer/common"
import { submitForm } from "renderer/components/CustomForm"
import { formatEmail } from "./common"

export const SignUp = () => {
    const [submit] = useSignUpMutation()
    return (
        <Form<SignUpInput, SignUpData>
            validator={validator}
            submit={async fields => {
                const result = await submitForm({ submit, fields })
                if (result.data && result.data.signUp) {
                    store.mutate({
                        token: result.data.signUp
                    })
                }
                return result
            }}
            transformValues={({ email, ...rest }) => ({
                ...rest,
                email: formatEmail(email)
            })}
        >
            <Column justify="center" grow>
                <Row spacing={1}>
                    <FormText
                        name="firstName"
                        label="first"
                        tooltipPlacement="left"
                        autoFocus
                    />
                    <FormText
                        name="lastName"
                        label="last"
                        tooltipPlacement="right"
                    />
                </Row>
                <FormText name="email" tooltipPlacement="right" />
                <Row spacing={1}>
                    <FormText
                        type="password"
                        name="password"
                        tooltipPlacement="left"
                    />
                    <FormText
                        type="password"
                        name="confirm"
                        tooltipPlacement="right"
                    />
                </Row>
            </Column>
            <FormSubmit>
                <Button>Sign up</Button>
            </FormSubmit>
        </Form>
    )
}
