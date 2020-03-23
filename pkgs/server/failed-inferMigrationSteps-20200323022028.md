# Failed inferMigrationSteps at 2020-03-23T06:20:28.657Z

## RPC One-Liner

```json
{
    "id": 2,
    "jsonrpc": "2.0",
    "method": "inferMigrationSteps",
    "params": {
        "projectInfo": "",
        "sourceConfig": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\n// datasource prod {\n//   provider = \"mysql\"\n//   url      = env(\"MYSQL_URL\")\n//   enabled  = env(\"ENABLE_MYSQL\")\n// }\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id @default(autoincrement())\n  user User\n  name String\n  @@unique([name, user])\n}\n\n\nmodel Step {\n  id    Int      @id @default(autoincrement())\n  kind  StepKind\n  data  StepData\n  tests Test[]\n}\n\nmodel Test {\n  id    Int    @id @default(autoincrement())\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id       Int    @id @default(autoincrement())\n  email    String @unique\n  password String\n  first    String\n  last     String\n  steps    Step[]\n  tags     Tag[]\n  tests    Test[]\n}\n\nenum StepKind {\n  click set hover key go screenshot assertText assertVisibility\n}\n\n\nmodel StepData {\n  id               Int                   @id @default(autoincrement())\n  click            ClickData?\n  set              SetData?\n  hover            HoverData?\n  key              KeyData?\n  go               GoData?\n  assertText       AssertTextData?\n  assertVisibility AssertVisibilityData?\n}\n\nmodel ClickData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  double   Boolean @default(false)\n}\n\nmodel SetData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  value    String\n}\n\nmodel HoverData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  duration Int\n}\n\nmodel KeyData {\n  id  Int    @id @default(autoincrement())\n  key String\n}\n\nmodel GoData {\n  id  Int    @id @default(autoincrement())\n  url String\n}\n\nmodel AssertTextData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  expected String\n}\n\nmodel AssertVisibilityData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  expected Boolean\n}",
        "datamodel": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\n// datasource prod {\n//   provider = \"mysql\"\n//   url      = env(\"MYSQL_URL\")\n//   enabled  = env(\"ENABLE_MYSQL\")\n// }\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id @default(autoincrement())\n  user User\n  name String\n  @@unique([name, user])\n}\n\n\nmodel Step {\n  id    Int      @id @default(autoincrement())\n  kind  StepKind\n  data  StepData\n  tests Test[]\n}\n\nmodel Test {\n  id    Int    @id @default(autoincrement())\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id       Int    @id @default(autoincrement())\n  email    String @unique\n  password String\n  first    String\n  last     String\n  steps    Step[]\n  tags     Tag[]\n  tests    Test[]\n}\n\nenum StepKind {\n  click set hover key go screenshot assertText assertVisibility\n}\n\n\nmodel StepData {\n  id               Int                   @id @default(autoincrement())\n  click            ClickData?\n  set              SetData?\n  hover            HoverData?\n  key              KeyData?\n  go               GoData?\n  assertText       AssertTextData?\n  assertVisibility AssertVisibilityData?\n}\n\nmodel ClickData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  double   Boolean @default(false)\n}\n\nmodel SetData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  value    String\n}\n\nmodel HoverData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  duration Int\n}\n\nmodel KeyData {\n  id  Int    @id @default(autoincrement())\n  key String\n}\n\nmodel GoData {\n  id  Int    @id @default(autoincrement())\n  url String\n}\n\nmodel AssertTextData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  expected String\n}\n\nmodel AssertVisibilityData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  expected Boolean\n}",
        "migrationId": "DUMMY_NAME",
        "assumeToBeApplied": [
            { "stepType": "CreateModel", "name": "Tag", "embedded": false },
            { "stepType": "CreateModel", "name": "Step", "embedded": false },
            { "stepType": "CreateModel", "name": "Test", "embedded": false },
            { "stepType": "CreateModel", "name": "User", "embedded": false },
            { "stepType": "CreateModel", "name": "Session", "embedded": false },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "id",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true,
                "id": { "strategy": "Auto", "sequence": null },
                "default": { "Expression": ["cuid", "String", []] }
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "name",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "TagToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "test",
                "type": {
                    "Relation": {
                        "to": "Test",
                        "to_fields": ["id"],
                        "name": "TagToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "optional",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "id",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true,
                "id": { "strategy": "Auto", "sequence": null },
                "default": { "Expression": ["cuid", "String", []] }
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "action",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "selector",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "value",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "StepToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "test",
                "type": {
                    "Relation": {
                        "to": "Test",
                        "to_fields": ["id"],
                        "name": "StepToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "optional",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "id",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true,
                "id": { "strategy": "Auto", "sequence": null },
                "default": { "Expression": ["cuid", "String", []] }
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "TestToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "name",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "tags",
                "type": {
                    "Relation": {
                        "to": "Tag",
                        "to_fields": [],
                        "name": "TagToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "steps",
                "type": {
                    "Relation": {
                        "to": "Step",
                        "to_fields": [],
                        "name": "StepToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "id",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true,
                "id": { "strategy": "Auto", "sequence": null },
                "default": { "Expression": ["cuid", "String", []] }
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "email",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "password",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "firstName",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "lastName",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "tags",
                "type": {
                    "Relation": {
                        "to": "Tag",
                        "to_fields": [],
                        "name": "TagToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "tests",
                "type": {
                    "Relation": {
                        "to": "Test",
                        "to_fields": [],
                        "name": "TestToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "steps",
                "type": {
                    "Relation": {
                        "to": "Step",
                        "to_fields": [],
                        "name": "StepToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "session",
                "type": {
                    "Relation": {
                        "to": "Session",
                        "to_fields": [],
                        "name": "SessionToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "optional",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Session",
                "name": "id",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": true,
                "id": { "strategy": "Auto", "sequence": null },
                "default": { "Expression": ["cuid", "String", []] }
            },
            {
                "stepType": "CreateField",
                "model": "Session",
                "name": "token",
                "type": { "Base": "String" },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Session",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "SessionToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            }
        ]
    }
}
```

