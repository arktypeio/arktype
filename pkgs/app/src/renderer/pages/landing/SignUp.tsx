import React from "react"
import {
    Form,
    FormText,
    Row,
    FormSubmit,
    Button,
    Column
} from "@re-do/components"
import {
    useSignUpMutation,
    SignUpMutation,
    SignUpMutationVariables
} from "@re-do/model/dist/react"
import { store } from "renderer/common"
import { formatEmail } from "./common"

export const SignUp = () => {
    const [submit] = useSignUpMutation()
    return (
        <Form<SignUpMutationVariables, SignUpMutation>
            validate={() => ({})}
            submit={submit}
            onData={data => store.mutate({ token: data.signUp })}
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
