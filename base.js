/*
create sperate databse for two machine
fix led blink overlapping
*/

const { createMachine, interpret, assign, actions } = require('xstate');
const { send } = actions;
const WebSocket = require('ws');
const path = require('path');
const { v4: randomUUID } = require('uuid');

const gpio = require('./lib/gpio.js');
const config = require('./config.json');
const { createValidator } = require('./lib/validator');
const { createRPCError } = require('./lib/util');

const CardReader = require('./lib/tap.js');
const cardReader = new CardReader();

const Database = require('./lib/db');
const db = new Database('my_db');

const { DisplayManager, mcu, netDMGRight } = require('./lib/display.js');
const display = new DisplayManager();

// Define the 1st state machine
function createL2StateMachine(initialState = "F", auth = false) {
    return createMachine({
        id: 'machine1',
        initial: initialState,
        context: {
            initialState: initialState,
            auth: auth,
        },
        states: {
            F: {
                entry: () => {
                    display.pageChange('L', 9); // Error Display
                },
                on: {
                    UPDATEL2: [
                        {
                            actions: [
                                () => {
                                    mcu.writeMCUL2Data("IDLE", '');
                                }
                            ],
                            cond: (context, event) => event.activityState.ConnectorState === '0' && event.state === 'F'
                        },
                        {
                            target: 'A1',
                            cond: (context, event) => event.state === 'A1'
                        },
                    ],
                }
            },

            A1: {
                initial: 'idle',
                on: {
                    UPDATEL2: [
                        {
                            target: "B1",
                            actions: [
                                (context, event) => {
                                    if (context.auth == true) mcu.writeMCUL2Data("PRE_START")
                                }
                            ],
                            cond: (context, event) => event.state === 'B1'
                        },
                        {
                            target: "B2",
                            cond: (context, event) => event.state === 'B2'
                        },
                        {
                            target: 'F',
                            cond: (context, event) => event.state === 'F'
                        },
                    ],
                    TAP: {
                        target: '.checking',
                    },
                    START: {
                        target: '.checked',
                    },
                    FAIL: {
                        target: '.failed',
                    },
                },
                states: {
                    idle: {
                        entry: [
                            (context, event) => {
                                service1Main.send({ type: 'STOP' }),
                                    display.pageChange('L', 0), // Last Trans Display
                                    led1.OffLED(),
                                    mcu.writeMCUL2Data("IDLE")
                            },
                            assign({
                                auth: false
                            })
                        ]
                    },
                    checking: {
                        entry: (context, event) => [
                            display.pageChange('L', 1), // Loading Display
                            mcu.writeMCUL2Data("IDLE")
                        ],
                    },
                    checked: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 2); // Select Port Display
                                mcu.writeMCUL2Data("IDLE");
                                led1.startBlink();
                            },
                            assign({
                                auth: true
                            })
                        ],
                        on: {
                            BTNL2: {
                                target: 'plug',
                            },
                        },
                        after: {
                            10000: 'idle'
                        }
                    },
                    plug: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 3) // Plug Display
                            },
                        ],
                        after: {
                            30000: 'idle'
                        }
                    },
                    failed: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 8), // Failed Display
                                    mcu.writeMCUL2Data("IDLE")
                            },
                        ],
                        after: {
                            3000: 'idle'  // Transition to 'idle' state after 3 seconds
                        }
                    },
                }
            },

            A2: {
                on: {
                    UPDATEL2: [
                        {
                            target: "A1",
                            actions: () => mcu.writeMCUL2Data("IDLE"),
                            cond: (context, event) => event.state === 'A1'
                        },
                        {
                            target: "B2",
                            cond: (context, event) => event.state === 'B2'
                        },
                        {
                            target: 'F',
                            cond: (context, event) => event.state === 'F'
                        },
                    ]
                },
            },

            B1: {
                initial: 'idle',
                on: {
                    UPDATEL2: [
                        {
                            target: "A1",
                            actions: () => mcu.writeMCUL2Data("IDLE"),
                            cond: (context, event) => event.state === 'A1'
                        },
                        {
                            target: "B2",
                            cond: (context, event) => event.state === 'B2'
                        },
                        {
                            target: 'F',
                            cond: (context, event) => event.state === 'F'
                        },
                    ],
                    TAP: {
                        target: '.checking',
                    },
                    START: {
                        target: '.checked',
                    },
                    FAIL: {
                        target: '.failed',
                    },
                },
                states: {
                    idle: {

                    },
                    checking: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 1), // Loading Display
                                mcu.writeMCUL2Data("IDLE")
                            },
                        ],
                    },
                    checked: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 2); // Select Port Display
                                mcu.writeMCUL2Data("IDLE");
                                led1.startBlink();
                            },
                            assign({
                                auth: true
                            })
                        ],
                        on: {
                            BTNL2: {
                                target: 'plug',
                            },
                        },
                        after: {
                            10000: 'idle'
                        }
                    },
                    plug: {
                        entry: [
                            (context, event) => {
                                mcu.writeMCUL2Data("PRE_START")
                            },
                        ],
                    },
                    failed: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 8), // Failed Display
                                    mcu.writeMCUL2Data("IDLE")
                            },
                            assign({
                                auth: false
                            })
                        ],
                        after: {
                            3000: 'dis'  // Transition to 'idle' state after 3 seconds
                        }
                    },
                    dis: {
                        entry: (context, event) => [
                            service1Main.send({ type: 'STOP' }),
                            display.pageChange('L', 1), // Last Trans Display
                            mcu.writeMCUL2Data("IDLE")
                        ],
                    }
                }
            },

            B2: {
                initial: 'idle',
                on: {
                    UPDATEL2: [
                        {
                            target: "A2",
                            cond: (context, event) => event.state === 'A2'
                        },
                        {
                            target: "B1",
                            cond: (context, event) => event.state === 'B1'
                        },
                        {
                            target: "C2",
                            cond: (context, event) => event.state === 'C2'
                        },
                        {
                            target: 'F',
                            cond: (context, event) => event.state === 'F'
                        },
                        {
                            actions: [
                                () => {
                                    mcu.writeMCUL2Data("STRAT", '');
                                }
                            ],
                            cond: (context, event) => event.netRequest === 'Start'
                        },
                    ]
                },
                states: {
                    idle: {
                        entry: [
                            (context, event) => {
                                display.pageChange('L', 4) // Charging Display
                            },
                        ],
                    },
                }
            },

            C1: {
                on: {
                    UPDATEL2: [
                        {
                            target: "A1",
                            actions: () => mcu.writeMCUL2Data("IDLE"),
                            cond: (context, event) => event.state === 'A1'
                        },
                        {
                            target: "B1",
                            cond: (context, event) => event.state === 'B1'
                        },
                        {
                            target: "C2",
                            actions: [
                                () => {
                                    display.pageChange('L', 4); // Charging Display
                                    mcu.writeMCUData("PRE_START");
                                }
                            ],
                            cond: (context, event) => event.state === 'C2'
                        },
                        {
                            target: 'F',
                            cond: (context, event) => event.state === 'F'
                        },
                    ]
                },
            },

            C2: {
                initial: 'idle',
                on: {
                    UPDATEL2: [
                        {
                            target: "A1",
                            actions: () => mcu.writeMCUL2Data("IDLE"),
                            cond: (context, event) => event.state === 'A1'
                        },
                        {
                            target: "A2",
                            cond: (context, event) => event.state === 'A2'
                        },
                        {
                            target: "B2",
                            actions: [
                                () => {
                                    mcu.writeMCUL2Data("PRE_START");
                                }
                            ],
                            cond: (context, event) => event.state === 'B2'
                        },
                        {
                            target: "C1",
                            cond: (context, event) => event.state === 'C1'
                        },
                        {
                            target: 'F',
                            cond: (context, event) => event.state === 'F'
                        },
                        {
                            actions: [
                                () => {
                                    mcu.writeMCUL2Data("STRAT", '');
                                }
                            ],
                            cond: (context, event) => event.netRequest === 'Start'
                        },
                    ],
                    BTNL2: {
                        actions: [
                            (context, event) => {
                                mcu.writeMCUL2Data("STOP");
                                display.pageChange('L', 5); // Full Display
                                service1Main.send({ type: 'STOP' });
                                led1.OffLED();
                            },
                            assign({
                                auth: false
                            })
                        ]
                    },
                },
                states: {
                    idle: {
                        entry: (context, event) => [
                            led1.stopBlink()
                        ],
                    },
                }
            }

        },
        on: {
            ERROR: {
                target: "F",
                actions: [
                    (context, event) => {
                        mcu.writeMCUL2Data("STOP");
                        service1Main.send({ type: 'STOP' });
                        led1.OffLED();
                    },
                    assign({
                        auth: false
                    })
                ],
            },
        },
    });
};

