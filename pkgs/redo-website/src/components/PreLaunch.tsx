import React from "react"
import { Form, FormText, FormSubmit } from "redo-components"
import { track } from "../Analytics"

export const SignUp = () => {
    return (
        <Form<{ email: string }>
            validate={_ => ({ email: [] })}
            submit={async ({ email }) => track.prelaunchRegister({ email })}
        >
            <FormText name="email" />
            <FormSubmit>Keep me posted!</FormSubmit>
        </Form>
    )
}
