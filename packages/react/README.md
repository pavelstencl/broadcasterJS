# React Broadcaster: Cross Window Serverless Messaging System

[![npm version](https://badge.fury.io/js/@broadcaster%2Fcore.svg)](https://badge.fury.io/js/@broadcaster%2Fcore)

Small, package for managing communication between different
[browsing contexts](https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context), like tabs, windows, iFrames, workers, etc..
It adds extra layer over BroadcastChannel with unified error management and context awareness. This is an extension of
[@broadcaster/core](https://github.com/pavelstencl/broadcasterJS/tree/main/packages/core) package.

This package not only sends messages to different browser windows or tabs, but it keeps track about all Broadcaster instances across
browsing context. In every moment you can see current instance state of any Broadcaster. You can also enhance state with your own metadata.
Under the hood, it utilizes the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API),
yet it can be easily replaced with any alternative communication strategy.

## Key Features

 * 🚌 **BUS between browsing contexts**  
 Allows to send messages between different browsing contexts and sync Broadcaster instances state.
 * **Serverless**  
 By default, the Broadcaster employs the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
 as its primary bridge interface. This API enables fundamental communication between different browsing contexts such
 as windows and tabs, eliminating the necessity for a server.
 * 📝 **Context aware**  
 Each instance of the Broadcaster maintains awareness of other instances throughout their lifecycle.
 It retains essential information and metadata, making this data accessible to every Broadcaster instance
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
```npm i --save @broadcaster/core @broadcaster/react```

#### Yarn
```yarn add @broadcaster/core @broadcaster/react```

### Creating Broadcaster Hooks

```ts
import { createBroadcaster } from "@broadcaster/react";

// Custom Broadcaster message shape
export type Message = {
    message: string;
};

// Custom Broadcaster state shape
export type Metadata = {
    iteration: number;
    currentTime: number;
};

/**
 * It is recommended to have only one Broadcaster instance per system per
 * channel. Create Broadcaster instance in a root of you App.
 */
export const { useBroadcaster } = createBroadcaster<Message, Metadata>({
    // All broadcaster with same channel name will be able to communicate.
    channel: "YOUR_CHANNEL_NAME",
    metadata: {
        iteration: 0,
        currentTime: Date.now();
    },
    // For more settings check Broadcaster Constructor Settings section down below
});
```

### Sending and Receiving a Message

```tsx
// from previous example
import { BroadcasterMessage } from "@broadcaster/core";
import { useBroadcaster, Message } from "path/to/hook";
import React, { FunctionComponent, useState, useEffect, useCallback } from "react";

const MessageExample: FunctionComponent = () => {
    // store all messages
    const [messages, setMessage] = useState<BroadcasterMessage<Message>[]>([]);

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
            {/** Payload is wrapped in message object, which has some metadata about message owner*/}
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

### Getting Broadcaster Instance State and Update Metadata

Each Broadcaster instance has it's inner state, which will be shared with other instances. Each Broadcaster instance
keeps synced list of all broadcaster instances with their current state and metadata.

```tsx
// from Create Broadcaster Hooks
import { useBroadcaster } from "path/to/hook";
import React, { FunctionComponent, useEffect } from "react";

const StateExample: FunctionComponent = () => {
    const { broadcasters, updateMetadata } = useBroadcaster();

    // each second update broadcasters metadata
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
            { broadcasters.map(({id, createdAt, metadata: { iteration, currentTime }}) => (
                <div className="broadcaster-instance" key={id}>
                    <h2>Broadcaster {id}</h2>
                    <ul>
                        <li>Connection Time: {createdAt}</li>
                        <li>State Change Counter: {iteration}</li>
                        <li>Last State Change Time: {currentTime}</li>
                    </ul>
                </div>
            )) }
        </div>
    </div>
};
```

## More Information

More information about Broadcasters and its architecture can be found [here](https://github.com/pavelstencl/broadcasterJS/tree/main/packages/core).
