import React from "react"
import { Form, FormText, FormSubmit, Button } from "@re-do/components"
import { track } from "./analytics"
import validator from "validator"

export const SignUpForm = () => (
    <Form<{ email: string }, boolean>
        validate={({ email }) => {
            const errors: string[] = []
            if (!validator.isEmail(email)) {
                errors.push("That doesn't look like a valid email.")
            }
            if (!(window as any).ga.loaded) {
                const uBlockErrorMessage = `It looks like you have uBlock or another adblocker\
                    enabled. That's totally cool, but unfortunately, it's\
                    blocking us from saving your email. Try temporarily\
                    disabling it, reloading the page, then submitting again.`
                errors.push(uBlockErrorMessage)
            }
            return { email: errors }
        }}
        submit={async (options: any) => {
            if (!(window as any).ga.loaded) {
                return { error: "You have uBlock." }
            }
            track.googleRegister({
                email: options?.variables?.email!
            })
            return { data: true }
        }}
    >
        {({ data }) => (
            <>
                <FormText name="email" />
                <FormSubmit>
                    <Button
                        style={{
                            fontSize: "large",
                            fontWeight: 700,
                            minWidth: 200
                        }}
                        disabled={!!data}
                    >
                        {data ? "You're in the loop 💌" : "Keep me posted!"}
                    </Button>
                </FormSubmit>
            </>
        )}
    </Form>
)
