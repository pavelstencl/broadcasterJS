import { DeepReadonly } from "utility-types";

import { BroadcasterSubscription } from "./subscription/Subscription";
import { StateMessageType } from "./types";
import { BroadcastChannelBridge } from "./bridges/BroadcastChannelBridge";
import { generateId } from "./utils/generateId";

import { BroadcasterBridge } from "./bridges/Bridge";
import { BroadcasterError } from "./utils/Errors";
import {
    BroadcasterMessage,
    BroadcasterSettings,
    BroadcasterInstanceDescriptor,
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
export class Broadcaster<Payload, State> {
    /**
     * All active Broadcaster instances
     */
    private broadcasters: BroadcasterInstanceDescriptor<State>[] = [];

    /**
     * Instance of a communication bridge (BroadcasterChannel, WebSockets, etc..)
     */
    private bridge: BroadcasterBridge<BroadcasterMessage<Payload>, BroadcasterStateMessage<State>>;

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

    private currentState: State;

    /**
     * Keeps stored all subscriptions
     */
    private subscriptionManager = new BroadcasterSubscription<[
        DeepReadonly<BroadcasterMessage<Payload>> | null,
        BroadcasterError | null,
    ]>();

    private state = new BroadcasterSubscription<[
        DeepReadonly<BroadcasterInstanceDescriptor<State>[]>,
    ]>(true);

    public constructor(private settings: BroadcasterSettings<Payload, State>) {
        const { bridge, channel, defaultState} = this.settings;

        this.channel = channel;
        this.bridge = bridge || new BroadcastChannelBridge();
        this.currentState = defaultState;

        this.bridge.subscribe({
            messages: this.pushMessage,
            state: this.updateState,
            onError: this.pushError,
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

        this.settings.on?.close?.(this as unknown as Broadcaster<Payload, State>);

        this.bridge.setState(this.prepareStateMessage(StateMessageType.DISCONNECTED));

        this.subscriptionManager.close();
        this.bridge.destroy();
        this.state.close();

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
        this.settings.on?.init?.(this as unknown as Broadcaster<Payload, State>);
        this.bridge.setState(this.prepareStateMessage(StateMessageType.CONNECTED));
    }

    /**
     * Indicates, whether connection was closed or not
     */
    public get isClosed(): boolean {
        return this.closed;
    }

    /**
     * Notify all registered subscribers
     */
    private notify = this.subscriptionManager.next;

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
    public postMessage(payload: Payload): void {
        if (!this.isBroadcasterActive("postMessage")) {
            return;
        }

        const applyMiddleware = this.settings.middlewares?.before;

        this.bridge.postMessage({
            from: this.id,
            payload: applyMiddleware ? (applyMiddleware(payload) as Payload) : payload,
        });
    }

    /**
     * Creates a new state message
     *
     * @param type message type
     * @param to message receiver id
     * @returns
     */
    private prepareStateMessage(type: StateMessageType, to?: string): BroadcasterStateMessage<State> {
        return {
            type: type,
            from: this.id,
            to: to,
            state: {
                connectedAt: this.createdAt,
                id: this.id,
                state: this.currentState,
            }
        };
    }

    /**
     * Push new error to all subscribers
     *
     * @param error
     */
    private pushError = (error: BroadcasterError): void => {
        this.notify(null, error);
    };

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
            this.notify(
                {
                    ...data,
                    // change message if middleware exist
                    payload: applyMiddleware ?
                        applyMiddleware(payload) :
                        payload
                } as DeepReadonly<BroadcasterMessage<Payload>>,
                null,
            );
        }
    };

    /**
     * Changes broadcasters state.
     * All broadcaster instances will be notified about the change.
     *
     * ____
     *
     * @example```ts
     * // override state
     * broadcasterInstance.setState({name: "John"});
     * // update state
     * broadcasterInstance.setState((current) => ({...current, lastName: "Doe"}));
     *
     * // all broadcasters will receive new state
     * ```
     * @param newState data to override or a method with current state as an attribute
     */
    public setState(
        newState: State | ((current: State) => State)
    ): void {
        if (typeof newState === "function") {
            this.currentState = (newState as ((current: State) => State))(this.currentState);
        }
        else {
            this.currentState = newState;
        }

        this.bridge.setState(this.prepareStateMessage(StateMessageType.UPDATED));
    }

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
        message: this.subscriptionManager.subscribe,
        state: this.state.subscribe,
    };

    /**
     * Unsubscribes from a channel.
     * ____
     * @example```ts
     * const callback = (message: string) => console.log(message);
     *
     * broadcaster.subscribe.message(callback);
     * broadcaster.subscribe.state(callback);
     *
     * //...later
     * broadcaster.unsubscribe.message(callback);
     * broadcaster.unsubscribe.state(callback);
     * ```
     *
     * @param callback same method, which was used for subscription
     */
    public unsubscribe = {
        /**
         * Unsubscribes from Message Channel
         */
        message: this.subscriptionManager.unsubscribe,
        /**
         * Unsubscribes from Broadcaster State Channel
         */
        state: this.state.unsubscribe,
    };

    private updateState = (data: BroadcasterStateMessage<State>): void => {
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

        this.state.next([...this.broadcasters] as DeepReadonly<BroadcasterInstanceDescriptor<State>[]>);
    };
}
