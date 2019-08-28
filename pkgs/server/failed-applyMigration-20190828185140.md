# Failed applyMigration at 2019-08-28T22:51:40.105Z
## RPC Input One Line
```json
{"id":1,"jsonrpc":"2.0","method":"applyMigration","params":{"projectInfo":"","force":false,"migrationId":"20190828185138-init","steps":[{"stepType":"CreateModel","name":"User","embedded":false},{"stepType":"CreateModel","name":"Session","embedded":false},{"stepType":"CreateModel","name":"Step","embedded":false},{"stepType":"CreateModel","name":"Tag","embedded":false},{"stepType":"CreateModel","name":"Test","embedded":false},{"stepType":"CreateField","model":"User","name":"id","type":{"Base":"String"},"arity":"required","isUnique":true,"id":{"strategy":"Auto","sequence":null},"default":{"Expression":["cuid","String",[]]}},{"stepType":"CreateField","model":"User","name":"email","type":{"Base":"String"},"arity":"required","isUnique":true},{"stepType":"CreateField","model":"User","name":"password","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"User","name":"firstName","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"User","name":"lastName","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"User","name":"session","type":{"Relation":{"to":"Session","to_fields":[],"name":"SessionToUser","on_delete":"None"}},"arity":"optional","isUnique":false},{"stepType":"CreateField","model":"User","name":"step","type":{"Relation":{"to":"Step","to_fields":[],"name":"StepToUser","on_delete":"None"}},"arity":"optional","isUnique":false},{"stepType":"CreateField","model":"User","name":"tag","type":{"Relation":{"to":"Tag","to_fields":[],"name":"TagToUser","on_delete":"None"}},"arity":"optional","isUnique":false},{"stepType":"CreateField","model":"User","name":"test","type":{"Relation":{"to":"Test","to_fields":[],"name":"TestToUser","on_delete":"None"}},"arity":"optional","isUnique":false},{"stepType":"CreateField","model":"Session","name":"id","type":{"Base":"String"},"arity":"required","isUnique":true,"id":{"strategy":"Auto","sequence":null},"default":{"Expression":["cuid","String",[]]}},{"stepType":"CreateField","model":"Session","name":"token","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Session","name":"user","type":{"Relation":{"to":"User","to_fields":["id"],"name":"SessionToUser","on_delete":"None"}},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Step","name":"id","type":{"Base":"String"},"arity":"required","isUnique":true,"id":{"strategy":"Auto","sequence":null},"default":{"Expression":["cuid","String",[]]}},{"stepType":"CreateField","model":"Step","name":"key","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Step","name":"selector","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Step","name":"value","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Step","name":"user","type":{"Relation":{"to":"User","to_fields":["id"],"name":"StepToUser","on_delete":"None"}},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Step","name":"test","type":{"Relation":{"to":"Test","to_fields":["id"],"name":"StepToTest","on_delete":"None"}},"arity":"optional","isUnique":false},{"stepType":"CreateField","model":"Tag","name":"id","type":{"Base":"String"},"arity":"required","isUnique":true,"id":{"strategy":"Auto","sequence":null},"default":{"Expression":["cuid","String",[]]}},{"stepType":"CreateField","model":"Tag","name":"name","type":{"Base":"String"},"arity":"required","isUnique":true},{"stepType":"CreateField","model":"Tag","name":"user","type":{"Relation":{"to":"User","to_fields":["id"],"name":"TagToUser","on_delete":"None"}},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Tag","name":"test","type":{"Relation":{"to":"Test","to_fields":["id"],"name":"TagToTest","on_delete":"None"}},"arity":"optional","isUnique":false},{"stepType":"CreateField","model":"Test","name":"id","type":{"Base":"String"},"arity":"required","isUnique":true,"id":{"strategy":"Auto","sequence":null},"default":{"Expression":["cuid","String",[]]}},{"stepType":"CreateField","model":"Test","name":"user","type":{"Relation":{"to":"User","to_fields":["id"],"name":"TestToUser","on_delete":"None"}},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Test","name":"name","type":{"Base":"String"},"arity":"required","isUnique":false},{"stepType":"CreateField","model":"Test","name":"tags","type":{"Relation":{"to":"Tag","to_fields":[],"name":"TagToTest","on_delete":"None"}},"arity":"list","isUnique":false},{"stepType":"CreateField","model":"Test","name":"steps","type":{"Relation":{"to":"Step","to_fields":[],"name":"StepToTest","on_delete":"None"}},"arity":"list","isUnique":false}],"sourceConfig":"datasource db {\n  provider = \"mysql\"\n  url      = \"file:dev.db\"\n  default  = true\n}\n\ngenerator photon {\n  provider  = \"photonjs\"\n}\n\nmodel User {\n  id String @default(cuid()) @id @unique\n  email String @unique\n  password String\n  firstName String\n  lastName String\n}\n\nmodel Session {\n  id String @default(cuid()) @id @unique\n  token String\n  user User\n}\n\nmodel Step {\n  id String @default(cuid()) @id @unique\n  key String\n  selector String\n  value String\n  user User\n}\n\nmodel Tag {\n  id String @default(cuid()) @id @unique\n  name String @unique\n  user User\n}\n\nmodel Test {\n  id String @default(cuid()) @id @unique\n  user User\n  name String\n  tags Tag[]\n  steps Step[]\n}\n\n"}}
```

