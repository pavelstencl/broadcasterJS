# Broadcaster: Cross Window State Manager

Enables seamless communication across various browsing contexts, including tabs, windows, and workers. This system not only preserves the state of each instance but also shares the current state with remote counterparts.

## Broadcaster Monorepo

Look for Broadcaster and other related packages in [packages](https://github.com/pavelstencl/broadcaster/tree/main/packages) folder.

## Key features

 * 🚌 **BUS between browsing contexts**  
 Allows to share a state and messages between different browsing contexts.
 * **Serverless**  
 By default, the Broadcaster employs the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) as its primary bridge interface. This API enables fundamental communication between different browsing contexts such as windows and tabs, eliminating the necessity for a server.
 * 📝 **Context aware**  
Each instance of the Broadcaster maintains awareness of other instances throughout their lifecycle. It retains essential information and state, making this data accessible to every Broadcaster instance subscribed to the same channel.
 * 💪 **Accessible on most modern browsers and Node.JS** 
 In 2023 all main browsers supports BroadcastChannel API (Most recently Safari v 15.4) - [see caniuse](https://caniuse.com/?search=BroadcastChannel)
 * ⚙️⚙️⚙️ **Modular**  
Given Broadcaster's significant dependence on the BroadcastChannel API, users have the flexibility to alter the communication protocol by simply replacing the Bridge instance.