// Define the 2nd state machine
function createGBTStateMachine(initialState = "F", auth = false) {
    return createMachine({
        id: 'machine1',
        initial: initialState,
        context: {
            initialState: initialState,
            auth: auth,
        },
        states: {

            F: {
                entry: () => {
                    display.pageChange('R', 0); // Last charge Display
                },
            },

            // F: {
            //   entry: () => {
            //     display.pageChange('R', 9); // Error Display
            //   },
            //   on: {
            //     UPDATEFC: [
            //       {
            //         actions: [
            //           () => {
            //             mcu.writeMCUFCData("IDLE", '');
            //           }
            //         ],
            //         cond: (context, event) => event.activityState.ConnectorState === '0' && event.state === 'F'
            //       },
            //       {
            //         target: 'A1',
            //         cond: (context, event) => event.state === 'A1'
            //       },
            //     ],
            //   }
            // },

            // A1: {
            //   initial: 'idle',
            //   on: {
            //     UPDATEFC: [
            //       {
            //         target: "B1",
            //         actions: [
            //           (context, event) => {
            //             if(context.auth == true) mcu.writeMCUFCData("PRE_START")
            //           }
            //         ],
            //         cond: (context, event) => event.state === 'B1'
            //       },
            //       {
            //         target: "B2",
            //         cond: (context, event) => event.state === 'B2'
            //       },
            //       {
            //         target: 'F',
            //         cond: (context, event) => event.state === 'F'
            //       },
            //     ],
            //     TAP: {
            //       target: '.checking',
            //     },
            //     START: {
            //       target: '.checked',
            //     },
            //     FAIL: {
            //       target: '.failed',
            //     },
            //   },
            //   states: {
            //     idle: {
            //       entry: [
            //         (context, event) => {
            //           service2Main.send({ type: 'STOP'}),
            //           display.pageChange('R', 0), // Last Trans Display
            //           led1.OffLED(),
            //           led2.OffLED(),
            //           led3.OffLED(),
            //           led4.OffLED(),
            //           mcu.writeMCUFCData("IDLE")
            //         },
            //         assign({
            //             auth: false
            //         })
            //       ]
            //     },
            //     checking: {
            //       entry: (context, event) => [
            //         display.pageChange('R', 1), // Loading Display
            //         mcu.writeMCUFCData("IDLE")
            //       ],
            //     },
            //     checked: {
            //       entry: [
            //         (context, event) => {
            //             display.pageChange('R', 2); // Select Port Display
            //             mcu.writeMCUFCData("IDLE");
            //             led4.startBlink();
            //         },
            //         assign({
            //             auth: true
            //         })
            //       ],
            //       on: {
            //         BTNFC4: {
            //             target: 'mode',
            //         },
            //       },
            //       after: {
            //         10000: 'idle'
            //       }
            //     },
            //     mode: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 3), // Mode select Display
            //           led1.startBlink(),
            //           led2.startBlink(),
            //           led3.startBlink(),
            //           led4.startBlink()
            //         },
            //       ],
            //       after: {
            //         30000: 'idle'
            //       },
            //       on: {
            //         BTNFC1: { target: 'plug' },
            //         BTNFC2: { target: 'plug' },
            //         BTNFC3: { target: 'plug' },
            //         BTNFC4: { target: 'plug' },
            //       },
            //     },
            //     plug: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 4) // Plug Display
            //         },
            //       ],
            //       after: {
            //         30000: 'idle'
            //       }
            //     },
            //     failed: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 8), // Failed Display
            //           mcu.writeMCUFCData("IDLE")
            //         },
            //       ],
            //       after: {
            //         3000: 'idle'  // Transition to 'idle' state after 3 seconds
            //       }
            //     },
            //   }
            // },

            // A2: {
            //   on: {
            //     UPDATEFC: [
            //       {
            //         target: "A1",
            //         actions: () => mcu.writeMCUFCData("IDLE"),
            //         cond: (context, event) => event.state === 'A1'
            //       },
            //       {
            //         target: "B2",
            //         cond: (context, event) => event.state === 'B2'
            //       },
            //       {
            //         target: 'F',
            //         cond: (context, event) => event.state === 'F'
            //       },
            //     ]
            //   },
            // },

            // B1: {
            //   initial: 'idle',
            //   on: {
            //     UPDATEFC: [
            //       {
            //         target: "A1",
            //         actions: () => mcu.writeMCUFCData("IDLE"),
            //         cond: (context, event) => event.state === 'A1'
            //       },
            //       {
            //         target: "B2",
            //         cond: (context, event) => event.state === 'B2'
            //       },
            //       {
            //         target: 'F',
            //         cond: (context, event) => event.state === 'F'
            //       },
            //     ],
            //     TAP: {
            //       target: '.checking',
            //     },
            //     START: {
            //       target: '.checked',
            //     },
            //     FAIL: {
            //       target: '.failed',
            //     },
            //   },
            //   states: {
            //     idle: {

            //     },
            //     checking: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 1), // Loading Display
            //           mcu.writeMCUFCData("IDLE")
            //         },
            //       ],
            //     },
            //     checked: {
            //       entry: [
            //         (context, event) => {
            //             display.pageChange('R', 2); // Select Port Display
            //             mcu.writeMCUFCData("IDLE");
            //             led4.startBlink();
            //         },
            //         assign({
            //             auth: true
            //         })
            //       ],
            //       on: {
            //         BTNFC4: {
            //             target: 'mode',
            //         },
            //       },
            //       after: {
            //         10000: 'idle'
            //       }
            //     },
            //     mode: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 3), // Mode select Display
            //           led1.startBlink(),
            //           led2.startBlink(),
            //           led3.startBlink(),
            //           led4.startBlink()
            //         },
            //       ],
            //       after: {
            //         30000: 'idle'
            //       },
            //       on: {
            //         BTNFC1: { target: 'plug' },
            //         BTNFC2: { target: 'plug' },
            //         BTNFC3: { target: 'plug' },
            //         BTNFC4: { target: 'plug' },
            //       },
            //     },
            //     plug: {
            //       entry: [
            //         (context, event) => {
            //           mcu.writeMCUFCData("PRE_START")
            //         },
            //       ],
            //     },
            //     failed: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 8), // Failed Display
            //           mcu.writeMCUFCData("IDLE")
            //         },
            //         assign({
            //             auth: false
            //         })
            //       ],
            //       after: {
            //         3000: 'dis'  // Transition to 'idle' state after 3 seconds
            //       }
            //     },
            //     dis: {
            //       entry: (context, event) => [
            //         service2Main.send({ type: 'STOP'}),
            //         display.pageChange('R', 1), // Last Trans Display
            //         mcu.writeMCUFCData("IDLE")
            //       ],
            //     }
            //   }
            // },

            // B2: {
            //   initial: 'idle',
            //   on: {
            //     UPDATEFC: [
            //       {
            //         target: "A2",
            //         cond: (context, event) => event.state === 'A2'
            //       },
            //       {
            //         target: "B1",
            //         cond: (context, event) => event.state === 'B1'
            //       },
            //       {
            //         target: "C2",
            //         cond: (context, event) => event.state === 'C2'
            //       },
            //       {
            //         target: 'F',
            //         cond: (context, event) => event.state === 'F'
            //       },
            //       {
            //         actions: [
            //           () => {
            //             mcu.writeMCUFCData("STRAT", '');
            //           }
            //         ],
            //         cond: (context, event) => event.netRequest === 'Start'
            //       },
            //     ]
            //   },
            //   states: {
            //     idle: {
            //       entry: [
            //         (context, event) => {
            //           display.pageChange('R', 5) // Charging Display
            //         },
            //       ],
            //     },
            //   }
            // },

            // C1: {
            //   on: {
            //     UPDATEFC: [
            //       {
            //         target: "A1",
            //         actions: () => mcu.writeMCUFCData("IDLE"),
            //         cond: (context, event) => event.state === 'A1'
            //       },
            //       {
            //         target: "B1",
            //         actions: () => display.pageChange('R', 5),
            //         cond: (context, event) => event.state === 'B1'
            //       },
            //       {
            //         target: "C2",
            //         actions: [
            //           () => {
            //             display.pageChange('R', 5); // Charging Display
            //             mcu.writeMCUFCData("PRE_START");
            //           }
            //         ],
            //         cond: (context, event) => event.state === 'C2'
            //       },
            //       {
            //         target: 'F',
            //         cond: (context, event) => event.state === 'F'
            //       },
            //     ]
            //   },
            // },

            // C2: {
            //   initial: 'idle',
            //   on: {
            //     UPDATEFC: [
            //       {
            //         target: "A1",
            //         actions: () => mcu.writeMCUFCData("IDLE"),
            //         cond: (context, event) => event.state === 'A1'
            //       },
            //       {
            //         target: "A2",
            //         cond: (context, event) => event.state === 'A2'
            //       },
            //       {
            //         target: "B2",
            //         actions: [
            //           () => {
            //             mcu.writeMCUFCData("PRE_START");
            //           }
            //         ],
            //         cond: (context, event) => event.state === 'B2'
            //       },
            //       {
            //         target: "C1",
            //         cond: (context, event) => event.state === 'C1'
            //       },
            //       {
            //         target: 'F',
            //         cond: (context, event) => event.state === 'F'
            //       },
            //       {
            //         actions: [
            //           () => {
            //             mcu.writeMCUFCData("STRAT", '');
            //           }
            //         ],
            //         cond: (context, event) => event.netRequest === 'Start'
            //       },
            //     ],
            //     BTNFC4: {
            //       actions: [
            //         (context, event) => {
            //           mcu.writeMCUFCData("STOP");
            //           display.pageChange('R', 6); // Full Display
            //           service2Main.send({ type: 'STOP'});
            //           led1.OffLED();
            //           led2.OffLED();
            //           led3.OffLED();
            //           led4.OffLED();
            //         },
            //         assign({
            //             auth: false
            //         })
            //       ]
            //     },
            //   },
            //   states: {
            //     idle: {
            //       entry: (context, event) => [
            //         led4.stopBlink()
            //       ],
            //     },
            //   }
            // }

        },
        on: {
            ERROR: {
                target: "F",
                actions: [
                    (context, event) => {
                        mcu.writeMCUFCData("STOP");
                        service2Main.send({ type: 'STOP' });
                        led1.OffLED();
                        led2.OffLED();
                        led3.OffLED();
                        led4.OffLED();
                    },
                    assign({
                        auth: false
                    })
                ],
            },
        },
    });
}