## RPC Input Readable
```json
{
  "id": 1,
  "jsonrpc": "2.0",
  "method": "applyMigration",
  "params": {
    "projectInfo": "",
    "force": false,
    "migrationId": "20190828185138-init",
    "steps": [
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
        "stepType": "CreateModel",
        "name": "Step",
        "embedded": false
      },
      {
        "stepType": "CreateModel",
        "name": "Tag",
        "embedded": false
      },
      {
        "stepType": "CreateModel",
        "name": "Test",
        "embedded": false
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
          "Expression": [
            "cuid",
            "String",
            []
          ]
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
        "model": "User",
        "name": "step",
        "type": {
          "Relation": {
            "to": "Step",
            "to_fields": [],
            "name": "StepToUser",
            "on_delete": "None"
          }
        },
        "arity": "optional",
        "isUnique": false
      },
      {
        "stepType": "CreateField",
        "model": "User",
        "name": "tag",
        "type": {
          "Relation": {
            "to": "Tag",
            "to_fields": [],
            "name": "TagToUser",
            "on_delete": "None"
          }
        },
        "arity": "optional",
        "isUnique": false
      },
      {
        "stepType": "CreateField",
        "model": "User",
        "name": "test",
        "type": {
          "Relation": {
            "to": "Test",
            "to_fields": [],
            "name": "TestToUser",
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
          "Expression": [
            "cuid",
            "String",
            []
          ]
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
            "to_fields": [
              "id"
            ],
            "name": "SessionToUser",
            "on_delete": "None"
          }
        },
        "arity": "required",
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
          "Expression": [
            "cuid",
            "String",
            []
          ]
        }
      },
      {
        "stepType": "CreateField",
        "model": "Step",
        "name": "key",
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
            "to_fields": [
              "id"
            ],
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
            "to_fields": [
              "id"
            ],
            "name": "StepToTest",
            "on_delete": "None"
          }
        },
        "arity": "optional",
        "isUnique": false
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
          "Expression": [
            "cuid",
            "String",
            []
          ]
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
            "to_fields": [
              "id"
            ],
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
            "to_fields": [
              "id"
            ],
            "name": "TagToTest",
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
          "Expression": [
            "cuid",
            "String",
            []
          ]
        }
      },
      {
        "stepType": "CreateField",
        "model": "Test",
        "name": "user",
        "type": {
          "Relation": {
            "to": "User",
            "to_fields": [
              "id"
            ],
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
        "isUnique": false
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
      }
    ],
    "sourceConfig": "datasource db {\n  provider = \"mysql\"\n  url      = \"file:dev.db\"\n  default  = true\n}\n\ngenerator photon {\n  provider  = \"photonjs\"\n}\n\nmodel User {\n  id String @default(cuid()) @id @unique\n  email String @unique\n  password String\n  firstName String\n  lastName String\n}\n\nmodel Session {\n  id String @default(cuid()) @id @unique\n  token String\n  user User\n}\n\nmodel Step {\n  id String @default(cuid()) @id @unique\n  key String\n  selector String\n  value String\n  user User\n}\n\nmodel Tag {\n  id String @default(cuid()) @id @unique\n  name String @unique\n  user User\n}\n\nmodel Test {\n  id String @default(cuid()) @id @unique\n  user User\n  name String\n  tags Tag[]\n  steps Step[]\n}\n\n"
  }
}
```


## RPC Response
```
null
```

## Stack Trace
```bash
thread 'main' panicked at 'the url for mysql must start with 'mysql:'', migration-engine/connectors/sql-migration-connector/src/lib.rs:114:17
stack backtrace:
   0: std::sys::unix::backtrace::tracing::imp::unwind_backtrace
   1: std::sys_common::backtrace::_print
   2: std::panicking::default_hook::{{closure}}
   3: std::panicking::default_hook
   4: std::panicking::rust_panic_with_hook
   5: std::panicking::begin_panic
   6: sql_migration_connector::SqlMigrationConnector::new
   7: migration_core::connector_loader::load_connector
   8: migration_core::migration_engine::MigrationEngine::init
   9: <F as jsonrpc_core::calls::RpcMethodSimple>::call
  10: <F as jsonrpc_core::calls::RpcMethod<T>>::call
  11: <futures::future::lazy::Lazy<F,R> as futures::future::Future>::poll
  12: <futures::future::then::Then<A,B,F> as futures::future::Future>::poll
  13: <futures::future::map::Map<A,F> as futures::future::Future>::poll
  14: <futures::future::either::Either<A,B> as futures::future::Future>::poll
  15: futures::task_impl::std::set
  16: std::thread::local::LocalKey<T>::with
  17: futures::future::Future::wait
  18: jsonrpc_core::io::IoHandler<M>::handle_request_sync
  19: migration_core::rpc_api::RpcApi::handle
  20: migration_engine::main
  21: std::rt::lang_start::{{closure}}
  22: std::panicking::try::do_call
  23: __rust_maybe_catch_panic
  24: std::rt::lang_start_internal
  25: main

```
