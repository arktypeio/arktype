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

    mutation createTest {
        createTest(
            name: "Test Something"
            tags: [{ name: "BAT" }, { name: "short" }]
            steps: [{ action: "set", selector: "#someId", value: "someText" }]
        ) {
            id
        }
    }

    mutation updateTest($id: String!) {
        updateTest(
            id: $id
            name: "NewName"
            tags: [{ name: "BAT" }, { name: "short" }]
            steps: [{ action: "set", selector: "#someId", value: "someText" }]
        ) {
            id
        }
    }

    mutation createTag {
        createTag(name: "SomeFeature") {
            id
            name
        }
    }

    query getTests {
        getTests {
            id
            name
            tags {
                name
            }
            steps {
                action
                selector
                value
            }
        }
    }

    query getTags {
        getTags {
            id
            name
        }
    }

    query getSteps {
        getSteps {
            id
            action
            selector
            value
        }
    }

    query me {
        me {
            id
            email
            password
            firstName
            lastName
            tags {
                id
                name
            }
            steps {
                id
                action
                selector
                value
            }
            tests {
                id
                name
                tags {
                    id
                    name
                }
                steps {
                    id
                    action
                    selector
                    value
                }
            }
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