const connectToServer = (context) => new Promise((resolve, reject) => {
    const url = new URL(context.endpoint);
    if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
    };
    url.pathname = path.join(url.pathname, context.protocols[0], context.identity);
    url.username = context.identity;
    url.password = context.password;
    let handlers = {};
    function handle(method, handler) {
        handlers[method] = handler;
    };
    const socket = new WebSocket(url.toString(), context.protocols);

    handle('DataTransfer', async ({ method, params }) => {
        console.log("DataTransfer Request: ", params);
        await db.update('responseBody', { data: JSON.parse(params.data) });
        return {
            status: 'Accepted'
        };
    });

    function logErr(error, method, messageId) {
        const errorMessage = error.rpcErrorMessage;
        const errorCode = error.rpcErrorCode;
        const errorDetails = error.details;

        // console.log("Error Message:", errorMessage);
        // console.log("Error Code:", errorCode);
        // console.log("Error Details:", errorDetails);

        console.log(`OCCP ${method} Message Validation Error -
        Error Message: ${errorMessage},
        Error Code: ${errorCode},
        Error Details: ${JSON.stringify(errorDetails)}`);

        socket.send(
            JSON.stringify([
                4,
                messageId,
                errorCode,
                errorMessage,
                `{The requested method ${method} is not implemented}`,
            ])
        );
    }

    socket.on('message', async (message) => {
        const [type, messageId, ...rest] = JSON.parse(message);
        const pendingCall = context.pendingCalls.get(messageId);

        if (type === 2) {
            const [method, params] = rest;
            const handler = handlers[method];
            if (handler) {
                try {
                    await context.validator.validate(`urn:${method}.req`, params);
                    const result = await handler({ method, params });
                    console.log(`Charger Sending: ${method}`);
                    socket.send(JSON.stringify([3, messageId, result]));
                } catch (error) {
                    pendingCall.reject(new Error(`Validation Error For Type 2 ${method} Message`));
                    logErr(error, method, messageId);
                }
            } else {
                pendingCall.reject(new Error(`NotImplemented Error For ${method} Message`));
                const error = createRPCError("NotImplemented");
                logErr(error, method, messageId);
            };
        }
        else if (type === 3 || type === 4) {
            const params = rest[0];

            if (pendingCall) {
                const method = pendingCall.method;  // Get the method from the pending call
                if (type === 3) {
                    try {
                        await context.validator.validate(`urn:${method}.conf`, params);
                        pendingCall.resolve(params);
                    } catch (error) {
                        // console.log(`Validation Error For Type 3 ${method} Message`);
                        pendingCall.reject(new Error(`Validation Error For Type 3 ${method} Message`));
                        logErr(error, method, messageId);
                    }
                } else if (type === 4) {
                    try {
                        await context.validator.validate(`urn:${method}.conf`, params);
                        pendingCall.resolve(params);
                    } catch (error) {
                        // console.log(`Validation Error For Type 4 ${method} Message:`);
                        pendingCall.reject(new Error(`Validation Error For Type 4 ${method} Message`));
                        logErr(error, method, messageId);
                    }
                }
                context.pendingCalls.delete(messageId);
            }
        }
    });

    socket.on('open', () => resolve(socket));
    socket.on('error', (error) => {
        reject(new Error(`Connection Error: ${error.message}`));
    });
    socket.on('close', () => {
        reject(new Error("Socket was closed"));
    });
});

