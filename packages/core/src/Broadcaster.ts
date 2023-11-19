import { BroadcasterSubscription } from "./subscription/Subscription";
import { BroadcasterInstanceDescriptor, StateMessageType } from "./types";
import { BroadcastChannelBridge } from "./bridges/BroadcastChannelBridge";
import { generateId } from "./utils/generateId";

import { BroadcasterBridge } from "./bridges/Bridge";
import { BroadcasterError } from "./utils/Errors";
import {
    BroadcasterMessage,
    BroadcasterSettings,
    BroadcasterState,
    BroadcasterStateMessage,
} from "./types";

/**
 * **Broadcaster: Cross Window State Manager**
 *
 * Enables seamless communication across various browsing contexts,
 * including tabs, windows, and workers. This system not only preserves
 * the state of each instance but also shares the current state with
 * remote counterparts.
 * ____
 */
export class Broadcaster<Payload, Metadata> {
    /**
     * All active Broadcaster instances
     */
    private broadcasters: BroadcasterInstanceDescriptor<Metadata>[] = [];

    /**
     * Instance of a communication bridge (BroadcasterChannel, WebSockets, etc..)
     */
    private bridge: BroadcasterBridge<BroadcasterMessage<Payload>, BroadcasterStateMessage<Metadata>>;

    public readonly createdAt = Date.now();

    /**
     * Channel name is unique ID, which is used as a key for messaging
     */
    public readonly channel: string;

    /**
     * Indicates whether destroy method was called or not
     */
    private closed = false;

    /**
     * Random ID of an instance
     */
    public readonly id = generateId();

    private metadata: Metadata;

    /**
     * Keeps stored all subscriptions
     */
    private messageSubscriptionManager = new BroadcasterSubscription<[
        BroadcasterMessage<Payload>,
    ]>();

    private broadcastersSubscriptionManager = new BroadcasterSubscription<[
        BroadcasterState<Metadata>[],
    ]>(true);

    private broadcastersErrorManager = new BroadcasterSubscription<[
        BroadcasterError
    ]>();

    public constructor(private settings: BroadcasterSettings<Payload, Metadata>) {
        const { bridge, channel, metadata} = this.settings;

        this.channel = channel;
        this.bridge = bridge || new BroadcastChannelBridge();
        this.metadata = metadata;

        this.bridge.subscribe({
            messages: this.pushMessage,
            state: this.updateState,
            onError: this.broadcastersErrorManager.next,
        });

        this.bridge.connect(this.channel);

        this.init();
    }

    /**
     * Cancel a connection to a channel and notify other Broadcasters about it.
     */
    public close(): void {
        if (!this.isBroadcasterActive("close")) {
            return;
        }

        this.settings.on?.close?.(this as unknown as Broadcaster<Payload, Metadata>);

        this.bridge.setState(this.prepareStateMessage(StateMessageType.DISCONNECTED));

        this.messageSubscriptionManager.close();
        this.bridge.destroy();
        this.broadcastersSubscriptionManager.close();

        this.closed = true;
    }

    /**
     * Detects whether Broadcaster method can be triggered or not
     *
     * @param action
     */
    private isBroadcasterActive(methodName: string): boolean {
        if (this.closed) {
            /**
             * We want to notify a developer about this problem, instead of throwing an error and killing a process,
             * because this error does not trigger any side effects.
             */
            console.error(new Error(
                `Broadcasters.${methodName} was called, but Broadcaster has already been disconnected. ` +
                "This indicates possible memory leak, because program is trying to manipulate with a channel " +
                "after calling Broadcaster.close method."
            ));

            return false;
        }

        return true;
    }

    private init(): void {
        this.settings.on?.init?.(this);
        this.bridge.setState(this.prepareStateMessage(StateMessageType.CONNECTED));
    }

    /**
     * Indicates, whether connection was closed or not
     */
    public get isClosed(): boolean {
        return this.closed;
    }

    /**
     * Send a message to all instances of Broadcaster across browsing context.
     *
     * @param payload data payload
     * _____
     * @example```ts
     *
     * const broadcaster = new Broadcaster<string>({
     *     channel: "CHANNEL",
     * });
     *
     * broadcaster.postMessage("Hello World");
     * ```
     *
     * @param payload message payload
     */
    public postMessage = (payload: Payload): void => {
        if (!this.isBroadcasterActive("postMessage")) {
            return;
        }

        const applyMiddleware = this.settings.middlewares?.before;

        this.bridge.postMessage({
            from: this.id,
            payload: applyMiddleware ? (applyMiddleware(payload) as Payload) : payload,
        });
    };

