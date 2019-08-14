import { print } from "graphql/language/printer"
import gql from "graphql-tag"

const contents = gql`
    mutation signUp {
        signUp(
            email: "oder@redo.qa"
            password: "redo"
            firstName: "Reed"
            lastName: "Doe"
        ) {
            token
        }
    }

    mutation signIn {
        signIn(email: "oder@redo.qa", password: "redo") {
            token
        }
    }

    mutation submitTest {
        submitTest(
            name: "Test Something"
            tags: [{ name: "BAT" }, { name: "short" }]
            steps: [
                {
                    type: "set"
                    selector: "#someId"
                    value: "someText"
                    tags: []
                }
            ]
        )
    }

    query getTest {
        getTest {
            user {
                email
            }
            name
            tags {
                name
            }
        }
    }

    query getTag {
        getTag {
            user {
                id
            }
            name
        }
    }
`

export const playground = {
    tabs: [
        {
            endpoint: `http://localhost:${process.env.PORT}`,
            query: print(contents)
        }
    ]
}
