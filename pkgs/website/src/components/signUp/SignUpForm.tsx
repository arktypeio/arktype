import React from "react"
import { Form, FormText, FormSubmit, Button } from "@re-do/components"
import { track } from "./analytics"

export const SignUpForm = () => (
    <Form<{ email: string }, boolean>
        validate={(_) => ({ email: [] })}
        submit={async (options: any) => {
            await track.googleRegister({
                email: options?.variables?.email!
            })
            return { data: true }
        }}
    >
        {({ data }) => (
            <>
                <FormText name="email" />
                <FormSubmit>
                    {data ? (
                        <Button
                            style={{
                                fontSize: "large",
                                fontWeight: 700,
                                minWidth: 200
                            }}
                            disabled
                        >
                            You're in the loop 💌
                        </Button>
                    ) : (
                        <Button
                            style={{
                                fontSize: "large",
                                fontWeight: 700,
                                minWidth: 200
                            }}
                        >
                            Keep me posted!
                        </Button>
                    )}
                </FormSubmit>
            </>
        )}
    </Form>
)
