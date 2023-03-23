---
hide_table_of_contents: true
---

# Keywords

## jsObjectsScope

| Name     | Type                                         | Description |
| -------- | -------------------------------------------- | ----------- |
| Function | <code> (...args: any[]) =&gt; unknown</code> |             |
| Array    | <code> unknown[]</code>                      |             |
| Date     | <code> Date</code>                           |             |
| Error    | <code> Error</code>                          |             |
| Map      | <code> Map&lt;unknown, unknown&gt;</code>    |             |
| RegExp   | <code> RegExp</code>                         |             |
| Set      | <code> Set&lt;unknown&gt;</code>             |             |
| Object   | <code> Record&lt;string, unknown&gt;</code>  |             |
| String   | <code> String</code>                         |             |
| Number   | <code> Number</code>                         |             |
| Boolean  | <code> Boolean</code>                        |             |
| WeakMap  | <code> WeakMap&lt;object, unknown&gt;</code> |             |
| WeakSet  | <code> WeakSet&lt;object&gt;</code>          |             |
| Promise  | <code> Promise&lt;unknown&gt;</code>         |             |

## tsKeywordsScope

| Name      | Type                    | Description |
| --------- | ----------------------- | ----------- |
| any       | <code> any</code>       | any         |
| bigint    | <code> bigint</code>    | a bigint    |
| boolean   | <code> boolean</code>   | a boolean   |
| false     | <code> false</code>     | false       |
| never     | <code> never</code>     | never       |
| null      | <code> null</code>      | null        |
| number    | <code> number</code>    | a number    |
| object    | <code> object</code>    | an object   |
| string    | <code> string</code>    | a string    |
| symbol    | <code> symbol</code>    | a symbol    |
| true      | <code> true</code>      | true        |
| unknown   | <code> unknown</code>   | unknown     |
| void      | <code> void</code>      | void        |
| undefined | <code> undefined</code> | undefined   |

## validationScope

| Name          | Type                                     | Description                  |
| ------------- | ---------------------------------------- | ---------------------------- |
| alpha         | <code> string</code>                     | only letters                 |
| alphanumeric  | <code> string</code>                     | only letters and digits      |
| lowercase     | <code> string</code>                     | only lowercase letters       |
| uppercase     | <code> string</code>                     | only uppercase letters       |
| creditCard    | <code> string</code>                     | a valid credit card number   |
| email         | <code> string</code>                     | a valid email                |
| uuid          | <code> string</code>                     | a valid UUID                 |
| parsedNumber  | <code> (In: string) =&gt; number</code>  | a well-formed numeric string |
| parsedInteger | <code> (In: string) =&gt; number</code>  | a well-formed integer string |
| parsedDate    | <code> (In: string) =&gt; Date</code>    | a valid date                 |
| semver        | <code> string</code>                     | a valid semantic version     |
| json          | <code> (In: string) =&gt; unknown</code> | a JSON-parsable string       |
| integer       | <code> number</code>                     | an integer                   |
