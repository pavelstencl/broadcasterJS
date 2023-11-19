import { useLayoutEffect, useState } from "react";

import { Broadcaster, BroadcasterError, BroadcasterInstanceDescriptor, BroadcasterMessage } from "@broadcaster/core";

export type UseBroadcasterReturnType<Payload, Metadata> = {
    /**
     * Gets info about all broadcasters across browsing context.
     * Provides basic state and metadata about each instance separately.
     */
    broadcasters: BroadcasterInstanceDescriptor<Metadata>[];
    /**
     * Channel name used for communication between broadcasters
     */
    channel:  Readonly<string>;
    /**
     * Expected error message from a Broadcaster.
     */
    error: BroadcasterError | null;
    /**
     * Broadcaster instance id
     */
    id: Readonly<string>;
    /**
     * Latest message
     */
    message: BroadcasterMessage<Payload> | null;
    /**
     * Sends a message to all broadcasters
     */
    postMessage: Broadcaster<Payload, Metadata>["postMessage"];
    /**
     * Updates Broadcasters metadata and notifies other instances about the change.
     */
    updateMetadata: Broadcaster<Payload, Metadata>["updateMetadata"];
}

/**
 * Creates useBroadcaster hooks from provided Broadcaster instance
 *
 * @param broadcaster
 * @returns
 */
export const createUseBroadcaster = <Payload, Metadata>(
    broadcaster: Broadcaster<Payload, Metadata>,
) => (): UseBroadcasterReturnType<Payload, Metadata> => {
    const [message, setMessage] = useState<BroadcasterMessage<Payload> | null>(null);
    const [broadcasters, setBroadcasters] = useState<BroadcasterInstanceDescriptor<Metadata>[]>(
        [] as unknown as BroadcasterInstanceDescriptor<Metadata>[]
    );
    const [error, setError] = useState<BroadcasterError | null>(null);

    useLayoutEffect(() => {
        const subscriptions = [
            broadcaster.subscribe.message(setMessage),
            broadcaster.subscribe.broadcasters(setBroadcasters),
            broadcaster.subscribe.errors(setError),
        ];

        return (): void => {
            subscriptions.map((subscription) => subscription.unsubscribe());
        };
    }, []);

    return {
        id: broadcaster.id,
        broadcasters: broadcasters,
        error,
        message,
        channel: broadcaster.channel,
        updateMetadata: broadcaster.updateMetadata,
        postMessage: broadcaster.postMessage,
    };
};