const reconnectToServer = (context, event) => new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
        try {
            const socket = await connectToServer(context);

            context.socket = socket;
            clearInterval(interval);
            resolve(socket);
        } catch (error) {
            console.log(`Reconnection failed: ${error.message}`);
        }
    }, context.retryInterval);
});

const deferred = () => {
    let resolve, reject;
    let promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { resolve, reject, promise };
};

// Define the 3rd state machine
function createMainStateMachine(config, machineToStart, validator) {
    return createMachine({
        id: 'machine3',
        initial: 'connecting',
        context: {
            identity: config.identity,
            password: config.password,
            protocols: config.protocols,
            endpoint: config.endpoint,
            chargePointModel: config.chargePointModel,

            socket: null,
            pendingCalls: new Map(),
            retryInterval: 5000,
            machine: null,
            validator: validator,

            idTag: null,
            connectorId: 0,

            transactionId: 0,
            current: 0,
            watt: 0,
            elapsedTime: 0,
            responseBody: null,
        },
        states: {
            connecting: {
                invoke: {
                    id: 'connectToServer',
                    src: 'connectToServer',
                    onDone: {
                        target: 'connected',
                        actions: assign({
                            socket: (context, event) => event.data
                        }),
                    },
                    onError: {
                        target: 'disconnected',
                        actions: (context, event) => [
                            console.log("connecting: ", event.data.message),
                        ],
                    },
                },
            },

            disconnected: {
                after: {
                    5000: 'connecting',
                },
            },

            connected: {
                on: {
                    DISCONNECT: 'disconnected',
                },
                invoke: [
                    {
                        id: 'BootNotificationReq',
                        src: 'BootNotificationReq',
                        onDone: {
                            target: 'createMachine',
                        },
                        onError: {
                            target: 'disconnected',
                        },
                    },
                ]
            },

            createMachine: {
                invoke: {
                    id: `${machineToStart.id}`,
                    src: (context) => (callback) => {
                        const childService = interpret(machineToStart).start();
                        context.machine = childService;
                        // Immediately notify that the machine is created.
                        callback('DONE');
                    }
                },
                on: {
                    DONE: 'Heartbeat'
                }
            },

            ocppError: {
                entry: (context, event) => {
                    console.log("OCPP ERROR: ", event.data.message)
                },
            },

            Heartbeat: {
                initial: 'checking',
                states: {
                    checking: {
                        always: [
                            { target: 'connected', cond: (context) => context.socket !== null },
                            { target: 'reconnecting' },
                        ]
                    },
                    reconnecting: {
                        invoke: {
                            src: 'reconnectToServer',
                            onDone: {
                                target: 'checking',
                                actions: assign({ socket: (_, event) => event.data }),
                            },
                        },
                    },
                    connected: {
                        invoke: [
                            {
                                id: 'HeartBeatReq',
                                src: 'HeartBeatReq',
                            },
                        ],
                        on: {
                            ERREVENT: {
                                target: '#machine3.ocppError'
                            },
                            START: {
                                target: '#machine3.Authorize',
                                actions: [
                                    (context) => {
                                        context.machine.send({ type: 'TAP' });
                                    },
                                    assign({
                                        idTag: (_, event) => event.idTag,
                                        connectorId: (_, event) => event.connectorId
                                    })
                                ],
                            },
                            APPSTART: {
                                target: '#machine3.Authorize',
                                actions: assign({
                                    idTag: (_, event) => event.idTag,
                                    connectorId: (_, event) => event.connectorId
                                })
                            },
                            DISCONNECT: {
                                target: 'checking',
                                actions: 'resetSocket',
                            }
                        },
                    },
                },
            },

            Authorize: {
                initial: 'checking',
                states: {
                    checking: {
                        always: [
                            { target: 'connected', cond: (context) => context.socket !== null },
                            { target: 'reconnecting' },
                        ]
                    },
                    reconnecting: {
                        invoke: {
                            src: 'reconnectToServer',
                            onDone: {
                                target: 'checking',
                                actions: assign({ socket: (_, event) => event.data }),
                            },
                        },
                    },
                    connected: {
                        invoke: {
                            id: 'AuthorizeReq',
                            src: 'AuthorizeReq',
                            onDone: [
                                {
                                    target: '#machine3.StartTransaction',
                                    cond: (context, event) => event.data.idTagInfo.status === 'Accepted',
                                    // actions: logData,  // Add the log action here
                                },
                                {
                                    target: '#machine3.Heartbeat',
                                    // actions: logData,  // Add the log action here
                                    actions: [
                                        (context) => {
                                            context.machine.send({ type: 'FAIL' });
                                        }
                                    ]
                                },
                            ],
                            onError: {
                                target: '#machine3.ocppError',
                            },
                        },
                        on: {
                            DISCONNECT: {
                                target: 'checking',
                                actions: 'resetSocket',
                            }
                        },
                    },
                },
            },

            StartTransaction: {
                initial: 'checking',
                states: {
                    checking: {
                        always: [
                            { target: 'connected', cond: (context) => context.socket !== null },
                            { target: 'reconnecting' },
                        ]
                    },
                    reconnecting: {
                        invoke: {
                            src: 'reconnectToServer',
                            onDone: {
                                target: 'checking',
                                actions: assign({ socket: (_, event) => event.data }),
                            },
                        },
                    },
                    connected: {
                        invoke: {
                            id: 'StartTransactionReq',
                            src: 'StartTransactionReq',
                            onDone: [
                                {
                                    target: '#machine3.MeterValues',
                                    actions: [
                                        assign({
                                            transactionId: (context, event) => event.data.transactionId
                                        }),
                                        async (context, event) => {
                                            context.machine.send({ type: 'START' });
                                            await db.update('transactionId', { data: event.data.transactionId });
                                        },
                                    ],
                                    cond: (context, event) => event.data.idTagInfo.status === 'Accepted'
                                },
                                {
                                    target: '#machine3.Heartbeat',
                                    actions: [
                                        assign({
                                            transactionId: () => 0,
                                        }),
                                        async (context, event) => {
                                            context.machine.send({ type: 'FAIL' });
                                            await db.update('transactionId', { data: 0 });
                                        },
                                    ],
                                },
                            ],
                            onError: {
                                target: '#machine3.ocppError',
                            },
                        },
                        on: {
                            DISCONNECT: {
                                target: 'checking',
                                actions: 'resetSocket'
                            }
                        },
                    },
                },
            },

            MeterValues: {
                initial: 'checking',
                states: {
                    checking: {
                        always: [
                            { target: 'connected', cond: (context) => context.socket !== null },
                            { target: 'reconnecting' },
                        ]
                    },
                    reconnecting: {
                        invoke: [
                            {
                                id: 'MeterValuesReq',
                                src: 'MeterValuesReq',
                            },
                            {
                                src: 'reconnectToServer',
                                onDone: {
                                    target: 'checking',
                                    actions: assign({ socket: (_, event) => event.data }),
                                },
                            },
                        ],
                        on: {
                            STOP: {
                                target: '#machine3.DataTransfer',
                            },
                            APPSTOP: {
                                target: '#machine3.DataTransfer',
                            },
                            CALWATT: {
                                actions: [
                                    assign({
                                        current: (context, event) => event.current,
                                        watt: (context, event) => context.watt + event.watt,
                                    }),
                                    async (context, event) => {
                                        await db.update('watt', { data: context.watt });
                                    },
                                ]
                            }
                        },
                    },
                    connected: {
                        invoke: [
                            {
                                id: 'MeterValuesReq',
                                src: 'MeterValuesReq',
                            },
                        ],
                        on: {
                            DISCONNECT: {
                                target: 'checking',
                                actions: 'resetSocket',
                            },
                            STOP: {
                                target: '#machine3.DataTransfer',
                            },
                            APPSTOP: {
                                target: '#machine3.DataTransfer',
                            },
                            CALWATT: {
                                actions: [
                                    assign({
                                        current: (context, event) => event.current,
                                        watt: (context, event) => event.watt,
                                    }),
                                    async (context, event) => {
                                        await db.update('watt', { data: context.watt });
                                    },
                                ]
                            }
                        },
                    },
                },
            },

            DataTransfer: {
                initial: 'checking',
                states: {
                    checking: {
                        always: [
                            { target: 'connected', cond: (context) => context.socket !== null },
                            { target: 'reconnecting' },
                        ]
                    },
                    // Stay in reconnecting state untill connection established
                    reconnecting: {
                        invoke: {
                            src: 'reconnectToServer',
                            onDone: {
                                target: 'checking',
                                actions: [
                                    assign({ socket: (_, event) => event.data }),
                                ],
                            },
                        },
                    },
                    connected: {
                        invoke: [
                            {
                                id: 'DataTransferReq',
                                src: 'DataTransferReq',
                                onDone: {
                                    target: '#machine3.StopTransaction'
                                },
                                onError: {
                                    target: '#machine3.ocppError',
                                },
                            },
                        ],
                        on: {
                            DISCONNECT: {
                                target: 'checking',
                                actions: 'resetSocket',
                            }
                        },
                    },
                },
            },

            StopTransaction: {
                initial: 'checking',
                states: {
                    checking: {
                        always: [
                            { target: 'connected', cond: (context) => context.socket !== null },
                            { target: 'reconnecting' },
                        ]
                    },
                    // Stay in reconnecting state untill connection established
                    reconnecting: {
                        invoke: {
                            src: 'reconnectToServer',
                            onDone: {
                                target: 'checking',
                                actions: assign({ socket: (_, event) => event.data }),
                            },
                        },
                    },
                    connected: {
                        invoke: [
                            {
                                id: 'StopTransactionReq',
                                src: 'StopTransactionReq',
                                onDone: {
                                    target: '#machine3.Heartbeat',
                                    actions: [
                                        assign({
                                            transactionId: () => 0,
                                            elapsedTime: () => 0,
                                            watt: () => 0,
                                            responseBody: () => null,
                                        }),
                                        async (context, event) => {
                                            await db.update('transactionId', { data: 0 });
                                            await db.update('elapsedTime', { data: 0 });
                                            await db.update('watt', { data: 0 });
                                            await db.update('responseBody', { data: null });
                                        },
                                    ],
                                },
                                onError: {
                                    target: '#machine3.ocppError',
                                },
                            },
                        ],
                        on: {
                            DISCONNECT: {
                                target: 'checking',
                                actions: 'resetSocket',
                            }
                        },
                    },
                },
            },
        },

        on: {
            INCREMENT_TIME: {
                actions: [
                    assign({
                        elapsedTime: (context) => context.elapsedTime + 1
                    }),
                    send((context) => ({
                        type: 'UPDATED_WATT',
                        watt: context.watt
                    }), { to: 'MeterValuesReq' }),
                    async (context) => {
                        // await db.update('elapsedTime', { data: context.elapsedTime });

                        // only fetch responseBody when it's null
                        if (context.responseBody === null) {
                            let responseBodyDoc = await db.read('responseBody');
                            context.responseBody = responseBodyDoc.data;
                        };
                    }
                ]
            },
        },

    }, {
        actions: {
            resetSocket: assign({
                socket: (context, event) => null
            }),
        },
        services: {
            connectToServer,
            reconnectToServer,
            BootNotificationReq: (context) => new Promise((resolve, reject) => {
                const messageId = randomUUID();
                const method = 'BootNotification';

                context.pendingCalls.set(messageId, { resolve, reject, method });

                console.log('Sending BootNotificationReq');
                context.socket.send(JSON.stringify([2, messageId, method, {
                    chargePointModel: context.chargePointModel,
                    chargePointVendor: context.identity,
                }]));
            }),
            HeartBeatReq: (context, event) => (callback, onReceive) => {
                const interval = setInterval(() => {
                    const messageId = randomUUID();
                    const deferredPromise = deferred();
                    const method = 'Heartbeat';
                    context.pendingCalls.set(messageId, { ...deferredPromise, method });

                    console.log('Sending HeartbeatReq');
                    context.socket.send(JSON.stringify([2, messageId, method, {}]));

                    deferredPromise.promise
                        .then((result) => {
                            console.log('Heartbeat successful, result:', result);
                        })
                        .catch((error) => {
                            console.error('Heartbeat failed:', error.message);
                            callback({ type: 'ERREVENT', data: error });
                        });
                    // ocppEventEmitter.emit('requestSent');
                }, 5000);
                return () => clearInterval(interval); // Cleanup function
            },
            AuthorizeReq: (context) => new Promise((resolve, reject) => {
                const messageId = randomUUID();
                const method = 'Authorize';
                context.pendingCalls.set(messageId, { resolve, reject, method });

                console.log('Sending AuthorizeReq');
                context.socket.send(JSON.stringify([2, messageId, method, {
                    idTag: context.idTag,
                }]));
                // ocppEventEmitter.emit('requestSent');
            }),
            StartTransactionReq: (context, event) => new Promise((resolve, reject) => {
                const messageId = randomUUID();
                const method = 'StartTransaction';
                context.pendingCalls.set(messageId, { resolve, reject, method });

                console.log('Sending StartTransactionReq');
                context.socket.send(JSON.stringify([2, messageId, method, {
                    connectorId: context.connectorId,
                    idTag: context.idTag,
                    meterStart: 0,
                    timestamp: new Date().toISOString(),
                }]));
                // ocppEventEmitter.emit('requestSent');
            }),
            MeterValuesReq: (context, event) => (callback, onReceive) => {
                let localWatt = 0;
                onReceive((receivedEvent) => {
                    if (receivedEvent.type === 'UPDATED_WATT') {
                        localWatt = receivedEvent.watt;
                    }
                });

                const timeoutId = setInterval(() => {
                    try {
                        const messageId = randomUUID();
                        const deferredPromise = deferred();
                        const method = 'MeterValues';

                        console.log('Sending MeterValues');
                        // Store the method name along with resolve and reject in the pendingCalls
                        context.pendingCalls.set(messageId, { ...deferredPromise, method });

                        if (context.socket) {
                            context.socket.send(JSON.stringify([2, messageId, method, {
                                connectorId: context.connectorId,
                                transactionId: context.transactionId,
                                meterValue: [
                                    {
                                        timestamp: new Date().toISOString(),
                                        sampledValue: [
                                            {
                                                value: (localWatt).toFixed(2),
                                                context: "Sample.Periodic",
                                                format: "Raw",
                                                measurand: "Energy.Active.Import.Register",
                                                location: "Outlet",
                                                unit: "Wh"
                                            }
                                        ]
                                    }
                                ]
                            }]));
                        };

                        callback({ type: 'INCREMENT_TIME' });
                        deferredPromise.promise
                            .then((result) => {
                                console.log('MeterValues successful, result:', result);
                            })
                            .catch((error) => {
                                callback({ type: 'ERREVENT', error: error });
                                console.error('MeterValues failed, error:', error);
                            });
                    } catch (error) {
                        console.error('Error while checking:', error);
                    }
                    // ocppEventEmitter.emit('requestSent');
                }, 1000);

                return () => {
                    clearTimeout(timeoutId);
                };
            },
            StopTransactionReq: (context, event) => new Promise(async (resolve, reject) => {
                const messageId = randomUUID();
                const method = 'StopTransaction';
                context.pendingCalls.set(messageId, { resolve, reject, method });

                console.log('Sending StopTransactionReq');
                context.socket.send(JSON.stringify([2, messageId, method, {
                    meterStop: (context.watt),
                    timestamp: new Date().toISOString(),
                    transactionId: context.transactionId,
                }]));
                // ocppEventEmitter.emit('requestSent');
            }),
            DataTransferReq: (context, event) => new Promise(async (resolve, reject) => {
                let responseBodyDoc = await db.read('responseBody');
                let responseBody = responseBodyDoc.data;
                responseBody.elapsedTime = context.elapsedTime;
                context.responseBody = responseBody;

                const messageId = randomUUID();
                const method = 'DataTransfer';
                context.pendingCalls.set(messageId, { resolve, reject, method });

                console.log('Sending DataTransferReq');
                context.socket.send(JSON.stringify([2, messageId, method, {
                    vendorId: config.identity,
                    data: JSON.stringify(responseBody),
                }]));
                // ocppEventEmitter.emit('requestSent');

                // reject(new Error("Simulated error"));
                // return;
            }),
        }
    });
};

