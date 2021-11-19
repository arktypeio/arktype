---
sidebar_position: 2
---

# Get started with Mocha

## Installing Redo

Install Redo using  ```npm```:

```bash
npm install --save-dev @re-do/test
```

Or install Redo using ```yarn```:

```bash
yarn add --dev @re-do/test
```

## How to use Redo with Mocha

You can use Redo with your favorite testing package. Two of the most popular are Jest and Mocha.

### Step 1: Install Mocha

Install Mocha using  ```npm```:

```bash
npm install --save-dev mocha
```

Or install Redo using ```yarn```:

```bash
yarn add --dev mocha
```

### Step 2: Add a file to hold the test

Add a test folder in your root directory so Mocha knows where to look for the tests.

Add a ```test.js``` test file in your test folder. For example, your structure could look like:

`test/test.js`

### Step 3: Add the Mocha code

Add the following code to your `test/test.js` file.

```javascript title="test/test.js"
import { getTests, run } from "@re-do/test"

describe("", () => {
    getTests().forEach(({ id, name }) => {
        it(name, async () => {
            await run({ id })
        })
    })
})
```

Note: If you are using TypeScript, you may install and use ts-mocha (see ts-mocha [here](https://www.npmjs.com/package/ts-mocha)).

### Step 4: Create your first test

To learn how to create your first test, see the guide entitled, [Creating your first test](/guides/creating-your-first-test).
