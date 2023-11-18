# Broadcaster: Cross Window Serverless State Manager

[![npm version](https://badge.fury.io/js/@broadcaster%2Fcore.svg)](https://badge.fury.io/js/@broadcaster%2Fcore)

Small, zero-dependency package for managing communication between different
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
```npm i --save @broadcaster/core```

#### Yarn
```yarn add @broadcaster/core```

### Creating and Destroying Broadcaster Instance

```ts
import { Broadcaster } from "@broadcaster/core";

// Custom Broadcaster message shape
export type BroadcasterMessage = {
    type: "greetings" | "goodbye";
    sentence: string;
};

// Custom Broadcaster state shape
export type BroadcasterState = {
    your: string;
    state?: boolean;
};

/**
 * It is recommended to have only one Broadcaster instance per system per
 * channel. Create Broadcaster instance in a root of you App.
 */
export const broadcaster = new Broadcaster<BroadcasterMessage, BroadcasterState>({
    // All broadcaster with same channel name will be able to communicate.
    channel: "YOUR_CHANNEL_NAME",
    defaultState: {
        your: "your",
        state: false,
    },
    on: {
        // Broadcaster doesn't handle `beforeunload event by default.
        // We want to notify other instances, that this instance is about
        // to end.
        init: (broadcasterInstance) => {
            window.addEventListener("beforeunload", destroyBroadcaster);
        },
        close: (broadcasterInstance) => {
            window.removeEventListener("beforeunload", destroyBroadcaster);
        }
    }
    // For more settings check Broadcaster Constructor Settings section down below
});

const destroyBroadcaster = (broadcasterInstance: Broadcaster) => {
    // notifies other instances, that this instance is not active anymore
    // and disconnects
    broadcasterInstance.close();
}
```

### Sending and Receiving a Message

```ts
// from previous example
import { broadcaster } from "path/to/instance";

// subscribe to a message channel to receive messages
const messageSubscription = broadcaster.subscribe.message(
    // message handle
    (message) => {
        // Message owner id
        console.log(message.from);
        // Message payload
        console.log(message.payload, message.payload.type, message.payload.sentence);
    },
    // broadcaster error handler
    (error) => {
        console.log("Oops", error);
    },
);

// later, when we want to unsubscribe
messageSubscription.unsubscribe();

// sends a greeting message to all broadcaster
// instances in different browsing contexts
broadcaster.postMessage({
    type: "greetings",
    sentence: "Hello World",
});
```

### Broadcaster State Management

Each Broadcaster has it's inner state, which will be shared with other instances. Each Broadcaster instance
has list of all Broadcasters state from all instances. It means, that **Broadcaster environment does not
share one state!** For those purposes it is possible to utilize action based state manager (like Redux) and pass
actions as Broadcaster messages.

```ts
// from previous example
import { broadcaster } from "path/to/instance";

// subscribe to a message channel to receive messages
const stateSubscription = broadcaster.subscribe.state(
    (states) => {
        // iterate through states from each broadcasters
        // and print its current state
        states.map((instanceState) => {
            // State owner id
            console.log(instanceState.id);
            // Date when Broadcaster instance was created
            console.log(instanceState.connectedAt);
            // Current state
            console.log(instanceState.state, instanceState.state.your, instanceState.state.state);
        });
    },
);

// later, when we want to unsubscribe
stateSubscription.unsubscribe();

// updates state and notifies all broadcaster instances about it
broadcaster.setState({
    your: "some data",
    state: true,
});

// alternative approach with callback
broadcaster.setState((currentState) => ({
    your: currentState.your,
    state: true,
}));
```

## Broadcaster Constructor Settings

For more detailed info, please see [BroadcasterSettings type](https://github.com/pavelstencl/broadcasterJS/blob/main/packages/core/src/types.ts)

| Property     | Value                                                                                                                    | Required | Default                                                                                                                              | Description                                                                                          |
|--------------|--------------------------------------------------------------------------------------------------------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| bridge       | [BroadcasterBridge instance](https://github.com/pavelstencl/broadcasterJS/blob/main/packages/core/src/bridges/Bridge.ts) | optional | [BroadcastChannelBridge](https://github.com/pavelstencl/broadcasterJS/blob/main/packages/core/src/bridges/BroadcastChannelBridge.ts) | Allows to change communication strategy to a custom one.                                             |
| channel      | string                                                                                                                   | required | -                                                                                                                                    | All broadcaster with same channel name will be able to communicate.                                  |
| defaultState | string                                                                                                                   | required | -                                                                                                                                    | Initial broadcaster instance state. Will be broadcasted to audience.                                 |
| middlewares  | object                                                                                                                   | optional | -                                                                                                                                    | Set of middlewares, which can modify message before broadcasting and right after receiving a message |
| on           | object                                                                                                                   | optional | -                                                                                                                                    | Set of lifecycle events.                                                                             |
