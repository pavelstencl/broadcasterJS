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

import {
    DEFAULT_BEACON_TIMER,
    DEFAULT_GARBAGE_COLLECTOR_TIMER,
    DEFAULT_REMOVE_AFTER_TIME,
} from "./constants";

/**
 * **Broadcaster: Cross Window Serverless Messaging System**
 *
 * Enables seamless communication across various browsing contexts,
 * including tabs, windows, and workers. This system not only preserves
 * the state of each instance but also shares the current state with
 * remote counterparts.
 *
 * @public
 * @typeParam Payload message shape
 * @typeParam Metadata metadata object shape
 */
export class Broadcaster<Payload, Metadata> {
    /**
     * List of states of all active broadcasters
     */
    private _broadcasters: BroadcasterInstanceDescriptor<Metadata>[] = [];

    public get broadcasters(): Readonly<Broadcaster<Payload, Metadata>["_broadcasters"]> {
        return this._broadcasters;
    }

    /**
     * Bridge instance (BroadcasterChannel, WebSockets, etc..)
     */
    private bridge: BroadcasterBridge<BroadcasterMessage<Payload>, BroadcasterStateMessage<Metadata>>;

    /**
     * When Broadcaster instance was created
     */
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

    /**
     * Current metadata
     */
    private metadata: Metadata;

    private intervals: (NodeJS.Timeout | number)[] = [];

    private messageSubscriptionManager = new BroadcasterSubscription<[
        BroadcasterMessage<Payload>,
    ]>();

    private broadcastersSubscriptionManager = new BroadcasterSubscription<[
        BroadcasterInstanceDescriptor<Metadata>[],
    ]>(true);

    private broadcastersErrorManager = new BroadcasterSubscription<[
        BroadcasterError
    ]>();

    public constructor(private settings: BroadcasterSettings<Payload, Metadata>) {
        const { bridge, channel, metadata } = this.settings;

        this.channel = channel;
        this.bridge = bridge || new BroadcastChannelBridge();
        this.metadata = metadata;

        this.bridge.subscribe({
            messages: this.pushMessage,
            state: this.updateBroadcasterDescriptor,
            onError: this.broadcastersErrorManager.next,
        });

        this.bridge.connect(this.channel);

        this.init();
    }

    /**
     * Cancel a connection to a channel and notify other Broadcasters about it.
     *
     * @param silent skips multi call detection
     */
    public close(silent?: boolean): void {
        if (!silent && !this.isBroadcasterActive("close")) {
            return;
        }

        this.settings.on?.close?.(this as unknown as Broadcaster<Payload, Metadata>);

        this.bridge.setState(this.prepareStateMessage(StateMessageType.DISCONNECTED, null, false));
        this.intervals.map(interval => clearInterval(interval));

        this.messageSubscriptionManager.close();
        this.broadcastersErrorManager.close();
        this.broadcastersSubscriptionManager.close();

        this.bridge.destroy();

        this.closed = true;
    }

    /**
     * Marks as disabled all broadcasters which are inactive for specific amount of time.
     * Removes those who cross removeAfter threshold.
     */
    private collectGarbage = (): void => {
        if (this.settings.disableGarbageCollector) {
            return;
        }

        const broadcastersArrayLength = this._broadcasters.length;
        const currentTime = Date.now();
        const {
            garbageCollectorThresholdTimer = DEFAULT_REMOVE_AFTER_TIME,
        } = this.settings;

        this._broadcasters = this._broadcasters.filter((broadcaster) => (
            broadcaster.id === this.id ||
            currentTime - broadcaster.lastUpdate <= garbageCollectorThresholdTimer
        ));

        if (this._broadcasters.length !== broadcastersArrayLength) {
            this.broadcastersSubscriptionManager.next([...this._broadcasters]);
        }
    };

    /**
     * Find Broadcaster instance based on its ID.
     *
     * @param ownerId Broadcaster instance ID
     * @returns Broadcaster instance which id matches ownerId attribute
     */
    public findOwner = (ownerId: string): BroadcasterInstanceDescriptor<Metadata> | null => {
        return this._broadcasters.find((instance) => instance.id === ownerId) || null;
    };

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
        const message = this.prepareStateMessage(StateMessageType.CONNECTED);

