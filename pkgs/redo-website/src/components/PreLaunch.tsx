import React from "react"
import { Form, FormText, FormSubmit } from "redo-components"
import Analytics from "analytics-node"

export const SignUp = () => {
    return (
        <Form<{ email: string }>
            validate={_ => ({ email: [] })}
            submit={async _ => ({})}
        >
            <FormText name="email" />
            <FormSubmit>Keep me posted!</FormSubmit>
        </Form>
    )
}