// const ocppstateMachine = createMainStateMachine();
// let ocppinterpreter = interpret(ocppstateMachine).start();

// // Create service interpreters for each machine
// const service1 = interpret(machine1).start();
// const service2 = interpret(machine2).start();

// let service1, service2;

function createService3(machineToStart, config) {
    // const service3 = interpret(machine3).start();

    // if (machineToStart.id === 'machine1') {
    //     service1 = interpret(machineToStart).start();

    //     service1.onTransition((state) => {
    //         if (state.matches('A1')) {
    //             service3.send({type: 'TO_P', data: "M1"});
    //         } else if (state.matches('B1')) {
    //             service3.send({type: 'TO_Q', data: "M1"});
    //         } else if (state.matches('C1')) {
    //             service3.send({type: 'TO_R', data: "M1"});
    //         }
    //     });

    // } else if (machineToStart.id === 'machine2') {
    //     service2 = interpret(machineToStart).start();

    //     service2.onTransition((state) => {
    //         if (state.matches('A2')) {
    //             service3.send({type: 'TO_P', data: "M2"});
    //         } else if (state.matches('B2')) {
    //             service3.send({type: 'TO_Q', data: "M2"});
    //         } else if (state.matches('C2')) {
    //             service3.send({type: 'TO_R', data: "M2"});
    //         }
    //     });
    // }

    // return service3;

    let validator = null;
    if (config.protocols[0] == "v1.6") {
        validator = createValidator('ocpp1.6', require('./schemas/ocpp1_6.json'));
    } else if (config.protocols[0] == "v2.0.1") {
        validator = createValidator('ocpp2.0.1', require('./schemas/ocpp2_0_1.json'));
    }

    const machine3 = createMainStateMachine(config, machineToStart, validator);
    const service3 = interpret(machine3).start();

    // Use a promise to await the child service to be initialized
    return new Promise((resolve) => {
        service3.onTransition((state) => {
            if (state.context.machine) {
                resolve({
                    mainService: service3,
                    childService: state.context.machine
                });
            }
        });
    });

    // if (machineToStart.id === 'machine1') {
    //     // const machine3 = createMainStateMachine(config);
    //     // const service3 = interpret(machine3).start();
    //
    //     service1 = interpret(machineToStart).start();
    //
    //     service1.onTransition((state) => {
    //         if (state.matches('A1')) {
    //             service3.send({type: 'TO_P', data: "M1"});
    //         } else if (state.matches('B1')) {
    //             service3.send({type: 'TO_Q', data: "M1"});
    //         } else if (state.matches('C1')) {
    //             service3.send({type: 'TO_R', data: "M1"});
    //         }
    //     });
    // } else if (machineToStart.id === 'machine2') {
    //     // const machine3 = createMainStateMachine(config);
    //     // const service3 = interpret(machine3).start();
    //
    //     service2 = interpret(machineToStart).start();
    //
    //     service2.onTransition((state) => {
    //         if (state.matches('A2')) {
    //             service3.send({type: 'TO_P', data: "M2"});
    //         } else if (state.matches('B2')) {
    //             service3.send({type: 'TO_Q', data: "M2"});
    //         } else if (state.matches('C2')) {
    //             service3.send({type: 'TO_R', data: "M2"});
    //         }
    //     });
    // }
}

