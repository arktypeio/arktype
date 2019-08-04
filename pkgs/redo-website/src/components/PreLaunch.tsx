import React from "react"
import { Form, FormText, FormSubmit, PrimaryButton } from "redo-components"
import { track } from "../Analytics"

export const SignUp = () => {
    return (
        <Form<{ email: string }>
            validate={_ => ({ email: [] })}
            submit={async ({ email }) => track.prelaunchRegister({ email })}
        >
            <FormText name="email" />
            <FormSubmit
                responseOptions={{
                    data: {
                        displayAs: () => (
                            <PrimaryButton disabled>
                                You're in the loop 💌
                            </PrimaryButton>
                        ),
                        hideContent: true
                    }
                }}
            >
                Keep me posted!
            </FormSubmit>
        </Form>
    )
}
