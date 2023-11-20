# Broadcaster: Cross Window Serverless Messaging System

[![npm version](https://badge.fury.io/js/@broadcaster%2Fcore.svg)](https://badge.fury.io/js/@broadcaster%2Fcore)

Small, zero-dependency package for managing communication between different
[browsing contexts](https://developer.mozilla.org/en-US/docs/Glossary/Browsing_context), like tabs, windows, iFrames, workers, etc..
It adds extra layer over BroadcastChannel with unified error management and context awareness.

This package not only sends messages to different browser windows or tabs, but it keeps track about all Broadcaster instances across
browsing context. In every moment you can see current instance state of any Broadcaster. You can also enhance state with your own metadata.
Under the hood, it utilizes the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API),
yet it can be easily replaced with any alternative communication strategy.

## Broadcaster Monorepo Structure

 * **[@broadcaster/core](https://github.com/pavelstencl/broadcasterJS/tree/main/packages/core):** Main package with all business logic in it.
 * **[@broadcaster/react](https://github.com/pavelstencl/broadcasterJS/tree/main/packages/react):** React port of @broadcaster with utility hooks.

Look for other packages in [packages](https://github.com/pavelstencl/broadcaster/tree/main/packages) folder.

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
 * **Resilient**  
 Errors identified during the broadcasting phase are transferred into a separate error stream,
 allowing the channel to remain open for additional incoming messages.
