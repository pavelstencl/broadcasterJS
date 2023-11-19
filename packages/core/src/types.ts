import { Broadcaster } from "./Broadcaster";
import { BroadcasterBridge } from "./bridges/Bridge";

/**
 * Basic info about remote broadcaster instance
 *
 * @public
 */
export type BroadcasterState<Metadata> = {
    /**
     * Indicates time when a broadcaster was created
     */
    createdAt: number;
    /**
     * Broadcaster ID
     */
    id: string;
    /**
     * Broadcaster instance metadata
     */
    metadata: Metadata;
};

/**
 * Basic info about remote broadcaster instance
 *
 * @public
 */
export type BroadcasterInstanceDescriptor<Metadata> = BroadcasterState<Metadata>;

/**
 * An object representing public message from other broadcaster instance.
 *
 * @public
 */
export type BroadcasterMessage<Payload> = {
    from: string;
    payload: Payload;
};

/**
 * State update message received from another Broadcaster instance.
 *
 * @private
 */
export type BroadcasterStateMessage<Metadata> = {
    /**
     * ID of an message owner.
     */
    from: string;
    /**
     * Owners state object.
     */
    state: BroadcasterState<Metadata>;
    /**
     * Broadcaster ID, which will be used as a message address.
     */
    to?: string;
    /**
     * Message type.
     */
    type: StateMessageType;
};

/**
 * Broadcasting class settings
 *
 * @public
 */
export type BroadcasterSettings<Payload, Metadata> = {
    /**
     * Replaces default BroadcasterBridge. Allows to use communication layer other then
     * BroadcasterChannel API (for example WebSocket layer).
     *
     * @default BroadcastChannelBridge
     */
    bridge?: BroadcasterBridge<BroadcasterMessage<Payload>, BroadcasterStateMessage<Metadata>>;

    /**
     * Unique channel name, which will be used as a communication key
     */
    channel: string;

    metadata: Metadata;

    /**
     * Middleware allowing to transform a message
     */
    middlewares?: {
        /**
         * Allows to modify incoming message.
         *
         * @param message
         * @returns
         */
        after: (message: unknown) => Payload;

        /**
         * Allows to modify outgoing message.
         *
         * @param message
         * @returns
         */
        before: (message: Payload) => unknown;
    };

    /**
     * Lifecycle events
     */
    on?: Partial<{
        /**
         * Called before Broadcaster is destroyed.
         *
         * @param broadcaster
         * @returns
         */
        close: (broadcaster: Broadcaster<Payload, Metadata>) => void;
        /**
         * Called right after broadcaster initialization
         *
         * @param broadcaster
         * @returns
         */
        init: (broadcaster: Broadcaster<Payload, Metadata>) => void;
    }>;
}

/**
 * Allowed state message types
 *
 * @private
 */
export enum StateMessageType {
    CONNECTED,
    UPDATED,
    DISCONNECTED,
}
