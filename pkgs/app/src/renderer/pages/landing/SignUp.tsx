import React from "react"
import {
    Form,
    FormText,
    Row,
    FormSubmit,
    Button,
    Column,
} from "@re-do/components"
import {
    useSignUpMutation,
    SignUpMutation,
    SignUpMutationVariables,
} from "@re-do/model/dist/react"
import { store } from "renderer/common"
import { formatEmail } from "./common"

export const SignUp = () => {
    const [submit] = useSignUpMutation()
    const disabled =
        store.useQuery({
            page: true,
        }).page !== "SIGN_UP"
    return (
        <Form<SignUpMutationVariables, SignUpMutation>
            validate={() => ({})}
            submit={submit}
            onData={(data) => store.mutate({ token: data.signUp })}
            transformValues={({ email, ...rest }) => {
                return {
                    ...rest,
                    email: formatEmail(email),
                }
            }}
        >
            <Column justify="center" grow>
                <Row spacing={1}>
                    <FormText
                        name="first"
                        tooltipPlacement="left"
                        disabled={disabled}
                        autoFocus
                    />
                    <FormText
                        name="last"
                        tooltipPlacement="right"
                        disabled={disabled}
                    />
                </Row>
                <FormText
                    name="email"
                    tooltipPlacement="right"
                    disabled={disabled}
                />
                <Row spacing={1}>
                    <FormText
                        type="password"
                        name="password"
                        tooltipPlacement="left"
                        disabled={disabled}
                    />
                    <FormText
                        type="password"
                        name="confirm"
                        tooltipPlacement="right"
                        disabled={disabled}
                    />
                </Row>
            </Column>
            <FormSubmit>
                <Button disabled={disabled}>Sign up</Button>
            </FormSubmit>
        </Form>
    )
}
