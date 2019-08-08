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

const stylize = makeStyles((theme: Theme) => ({
    animatedFields: {
        display: "flex",
        flexGrow: 1,
        justifyContent: "space-around"
    }
}))

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
    const { animatedFields } = stylize()
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
                                    style={{ width: "100%" }}
                                    positionTransition
                                    initial={{
                                        x: -500
                                    }}
                                    animate={{ x: 0 }}
                                    exit={{ x: -500 }}
                                    className={animatedFields}
                                >
                                    <Column grow justify="center">
                                        <FormText
                                            style={{ width: "100%" }}
                                            name="email"
                                            autoFocus
                                        />
                                        <FormText
                                            style={{ width: "100%" }}
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
