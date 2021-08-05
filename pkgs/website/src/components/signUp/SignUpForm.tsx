import React, { useState } from "react"
import { Form, FormText, FormSubmit } from "@re-do/components"
import { useSubscribeMutation } from "@re-do/model"
import { track } from "./analytics.js"

export const SignUpForm = () => {
    const [submitted, setSubmitted] = useState(false)
    const [subscribe] = useSubscribeMutation()
    return (
        <Form<{ email: string }>
            submit={async ({ email }) => {
                await subscribe({
                    variables: { email }
                })
                await track.subscribe({ email })
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
