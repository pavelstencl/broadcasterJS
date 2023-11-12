import type { Broadcaster } from "./Broadcaster";
import type { BroadcasterBridge } from "./bridges/Bridge";

/**
 * Basic info about remote broadcaster instance
 *
 * @public
 */
export type BroadcasterInstanceDescriptor<State> = {
    /**
     * Indicates time when a broadcaster was created
     */
    connectedAt: number;
    /**
     * Broadcaster ID
     */
    id: string;
    /**
     * Broadcasters current state
     */
    state: State;
};

/**
 * An object representing public message from other broadcaster instance.
 *
 * @public
 */
export type BroadcasterMessage<Payload, Metadata extends Record<string, unknown> = Record<string, unknown>> = {
    from: string;
    metadata: Metadata;
    payload: Payload;
};

/**
 * Message received from other broadcaster.
 *
 * @private
 */
export type BroadcasterStateMessage<State> = {
    /**
     * ID of an message owner.
     */
    from: string;
    /**
     * Owners state object.
     */
    state: BroadcasterInstanceDescriptor<State>;
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
export type BroadcasterSettings<Payload = unknown, State = unknown, PayloadTransformer = unknown> = {
    /**
     * Replaces default BroadcasterBridge. Allows to use communication layer other then
     * BroadcasterChannel API (for example WebSocket layer).
     *
     * @default BroadcastChannelBridge
     */
    bridge?: BroadcasterBridge<BroadcasterMessage<Payload>, State>;

    /**
     * Unique channel name, which will be used as a communication key
     */
    channel: string;

    defaultMetadata?: Record<string, unknown>;

    defaultState?: State;

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
        after: (message: PayloadTransformer) => Payload;

        /**
         * Allows to modify outgoing message.
         *
         * @param message
         * @returns
         */
        before: (message: Payload) => PayloadTransformer;
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
        close: (broadcaster: Broadcaster<GenericBroadcasterAttributes>) => void;
        /**
         * Called right after broadcaster initialization
         *
         * @param broadcaster
         * @returns
         */
        init: (broadcaster: Broadcaster<GenericBroadcasterAttributes>) => void;
    }>;
}

/**
 * Type definition of Broadcaster Generic type
 *
 * @public
 */
export type GenericBroadcasterAttributes = {
    /**
     * Metadata data type packed with every message
     */
    metadata?: Record<string, unknown>;
    /**
     * Type definition of data payload
     */
    payload: unknown;
    /**
     * Broadcaster state type definition
     */
    state: Record<string, unknown>;
};

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
