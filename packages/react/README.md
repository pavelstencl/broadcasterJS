# React Broadcaster: Cross Window Serverless State Manager

[![npm version](https://badge.fury.io/js/@broadcaster%2Freact.svg)](https://badge.fury.io/js/@broadcaster%2Freact)

Small package for managing communication between different
[browsing contexts](https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context), like tabs, windows, iFrames, workers, etc..

This package not only preserves the state of each instance but also shares the current states with remote counterparts.
Under the hood, it utilizes the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API),
yet it can be effortlessly replaced with any alternative communication strategy.

## Key Features

 * 🚌 **BUS between browsing contexts**  
 Allows to share a state and messages between different browsing contexts.
 * **Serverless**  
 By default, the Broadcaster employs the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
 as its primary bridge interface. This API enables fundamental communication between different browsing contexts such
 as windows and tabs, eliminating the necessity for a server.
 * 📝 **Context aware**  
Each instance of the Broadcaster maintains awareness of other instances throughout their lifecycle.
It retains essential information and state, making this data accessible to every Broadcaster instance
subscribed to the same channel.
 * 💪 **Accessible on most modern browsers and Node.JS** 
 In 2023 all main browsers supports BroadcastChannel API (Most recently Safari v 15.4) -
 [see caniuse](https://caniuse.com/?search=BroadcastChannel)
 * ⚙️⚙️⚙️ **Modular**  
Given Broadcaster's significant dependence on the BroadcastChannel API, users have the flexibility
to alter the communication protocol by simply replacing the Bridge instance.


## Quick-start

### Installation

#### NPM
```npm i --save @broadcaster/react```

#### Yarn
```yarn add @broadcaster/react```

### Creating Broadcaster Hooks

```ts
import { createBroadcaster } from "@broadcaster/react";

// Custom Broadcaster message shape
export type BroadcasterMessage = {
    message: string;
};

// Custom Broadcaster state shape
export type BroadcasterState = {
    iteration: number;
    currentTime: number;
};

/**
 * It is recommended to have only one Broadcaster instance per system per
 * channel. Create Broadcaster instance in a root of you App.
 */
export const { useBroadcaster } = createBroadcaster<BroadcasterMessage, BroadcasterState>({
    // All broadcaster with same channel name will be able to communicate.
    channel: "YOUR_CHANNEL_NAME",
    defaultState: {
        iteration: 0,
        currentTime: Date.now();
    },
    // For more settings check Broadcaster Constructor Settings section down below
});
```

### Sending and Receiving a Message

```tsx
// from previous example
import { useBroadcaster } from "path/to/hook";
import React, { FunctionComponent, useState, useEffect, useCallback } from "react";

const MessageExample: FunctionComponent = () => {
    // store all messages
    const [messages, setMessage] = useState<(ReturnType<typeof useBroadcaster>["message"])[]>([]);

    // useBroadcaster hooks returns latest message only
    const { message: latestMessage, postMessage } = useBroadcaster();

    // add message to a list
    useEffect(() => {
        setMessage((currentMessages) => ([...currentMessages, latestMessage]));
    }, [latestMessage]);

    // send a message
    const send: FormEventHandler = useCallback((event)=>{
        event.preventDefault();
        const input = e.target[0];

        postMessage({
            message: input.value,
        });

        e.target[0].value = "";
    }, []);

    return <div className="message-wrapper">
        <div className="messages">
            { messages.map(({from, payload: { message }}, i) => (
                <div className="message" key={message + from}>
                    <span>Owner: {from}</span>
                    <br />
                    <p>{message}</p>
                </div>
            )) }
        </div>
        <form className="post-message" onSubmit={send}>
            <input type="text" />
            <button type="submit">Send</button>
        </form>
    </div>
};
```

### Broadcaster State Management

Each Broadcaster has it's inner state, which will be shared with other instances. Each Broadcaster instance
has list of all Broadcasters state from all instances. It means, that **Broadcaster environment does not
share one state!** For those purposes it is possible to utilize action based state manager (like Redux) and pass
actions as Broadcaster messages.

```tsx
// from Create Broadcaster Hooks
import { useBroadcaster } from "path/to/hook";
import React, { FunctionComponent, useEffect } from "react";

const StateExample: FunctionComponent = () => {
    const { state: broadcastersStatesList, setState } = useBroadcaster();

    // each second update broadcasters state
    useEffect(() => {
        const timer = setInterval(() => {
            setState((currentState) => ({
                iteration: currentState.iteration,
                currentTime: Date.now(),
            }));
        }, 1000);
    }, []);

    return <div className="broadcaster-instances-info-wrapper">
        <div className="broadcaster-instances-info">
            {/** Iterate through all broadcaster states*/}
            { broadcastersStatesList.map(({id, connectedAt, state: { iteration, currentTime }}) => (
                <div className="broadcaster-instance" key={id}>
                    <h2>Broadcaster {id}</h2>
                    <ul>
                        <li>Connection Time: {connectedAt}</li>
                        <li>State Change Counter: {iteration}</li>
                        <li>Last State Change Time: {currentTime}</li>
                    </ul>
                </div>
            )) }
        </div>
    </div>
};
```

## Broadcaster Settings

Settings in createBroadcaster method are the same as for Broadcaster instance. All Broadcaster settings are listed [here](https://github.com/pavelstencl/broadcasterJS/tree/main/packages/core#broadcaster-constructor-settings).
