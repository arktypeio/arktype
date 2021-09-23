---
sidebar_position: 5
---

# Creating custom step kinds

## Why create custom step kinds

If you need to test something that is not in the default step kinds, you can easily create a custom step kind and implement it within your redo.json file. For example, if you want to check that the url is equal to a certain value, you can create an ```assertUrl``` step kind.

You can see the default step kinds [here](/guides/reading-the-redo-json-file#kind).

## Creating a custom assertUrl step kind

### Step 1: Create a redo.config file

Create redo.config file in your root directory.

### Step 2: Add the custom code

Add the following code to your `redo.config`.

```javascript title="redo.config"
import { defineConfig } from "@re-do/test"

export default defineConfig({
    customStepKinds: {
        assertUrl: async (args, { page }) => {
            const activeUrl = page.url()
            if (activeUrl !== args.url) {
                throw new Error(
                    `Url ${activeUrl} didn't match expected ${args.url}.`
                )
            }
        }
    }
})
```

### Step 2: Add the custom step kind to your test

You can then add the custom step kind and url value to your redo.json file. For example:

```json
{
    "kind": "assertUrl",
    "url": "https://redo.qa/",
    "id": 4
} 
```

 A test that goes to the redo.qa homepage and tests that the url is [https://redo.qa/](https://redo.qa/) will look like the following:

```json title="redo.json"
{
    "tests": [
        {
            "name": "The Website Launches And Goes To redo.qa",
            "tags": [],
            "steps": [1,2],
            "id": 1
        },        
    ],
    "elements": [],
    "steps": [
        {
            "kind": "go",
            "url": "https://redo.qa/",
            "id": 1
        },
        {
            "kind": "assertUrl",
            "url": "https://redo.qa/",
            "id": 2
        } 
    ],
    "tags": []
}
```
