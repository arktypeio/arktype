---
sidebar_position: 4
---

# Reading the Redo.json file

## What The redo.json file is

The ```redo.json``` file holds all of the data related to each of your tests that were created with Redo. When you open the redo app from the command line, it uses the data from your redo.json file to populate your Redo dashboard. 

To delete or edit existing tests, edit the redo.json file directly in your code editor.

## Components of the redo.json file

### Tests

Hello world.

### Elements

Hello world.

### Steps

Hello world.

### Tags

Hello world.


## Example redo.json file

Below is an example of the ```redo.json``` file that contains two tests created with Redo. The first test only navigates tot he home page and the second test navigates to the homepage and tests that the h1 on that page says "Why Redo?".

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