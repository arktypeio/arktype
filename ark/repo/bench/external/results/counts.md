Instructions per call (median of 3 reps; gate max/min <= 1.001), Node 24.14.1, cores 10-15.

### parseSafe

|   # | arm                       | instructions |             max/min |
| --: | ------------------------- | -----------: | ------------------: |
|   1 | arktype-b1                |        188.7 | 1.0014 (fails gate) |
|   2 | arktype-b2                |        201.7 | 1.0013 (fails gate) |
|   3 | @ts-runtypes              |        209.0 | 1.0013 (fails gate) |
|   4 | typia                     |        212.9 | 1.0013 (fails gate) |
|   5 | ata-(ahead-of-time)       |        219.9 | 1.0012 (fails gate) |
|   6 | ata                       |        224.0 | 1.0012 (fails gate) |
|   7 | @sx3/gate                 |        233.4 | 1.0011 (fails gate) |
|   8 | rescript-schema           |        233.6 | 1.0023 (fails gate) |
|   9 | zod (compiled)            |        250.6 |              1.0000 |
|  10 | paseri-(ahead-of-time)    |        258.0 | 1.0021 (fails gate) |
|  11 | arktype-dynamic           |        261.6 |              1.0000 |
|  12 | sury                      |        269.6 | 1.0020 (fails gate) |
|  13 | spectypes                 |        370.0 |              1.0008 |
|  14 | pure-parse (JIT compiled) |        551.0 |              1.0005 |

### assertLoose

|   # | arm                               | instructions | max/min |
| --: | --------------------------------- | -----------: | ------: |
|   1 | arktype-b1                        |         66.0 |  1.0000 |
|   2 | arktype-b2                        |         71.0 |  1.0001 |
|   3 | ts-runtime-checks                 |         74.0 |  1.0001 |
|   4 | ts-auto-guard                     |         78.0 |  1.0000 |
|   5 | type-predicate-generator          |         79.0 |  1.0000 |
|   6 | @sinclair/typebox-(ahead-of-time) |         82.0 |  1.0001 |
|   7 | typia                             |         82.0 |  1.0001 |
|   8 | @ts-runtypes                      |         83.0 |  1.0000 |
|   9 | arktype-dynamic                   |         85.0 |  1.0001 |
|  10 | spectypes                         |         94.0 |  1.0001 |
|  11 | ata-(ahead-of-time)               |         94.0 |  1.0000 |
|  12 | ata                               |         94.0 |  1.0001 |
|  13 | paseri-(ahead-of-time)            |         97.0 |  1.0001 |
|  14 | stnl (just-in-time)               |        100.0 |  1.0000 |
|  15 | @sinclair/typebox-(just-in-time)  |        109.0 |  1.0001 |
|  16 | rescript-schema                   |        130.0 |  1.0000 |
|  17 | @sx3/gate                         |        132.0 |  1.0001 |
|  18 | @sinclair/typemap/valibot         |        141.0 |  1.0000 |
|  19 | sury                              |        166.0 |  1.0000 |
|  20 | pure-parse (JIT compiled)         |        199.0 |  1.0000 |
|  21 | ajv                               |        293.3 |  1.0009 |
|  22 | zod (compiled)                    |        473.0 |  1.0000 |

### assertStrict

|   # | arm                               | instructions |             max/min |
| --: | --------------------------------- | -----------: | ------------------: |
|   1 | ata-(ahead-of-time)               |        292.0 |              1.0000 |
|   2 | @ts-runtypes                      |        296.0 |              1.0000 |
|   3 | ata                               |        301.0 |              1.0000 |
|   4 | typia                             |        324.6 |              1.0008 |
|   5 | @sinclair/typebox-(ahead-of-time) |        331.6 |              1.0001 |
|   6 | arktype-b1                        |        332.0 |              1.0000 |
|   7 | paseri-(ahead-of-time)            |        343.0 |              1.0000 |
|   8 | arktype-dynamic                   |        348.0 |              1.0000 |
|   9 | @sinclair/typebox-(just-in-time)  |        361.6 |              1.0007 |
|  10 | @sinclair/typemap/valibot         |        390.0 |              1.0008 |
|  11 | @sx3/gate                         |        408.0 |              1.0000 |
|  12 | arktype-b2                        |        421.0 |              1.0000 |
|  13 | ts-runtime-checks                 |        425.0 |              1.0000 |
|  14 | spectypes                         |        480.7 |              1.0000 |
|  15 | rescript-schema                   |        510.0 |              1.0000 |
|  16 | sury                              |        536.0 |              1.0000 |
|  17 | ajv                               |        645.0 |              1.0004 |
|  18 | zod (compiled)                    |        746.0 |              1.0000 |
|  19 | arktype-2.2.9                     |       3947.6 | 1.1438 (fails gate) |

### parseStrict

|   # | arm                              | instructions |             max/min |
| --: | -------------------------------- | -----------: | ------------------: |
|   1 | ata-(ahead-of-time)              |        297.0 |              1.0000 |
|   2 | @ts-runtypes                     |        302.0 |              1.0000 |
|   3 | ata                              |        302.0 |              1.0000 |
|   4 | typia                            |        334.6 |              1.0008 |
|   5 | arktype-b1                       |        339.0 |              1.0000 |
|   6 | paseri-(ahead-of-time)           |        354.0 |              1.0000 |
|   7 | @sinclair/typebox-(just-in-time) |        372.6 |              1.0007 |
|   8 | arktype-dynamic                  |        391.7 |              1.0007 |
|   9 | @sx3/gate                        |        415.0 |              1.0000 |
|  10 | ts-runtime-checks                |        428.0 |              1.0000 |
|  11 | arktype-b2                       |        449.7 | 1.0012 (fails gate) |
|  12 | spectypes                        |        489.0 |              1.0005 |
|  13 | rescript-schema                  |        521.0 |              1.0000 |
|  14 | sury                             |        538.0 |              1.0000 |
|  15 | zod (compiled)                   |        610.6 |              1.0004 |
|  16 | pure-parse (JIT compiled)        |       1582.6 | 1.0599 (fails gate) |
|  17 | arktype-2.2.9                    |       4926.8 | 1.1602 (fails gate) |

### sb

|   # | arm           | instructions | max/min |
| --: | ------------- | -----------: | ------: |
|   1 | valid b1      |       6003.3 |  1.0002 |
|   2 | valid dynamic |       6004.2 |  1.0000 |
