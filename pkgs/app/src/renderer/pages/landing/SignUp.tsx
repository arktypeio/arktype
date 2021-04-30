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
} from "@re-do/model"
import { store } from "renderer/common"
import { formatEmail } from "./common"

export const SignUp = () => {
    const [submit] = useSignUpMutation()
    const disabled =
        store.useQuery({
            page: true
        }).page !== "SIGN_UP"
    return (
        <Form
            submit={async (data) => {
                const result = await submit()
                store.update({ token: result?.data?.signUp })
            }}
        >
            <Column justify="center" grow>
                <Row spacing={1}>
                    <FormText
                        name="first"
                        errorTooltipPlacement="left"
                        disabled={disabled}
                        autoFocus
                    />
                    <FormText
                        name="last"
                        errorTooltipPlacement="right"
                        disabled={disabled}
                    />
                </Row>
                <FormText
                    name="email"
                    errorTooltipPlacement="right"
                    disabled={disabled}
                />
                <Row spacing={1}>
                    <FormText
                        type="password"
                        name="password"
                        errorTooltipPlacement="left"
                        disabled={disabled}
                    />
                    <FormText
                        type="password"
                        name="confirm"
                        errorTooltipPlacement="right"
                        disabled={disabled}
                    />
                </Row>
            </Column>
            <FormSubmit>Sign up</FormSubmit>
        </Form>
    )
}
