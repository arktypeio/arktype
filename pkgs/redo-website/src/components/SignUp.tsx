import React from "react"
import { Form, FormText, FormSubmit } from "redo-components"

export const SignUp = () => {
    return (
        <Form<{ email: string }>
            validate={_ => ({ email: [] })}
            submit={async _ => ({})}
        >
            <FormText name="email" />
            <FormSubmit>Submit</FormSubmit>
        </Form>
    )
}
