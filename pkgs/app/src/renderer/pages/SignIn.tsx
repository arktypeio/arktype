import React, { FC } from "react"
import { Theme } from "@material-ui/core"
import { useTheme } from "@material-ui/styles"
import {
    FormText,
    FormSubmit,
    Column,
    Card,
    Form,
    Button
} from "@re-do/components"
import gql from "graphql-tag"
import { SignInInput } from "@re-do/model"
import { motion, AnimatePresence } from "framer-motion"
import Logo from "assets/logo.svg"
import { useMutation } from "@apollo/react-hooks"
import { store } from "renderer/common"
import { createValidator, submitForm } from "custom/CustomForm"
import { Page } from "renderer/state"

const SIGNIN = gql`
    mutation signIn($email: String!, $password: String!) {
        signIn(email: $email, password: $password) {
            token
        }
    }
`

type SignInData = {
    signIn: {
        token: string
    }
}

const validator = new SignInInput()

export const SignIn: FC = () => {
    const [submit] = useMutation<SignInData, SignInInput>(SIGNIN)
    const theme = useTheme<Theme>()
    return (
        <Column full justify="center" align="center">
            <Card
                style={{
                    width: theme.spacing(45),
                    height: theme.spacing(50),
                    padding: `${theme.spacing(3)}px ${theme.spacing(5)}px`
                }}
            >
                <Column full>
                    <Logo />
                    <Form<SignInInput, SignInData>
                        validator={validator}
                        submit={async fields => {
                            const result = await submitForm({
                                submit,
                                fields
                            })
                            if (result.data && result.data.signIn) {
                                store.mutate({
                                    token: result.data.signIn.token
                                })
                            }
                            return result
                        }}
                        transformValues={values => ({
                            ...values,
                            email: values.email
                                ? values.email.toLowerCase()
                                : ""
                        })}
                    >
                        <Column grow align="center">
                            <AnimatePresence>
                                <motion.div
                                    positionTransition
                                    initial={{
                                        x: -500
                                    }}
                                    animate={{ x: 0 }}
                                    exit={{ x: -500 }}
                                    style={{
                                        width: "100%",
                                        height: "100%"
                                    }}
                                >
                                    <Column
                                        full={true}
                                        justify="center"
                                        align="center"
                                    >
                                        <FormText name="email" autoFocus />
                                        <FormText
                                            type="password"
                                            name="password"
                                        />
                                    </Column>
                                </motion.div>
                            </AnimatePresence>
                            <FormSubmit
                                responseOptions={{
                                    loading: { hideContent: true }
                                }}
                            >
                                Sign in
                            </FormSubmit>
                        </Column>
                    </Form>
                </Column>
            </Card>
            <Button
                kind="secondary"
                onClick={() => store.mutate({ page: Page.SignUp })}
            >
                Need an account?
            </Button>
        </Column>
    )
}