// service1 = createService3(machine1, config.M1);
// service2 = createService3(machine2, config.M2);

// // Create two instances for machine3
// const service3ForMachine1 = interpret(machine3).start();
// const service3ForMachine2 = interpret(machine3).start();

// // Listen to state changes in machine1 and send events to service3ForMachine1
// service1.onTransition((state) => {
//   if (state.matches('A1')) {
//     service3ForMachine1.send({type: 'TO_P', data: "M1"});
//   } else if (state.matches('B1')) {
//     service3ForMachine1.send({type: 'TO_Q', data: "M1"});
//   } else if (state.matches('C1')) {
//     service3ForMachine1.send({type: 'TO_R', data: "M1"});
//   }
// });

// // Listen to state changes in machine2 and send events to service3ForMachine2
// service2.onTransition((state) => {
//   if (state.matches('A2')) {
//     service3ForMachine2.send({type: 'TO_P', data: "M2"});
//   } else if (state.matches('B2')) {
//     service3ForMachine2.send({type: 'TO_Q', data: "M2"});
//   } else if (state.matches('C2')) {
//     service3ForMachine2.send({type: 'TO_R', data: "M2"});
//   }
// });

// Now, service3ForMachine1 and service3ForMachine2 will independently transition based on their associated machines.

// process.stdin.setEncoding('utf8');
// process.stdin.on('data', async (data) => {
//     let input = data.trim();
//     if (input === '1') {
//         service1.send('NEXT');
//     } else if (input === '2') {
//         service2.send('NEXT');
//     }
// });