## RPC Input Readable

```json
{
    "id": 2,
    "jsonrpc": "2.0",
    "method": "inferMigrationSteps",
    "params": {
        "projectInfo": "",
        "sourceConfig": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\n// datasource prod {\n//   provider = \"mysql\"\n//   url      = env(\"MYSQL_URL\")\n//   enabled  = env(\"ENABLE_MYSQL\")\n// }\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id @default(autoincrement())\n  user User\n  name String\n  @@unique([name, user])\n}\n\n\nmodel Step {\n  id    Int      @id @default(autoincrement())\n  kind  StepKind\n  data  StepData\n  tests Test[]\n}\n\nmodel Test {\n  id    Int    @id @default(autoincrement())\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id       Int    @id @default(autoincrement())\n  email    String @unique\n  password String\n  first    String\n  last     String\n  steps    Step[]\n  tags     Tag[]\n  tests    Test[]\n}\n\nenum StepKind {\n  click set hover key go screenshot assertText assertVisibility\n}\n\n\nmodel StepData {\n  id               Int                   @id @default(autoincrement())\n  click            ClickData?\n  set              SetData?\n  hover            HoverData?\n  key              KeyData?\n  go               GoData?\n  assertText       AssertTextData?\n  assertVisibility AssertVisibilityData?\n}\n\nmodel ClickData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  double   Boolean @default(false)\n}\n\nmodel SetData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  value    String\n}\n\nmodel HoverData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  duration Int\n}\n\nmodel KeyData {\n  id  Int    @id @default(autoincrement())\n  key String\n}\n\nmodel GoData {\n  id  Int    @id @default(autoincrement())\n  url String\n}\n\nmodel AssertTextData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  expected String\n}\n\nmodel AssertVisibilityData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  expected Boolean\n}",
        "datamodel": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\n// datasource prod {\n//   provider = \"mysql\"\n//   url      = env(\"MYSQL_URL\")\n//   enabled  = env(\"ENABLE_MYSQL\")\n// }\n\ngenerator client {\n  provider      = \"prisma-client-js\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id @default(autoincrement())\n  user User\n  name String\n  @@unique([name, user])\n}\n\n\nmodel Step {\n  id    Int      @id @default(autoincrement())\n  kind  StepKind\n  data  StepData\n  tests Test[]\n}\n\nmodel Test {\n  id    Int    @id @default(autoincrement())\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id       Int    @id @default(autoincrement())\n  email    String @unique\n  password String\n  first    String\n  last     String\n  steps    Step[]\n  tags     Tag[]\n  tests    Test[]\n}\n\nenum StepKind {\n  click set hover key go screenshot assertText assertVisibility\n}\n\n\nmodel StepData {\n  id               Int                   @id @default(autoincrement())\n  click            ClickData?\n  set              SetData?\n  hover            HoverData?\n  key              KeyData?\n  go               GoData?\n  assertText       AssertTextData?\n  assertVisibility AssertVisibilityData?\n}\n\nmodel ClickData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  double   Boolean @default(false)\n}\n\nmodel SetData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  value    String\n}\n\nmodel HoverData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  duration Int\n}\n\nmodel KeyData {\n  id  Int    @id @default(autoincrement())\n  key String\n}\n\nmodel GoData {\n  id  Int    @id @default(autoincrement())\n  url String\n}\n\nmodel AssertTextData {\n  id       Int    @id @default(autoincrement())\n  selector String\n  expected String\n}\n\nmodel AssertVisibilityData {\n  id       Int     @id @default(autoincrement())\n  selector String\n  expected Boolean\n}",
        "migrationId": "DUMMY_NAME",
        "assumeToBeApplied": [
            {
                "stepType": "CreateModel",
                "name": "Tag",
                "embedded": false
            },
            {
                "stepType": "CreateModel",
                "name": "Step",
                "embedded": false
            },
            {
                "stepType": "CreateModel",
                "name": "Test",
                "embedded": false
            },
            {
                "stepType": "CreateModel",
                "name": "User",
                "embedded": false
            },
            {
                "stepType": "CreateModel",
                "name": "Session",
                "embedded": false
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "id",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true,
                "id": {
                    "strategy": "Auto",
                    "sequence": null
                },
                "default": {
                    "Expression": ["cuid", "String", []]
                }
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "name",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "TagToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Tag",
                "name": "test",
                "type": {
                    "Relation": {
                        "to": "Test",
                        "to_fields": ["id"],
                        "name": "TagToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "optional",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "id",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true,
                "id": {
                    "strategy": "Auto",
                    "sequence": null
                },
                "default": {
                    "Expression": ["cuid", "String", []]
                }
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "action",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "selector",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "value",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "StepToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Step",
                "name": "test",
                "type": {
                    "Relation": {
                        "to": "Test",
                        "to_fields": ["id"],
                        "name": "StepToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "optional",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "id",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true,
                "id": {
                    "strategy": "Auto",
                    "sequence": null
                },
                "default": {
                    "Expression": ["cuid", "String", []]
                }
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "TestToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "name",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "tags",
                "type": {
                    "Relation": {
                        "to": "Tag",
                        "to_fields": [],
                        "name": "TagToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Test",
                "name": "steps",
                "type": {
                    "Relation": {
                        "to": "Step",
                        "to_fields": [],
                        "name": "StepToTest",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "id",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true,
                "id": {
                    "strategy": "Auto",
                    "sequence": null
                },
                "default": {
                    "Expression": ["cuid", "String", []]
                }
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "email",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "password",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "firstName",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "lastName",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "tags",
                "type": {
                    "Relation": {
                        "to": "Tag",
                        "to_fields": [],
                        "name": "TagToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "tests",
                "type": {
                    "Relation": {
                        "to": "Test",
                        "to_fields": [],
                        "name": "TestToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "steps",
                "type": {
                    "Relation": {
                        "to": "Step",
                        "to_fields": [],
                        "name": "StepToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "list",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "User",
                "name": "session",
                "type": {
                    "Relation": {
                        "to": "Session",
                        "to_fields": [],
                        "name": "SessionToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "optional",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Session",
                "name": "id",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": true,
                "id": {
                    "strategy": "Auto",
                    "sequence": null
                },
                "default": {
                    "Expression": ["cuid", "String", []]
                }
            },
            {
                "stepType": "CreateField",
                "model": "Session",
                "name": "token",
                "type": {
                    "Base": "String"
                },
                "arity": "required",
                "isUnique": false
            },
            {
                "stepType": "CreateField",
                "model": "Session",
                "name": "user",
                "type": {
                    "Relation": {
                        "to": "User",
                        "to_fields": ["id"],
                        "name": "SessionToUser",
                        "on_delete": "None"
                    }
                },
                "arity": "required",
                "isUnique": false
            }
        ]
    }
}
```

## Stack Trace

```bash
Mar 23 02:20:28.646  INFO migration_engine: Starting migration engine RPC server git_hash="377df4fe30aa992f13f1ba152cf83d5770bdbc85"
Mar 23 02:20:28.648  INFO quaint::single: Starting a sqlite pool with 1 connections.
Mar 23 02:20:28.653  INFO ListMigrations: migration_core::commands::list_migrations: Returning 0 migrations (0 pending).
```