        this.updateBroadcasterDescriptor(message, true);
        this.bridge.setState(message);

        this.intervals = [
            ...this.intervals,
            setInterval(this.sendAliveMessage, this.settings.healthBeaconTimer || DEFAULT_BEACON_TIMER),
            setInterval(this.collectGarbage, this.settings.garbageCollectorTimer || DEFAULT_GARBAGE_COLLECTOR_TIMER),
        ];
    }

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
     * @param withoutState
     * @returns
     */
    private prepareStateMessage(
        type: StateMessageType,
        to?: string | null,
        withoutState?: boolean
    ): BroadcasterStateMessage<Metadata> {
        return {
            type: type,
            from: this.id,
            to: to || undefined,
            state: !withoutState ? {
                createdAt: this.createdAt,
                id: this.id,
                metadata: this.metadata,
            } : undefined,
        };
    }

    /**
     * Push new message to all subscribers
     *
     * @param data Broadcaster message
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

        const newState = this.prepareStateMessage(StateMessageType.UPDATED);

        // update Broadcasters state
        this.updateBroadcasterDescriptor(newState, true);
        // notify others
        this.bridge.setState(newState);
    };

    private sendAliveMessage = (): void => {
        this.bridge.setState(this.prepareStateMessage(
            StateMessageType.HEALTH_BEACON,
            null,
            true,
        ));
    };

    /**
     * Subscribes to selected channel.
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
     */
    public subscribe = {
        message: this.messageSubscriptionManager.subscribe,
        broadcasters: this.broadcastersSubscriptionManager.subscribe,
        errors: this.broadcastersErrorManager.subscribe,
    };

    private stateToDescriptor(state: BroadcasterState<Metadata>): BroadcasterInstanceDescriptor<Metadata> {
        return {
            ...state,
            lastUpdate: Date.now(),
        };
    }

    /**
     * Unsubscribes from the selected channel.
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
     */
    public unsubscribe = {
        message: this.messageSubscriptionManager.unsubscribe,
        broadcasters: this.broadcastersSubscriptionManager.unsubscribe,
        errors: this.broadcastersErrorManager.unsubscribe,
    };

    /**
     * Updates broadcasters based on remote message
     *
     * @param data remote state message
     * @param localUpdate if true, it will always update broadcasters list, but never take any other action
     */
    private updateBroadcasterDescriptor = (data: BroadcasterStateMessage<Metadata>, localUpdate = false): void => {
        if (!localUpdate && (data.to && data.to !== this.id || data.from === this.id)) {
            return;
        }

        if (data.type === StateMessageType.CONNECTED) {
            if (data.state) {
                this._broadcasters = [
                    ...this._broadcasters,
                    this.stateToDescriptor(data.state)
                ];
            }

            if (!localUpdate) {
                this.bridge.setState(this.prepareStateMessage(
                    StateMessageType.UPDATED,
                    data.from,
                ));
            }
        }
        else if (data.type === StateMessageType.UPDATED) {
            if (data.state) {
                this._broadcasters = [
                    ...this._broadcasters.filter((broadcaster) => broadcaster.id !== data.from),
                    this.stateToDescriptor(data.state),
                ];
            }
        }
        else if (data.type === StateMessageType.DISCONNECTED) {
            this._broadcasters = this._broadcasters.filter((broadcaster) => broadcaster.id !== data.from);
        }
        // periodical message sent by Broadcaster, indicates healthy broadcaster instance
        else if (data.type === StateMessageType.HEALTH_BEACON) {
            this._broadcasters = this._broadcasters.map((broadcaster) => {
                if (broadcaster.id === data.from) {
                    return {
                        ...broadcaster,
                        lastUpdate: Date.now(),
                    };
                }

                return broadcaster;
            });

            // do not notify about a change
            return;
        }
        else {
            return;
        }

        this.broadcastersSubscriptionManager.next([...this._broadcasters]);
    };
}
