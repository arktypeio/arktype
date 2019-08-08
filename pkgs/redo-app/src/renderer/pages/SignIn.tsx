import React, { FC } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles, useTheme } from "@material-ui/styles"
import {
    FormText,
    FormSubmit,
    Column,
    Row,
    Card,
    Form,
    Button
} from "redo-components"
import gql from "graphql-tag"
import { SignInInput } from "redo-model"
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

const validate = createValidator(new SignInInput())

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
                        validate={validate}
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
                                        full
                                        justify="center"
                                        align="stretch"
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