// let service1Main, service1Child, service2Main, service2Child;
//
// Promise.all([
//     createService3(machine1, config.M1),
//     createService3(machine2, config.M2)
// ]).then(([service1, service2]) => {
//     service1Main = service1.mainService;
//     service1Child = service1.childService;
//
//     service2Main = service2.mainService;
//     service2Child = service2.childService;
//
//     // Listen to process input AFTER services have been initialized
//     process.stdin.setEncoding('utf8');
//     process.stdin.on('data', async (data) => {
//         let input = data.trim();
//         if (input === '1') {
//             service1Child.send('NEXT');
//         } else if (input === '2') {
//             service2Child.send('NEXT');
//         }
//     });
// });

let lastPressed = [0, 0, 0, 0];
const debounceTime = 200; // 200ms debounce time
async function checkGPIO(b1, b2, b3, b4) {
    let currentTime = Date.now();

    if (await b1.isOn() == 0 && currentTime - lastPressed[0] > debounceTime) {
        console.log("Button 1 is Pressed");
        service1Child.send('BTNL2');
        service2Child.send('BTNFC1');
        lastPressed[0] = currentTime;
    }
    if (await b2.isOn() == 0 && currentTime - lastPressed[1] > debounceTime) {
        console.log("Button 2 is Pressed");
        service2Child.send('BTNFC2');
        lastPressed[1] = currentTime;
    }
    if (await b3.isOn() == 0 && currentTime - lastPressed[2] > debounceTime) {
        console.log("Button 3 is Pressed");
        service2Child.send('BTNFC3');
        lastPressed[2] = currentTime;
    }
    if (await b4.isOn() == 0 && currentTime - lastPressed[3] > debounceTime) {
        console.log("Button 4 is Pressed");
        service2Child.send('BTNFC4');
        lastPressed[3] = currentTime;
    }
};

