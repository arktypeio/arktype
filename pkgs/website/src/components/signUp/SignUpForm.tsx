import React, { useState } from "react"
import { Form, FormText, FormSubmit, Button } from "@re-do/components"

export const SignUpForm = () => {
    const [submitted, setSubmitted] = useState(false)
    return (
        <Form<{ email: string }>
            submit={async ({ email }) => {
                console.log(`New user: ${email}`)
                setSubmitted(true)
                return { email }
            }}
        >
            <FormText name="email" />
            <FormSubmit
                disableAfterValidSubmission
                buttonProps={{
                    style: { fontSize: "large", fontWeight: 700, minWidth: 200 }
                }}
            >
                {submitted ? "You're in the loop 💌" : "Keep me posted!"}
            </FormSubmit>
        </Form>
    )
}
