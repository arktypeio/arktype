---
sidebar_position: 4
---

# Reading the redo.json file

## What the redo.json file is

The `redo.json` is automatically generated in your root when you create your first test using Redo. The redo.json file holds all of the data related to each of your tests that were created with Redo. Redo uses the data from your redo.json file to populate your Redo dashboard.

## Components of the redo.json file

### Tests

This is an array of each test you created with the Redo app.

#### name

The name of your test.

#### tags

Tags that identify your test.

#### steps

The steps within each test. The contents of each step is included in the Steps portion of the json below so that each portion of your test is only saved in one place.

#### id

A unique identifier for your test.

### Elements

Elements are an array of simplified selector and a unique id.

### Steps

Steps make up a test. They are saved here so that steps can be resused and will only be saved in one palace at a time.

#### kind

The step kind is the type of action that was taken. Step kinds include:

| Step Kind  | How it is invoked                                                                       |
| ---------- | --------------------------------------------------------------------------------------- |
| go         | Go to a new page or url                                                                 |
| click      | Click on an element                                                                     |
| set        | Add text to an input                                                                    |
| assertText | Highlight an element on the page                                                        |
| screenshot | Take a screenshot                                                                       |
| custom     | You may create your own custom kinds, see how to [here](/guides/creating-custom-steps). |

### Tags

Tags make it eaiser to categorize your tests.

## Example redo.json file

Below is an example of the `redo.json` file that contains two tests created with Redo. The first test only navigates tot he home page and the second test navigates to the homepage and tests that the h1 on that page says "Why Redo?".

```json
{
    "tests": [
        {
            "name": "The Website Launches",
            "tags": [],
            "steps": [1],
            "id": 1
        },
        {
            "name": "Why Redo? Is The Title",
            "tags": [],
            "steps": [1, 2],
            "id": 2
        }
    ],
    "elements": [
        {
            "selector": "h1",
            "id": 1
        }
    ],
    "steps": [
        {
            "kind": "go",
            "url": "http://localhost:3000/",
            "id": 1
        },
        {
            "kind": "assertText",
            "element": 1,
            "value": "Why Redo?",
            "id": 2
        }
    ],
    "tags": []
}
```