    /**
     * Creates a new state message
     *
     * @param type message type
     * @param to message receiver id
     * @returns
     */
    private prepareStateMessage(type: StateMessageType, to?: string): BroadcasterStateMessage<Metadata> {
        return {
            type: type,
            from: this.id,
            to: to,
            state: {
                createdAt: this.createdAt,
                id: this.id,
                metadata: this.metadata,
            }
        };
    }

    /**
     * Push new message to all subscribers
     *
     * @param param0 raw bridge message
     */
    private pushMessage = (data: BroadcasterMessage<Payload>): void => {
        const {payload, from} = data;

        // filter all messages, where message owner is current instance
        if (from !== this.id) {
            const applyMiddleware = this.settings.middlewares?.after;
            this.messageSubscriptionManager.next(
                {
                    ...data,
                    // change message if middleware exist
                    payload: applyMiddleware ?
                        applyMiddleware(payload) :
                        payload
                },
            );
        }
    };

    /**
     * Updates Broadcaster instance metadata and notify other instances about the change.
     * ____
     *
     * @example```ts
     * // override metadata
     * broadcasterInstance.updateMetadata({name: "John"});
     * // update metadata
     * broadcasterInstance.updateMetadata((current) => ({...current, lastName: "Doe"}));
     *
     * // all broadcasters will receive new state with updated metadata
     * ```
     * @param newMetadata data to override or a method with current state as an attribute
     */
    public updateMetadata = (
        newMetadata: Metadata | ((current: Metadata) => Metadata)
    ): void => {
        if (typeof newMetadata === "function") {
            this.metadata = (newMetadata as ((current: Metadata) => Metadata))(this.metadata);
        }
        else {
            this.metadata = newMetadata;
        }

        this.bridge.setState(this.prepareStateMessage(StateMessageType.UPDATED));
    };

    /**
     * Subscribes to a public message channel.
     * ____
     * @example```ts
     * const callback = (message: string) => console.log(message);
     *
     * const subscription = broadcasterInstance.subscribe.message(callback);
     *
     * //...later
     * subscription.unsubscribe();
     * // or
     * broadcaster.unsubscribe.message(callback);
     * ```
     *
     * @param callback method, which will be called on every incoming message
     * @return subscription object
     */
    public subscribe = {
        message: this.messageSubscriptionManager.subscribe,
        broadcasters: this.broadcastersSubscriptionManager.subscribe,
        errors: this.broadcastersErrorManager.subscribe,
    };

    /**
     * Unsubscribes from a channel.
     * ____
     * @example```ts
     * const callback = (message: string) => console.log(message);
     *
     * broadcaster.subscribe.message(callback);
     * broadcaster.subscribe.broadcasters(callback);
     *
     * //...later
     * broadcaster.unsubscribe.message(callback);
     * broadcaster.unsubscribe.broadcasters(callback);
     * ```
     *
     * @param callback same method, which was used for subscription
     */
    public unsubscribe = {
        /**
         * Unsubscribes from Message Channel
         */
        message: this.messageSubscriptionManager.unsubscribe,
        /**
         * Unsubscribes from Broadcasters List Channel
         */
        broadcasters: this.broadcastersSubscriptionManager.unsubscribe,
        errors: this.broadcastersErrorManager.unsubscribe,
    };

    private updateState = (data: BroadcasterStateMessage<Metadata>): void => {
        if (data.to && data.to !== this.id) {
            return;
        }

        if (data.type === StateMessageType.CONNECTED) {
            this.broadcasters = [
                ...this.broadcasters,
                data.state,
            ];

            this.bridge.setState(this.prepareStateMessage(
                StateMessageType.UPDATED,
                data.from,
            ));
        }
        else if (data.type === StateMessageType.UPDATED) {
            this.broadcasters = [
                ...this.broadcasters.filter((state) => state.id !== data.state.id),
                data.state,
            ];
        }
        else if (data.type === StateMessageType.DISCONNECTED) {
            this.broadcasters = this.broadcasters.filter((state) => state.id !== data.state.id);
        }
        else {
            return;
        }

        this.broadcastersSubscriptionManager.next([...this.broadcasters]);
    };
}