let btn1, btn2, btn3, btn4, led1, led2, led3, led4, checkGPIOInterval;
async function gpioSetup() {
    btn1 = await new gpio(4, 'in', 1);
    btn2 = await new gpio(5, 'in', 1);
    btn3 = await new gpio(8, 'in', 1);
    btn4 = await new gpio(86, 'in', 1);

    led1 = await new gpio(9, 'out', 0);
    led2 = await new gpio(11, 'out', 0);
    led3 = await new gpio(48, 'out', 0);
    led4 = await new gpio(85, 'out', 0);

    checkGPIOInterval = setInterval(() => checkGPIO(btn1, btn2, btn3, btn4), 100);

    // led1.stopBlink();
    // led2.stopBlink();
    // led3.stopBlink();
    // led4.stopBlink();

    // led1.startBlink();
    // led2.startBlink();
    // led3.startBlink();
    // led4.startBlink();
}

function handleNoL2Data() {
    if (service1Child) service1Child.send({ type: 'ERROR' })
}

function handleNoFCData() {
    if (service2Child) service2Child.send({ type: 'ERROR' })
}

let noDataL2Timeout, noDataFCTimeout;
let service1Main, service2Main, service1Child, service2Child;
async function initializeServices() {
    gpioSetup();
    await db.create('transactionId', { data: 0 });
    await db.create('elapsedTime', { data: 0 });
    await db.create('watt', { data: 0 });
    await db.create('responseBody', { data: null });

    const transactionId = await db.read('transactionId');
    const elapsedTime = await db.read('elapsedTime');
    const watt = await db.read('watt');

    let initialStateL2 = "F";
    let authL2 = false;
    const machine1 = createL2StateMachine(initialStateL2, authL2);

    let initialStateFC = "F";
    let authFC = false;
    const machine2 = createGBTStateMachine(initialStateFC, authFC);

    // const { mainService: service1Main, childService: service1Child } = await createService3(machine1, config.M1);
    // const { mainService: service2Main, childService: service2Child } = await createService3(machine2, config.M2);

    const service1Result = await createService3(machine1, config.M1);
    service1Main = service1Result.mainService;
    service1Child = service1Result.childService;

    const service2Result = await createService3(machine2, config.M2);
    service2Main = service2Result.mainService;
    service2Child = service2Result.childService;

    const service1ChildState = JSON.stringify(service1Child.state.value);
    console.log(`service1Main: ${service1ChildState}`);

    const service2ChildState = JSON.stringify(service2Child.state.value);
    console.log(`service2Main: ${service2ChildState}`);

    // process.stdin.setEncoding('utf8');
    // process.stdin.on('data', async (data) => {
    //     let input = data.trim();
    //     if (input === '1') {

    //         service1Main.send({ type: 'START', idTag: "0.1.0.255.0.21.49.0.", connectorId: 1 });
    //     } else if (input === '2') {
    //         service1Child.send('BTNL2');
    //     }
    // });

    cardReader.on('rfidData', (data) => {
        console.log('RFID Data: ', data);
        service1Main.send({ type: 'START', idTag: data, connectorId: 1 });
        // service2Main.send({ type: 'START', idTag: data, connectorId: 1});
    });

    cardReader.on('rfidError', (error) => {
        console.log('RFID Error: ', error);
    });

    // FCData {
    //   volt: '0',
    //   curr: '0',
    //   powr: '0',
    //   energy: null,
    //   state: 'A1',
    //   activityState: { ConnectorState: '0', PWMState: '0', ChargingState: '0' },
    //   netRequest: 'IDLE',
    //   powerError: '',
    //   generalError: 'Some error'
    // }
    // L2Data {
    //   volt: '2325',
    //   curr: '4',
    //   powr: '2',
    //   energy: null,
    //   state: 'A1',
    //   activityState: { ConnectorState: '0', PWMState: '0', ChargingState: '0' },
    //   netRequest: 'IDLE',
    //   powerError: '',
    //   generalError: 'Some error'
    // }

    mcu.on("L2Data", (data) => {
        console.log("L2Data", data);

        // Reset the noDataTimeout whenever data is received
        clearTimeout(noDataL2Timeout);
        noDataL2Timeout = setTimeout(handleNoL2Data, 10000); // Set timeout for 10 seconds

        if (service1Child) {
            service1Child.send({
                type: 'UPDATEL2',
                state: data.state,
                activityState: data.activityState,
                netRequest: data.netRequest,
            });
        }

        // if(service1Main){
        //   service1Main.send({
        //     type: 'CALWATT',
        //     current: Number(data.curr),
        //     watt: Number(data.powr)
        //   })
        // }

    });

    mcu.on("FCData", (data) => {
        // console.log("FCData", data);

        // Reset the noDataTimeout whenever data is received
        clearTimeout(noDataFCTimeout);
        noDataFCTimeout = setTimeout(handleNoFCData, 10000); // Set timeout for 10 seconds

        if (service2Child) {
            service2Child.send({
                type: 'UPDATEFC',
                state: data.state,
                activityState: data.activityState,
                netRequest: data.netRequest,
            });
        }

        // if(service2Main){
        //   service2Main.send({
        //     type: 'CALWATT',
        //     current: Number(data.curr),
        //     watt: Number(data.powr)
        //   })
        // }

    });

}

initializeServices();
