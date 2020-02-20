# Failed inferMigrationSteps at 2020-02-20T22:26:26.067Z

## RPC One-Liner

```json
{
    "id": 2,
    "jsonrpc": "2.0",
    "method": "inferMigrationSteps",
    "params": {
        "projectInfo": "",
        "sourceConfig": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\ndatasource prod {\n  provider = \"mysql\"\n  url      = env(\"MYSQL_URL\")\n  enabled  = env(\"ENABLE_MYSQL\")\n}\n\ngenerator photon {\n  provider      = \"photonjs\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id\n  user User\n  name String\n  @@unique([name, user])\n}\n\nmodel Selector {\n  id  Int    @id\n  css String\n}\n\nmodel Step {\n  id       Int      @id\n  action   String\n  selector Selector\n  value    String\n  tests    Test[]\n}\n\nmodel Test {\n  id    Int    @id\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id        Int        @id\n  email     String     @unique\n  password  String\n  first     String\n  last      String\n  steps     Step[]\n  selectors Selector[]\n  tags      Tag[]\n  tests     Test[]\n}",
        "datamodel": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\ndatasource prod {\n  provider = \"mysql\"\n  url      = env(\"MYSQL_URL\")\n  enabled  = env(\"ENABLE_MYSQL\")\n}\n\ngenerator photon {\n  provider      = \"photonjs\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id\n  user User\n  name String\n  @@unique([name, user])\n}\n\nmodel Selector {\n  id  Int    @id\n  css String\n}\n\nmodel Step {\n  id       Int      @id\n  action   String\n  selector Selector\n  value    String\n  tests    Test[]\n}\n\nmodel Test {\n  id    Int    @id\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id        Int        @id\n  email     String     @unique\n  password  String\n  first     String\n  last      String\n  steps     Step[]\n  selectors Selector[]\n  tags      Tag[]\n  tests     Test[]\n}",
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
        "sourceConfig": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\ndatasource prod {\n  provider = \"mysql\"\n  url      = env(\"MYSQL_URL\")\n  enabled  = env(\"ENABLE_MYSQL\")\n}\n\ngenerator photon {\n  provider      = \"photonjs\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id\n  user User\n  name String\n  @@unique([name, user])\n}\n\nmodel Selector {\n  id  Int    @id\n  css String\n}\n\nmodel Step {\n  id       Int      @id\n  action   String\n  selector Selector\n  value    String\n  tests    Test[]\n}\n\nmodel Test {\n  id    Int    @id\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id        Int        @id\n  email     String     @unique\n  password  String\n  first     String\n  last      String\n  steps     Step[]\n  selectors Selector[]\n  tags      Tag[]\n  tests     Test[]\n}",
        "datamodel": "datasource dev {\n  provider = \"sqlite\"\n  url      = env(\"SQLITE_URL\")\n  enabled  = env(\"ENABLE_SQLITE\")\n}\n\ndatasource prod {\n  provider = \"mysql\"\n  url      = env(\"MYSQL_URL\")\n  enabled  = env(\"ENABLE_MYSQL\")\n}\n\ngenerator photon {\n  provider      = \"photonjs\"\n  binaryTargets = [\"native\", \"rhel-openssl-1.0.x\"]\n}\n\nmodel Tag {\n  id   Int    @id\n  user User\n  name String\n  @@unique([name, user])\n}\n\nmodel Selector {\n  id  Int    @id\n  css String\n}\n\nmodel Step {\n  id       Int      @id\n  action   String\n  selector Selector\n  value    String\n  tests    Test[]\n}\n\nmodel Test {\n  id    Int    @id\n  user  User\n  name  String\n  steps Step[]\n  tags  Tag[]\n  @@unique([name, user])\n}\n\nmodel User {\n  id        Int        @id\n  email     String     @unique\n  password  String\n  first     String\n  last      String\n  steps     Step[]\n  selectors Selector[]\n  tags      Tag[]\n  tests     Test[]\n}",
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
[2020-02-20T22:26:26Z INFO  quaint] Starting a sqlite pool with 9 connections.
```
