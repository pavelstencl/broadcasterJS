import { MockBridge } from "@broadcaster/testing-tools";

import { Broadcaster } from "./Broadcaster";
import { BroadcasterContentTypeMismatchError, BroadcasterError } from "./utils/Errors";
import { BroadcasterInstanceDescriptor, BroadcasterMessage, BroadcasterSettings } from "./types";

// CONFIG ---------------------------------

const CHANNEL = "CHANNEL";

const createInstances = <Payload, State extends Record<string, unknown>>(
    amount: number,
    settings?: Partial<BroadcasterSettings<Payload, State>>
): Broadcaster<Payload, State>[] => new Array(amount)
    .fill(0)
    .map((_, i) => (
        new Broadcaster<Payload, State>({
            // use testing bridge instead of BroadcastChannelBridge
            bridge: new MockBridge(),
            channel: CHANNEL,
            metadata: {
                instanceID: i + 1,
            } as unknown as State,
            ...settings,
        })
    ));

// END CONFIG ------------------------------------

describe("Broadcaster messaging tests", () => {
    const result = jest.fn<undefined, [
        BroadcasterMessage<unknown>,
    ]>(() => undefined);

    afterEach(() => {
        MockBridge.reset();
        result.mockReset();
    });

    it("sends a message", () => {
        const message = {message: "Hello World"};
        const [instance1, instance2] = createInstances(2);

        instance1.subscribe.message(result);
        instance2.postMessage(message);

        expect(result.mock.calls).toHaveLength(1);
        expect(result.mock.calls[0][0]?.payload).toStrictEqual(message);
    });

    it("unsubscribes from message channel", () => {
        const message = {message: "Hello World"};
        const [instance1, instance2] = createInstances(2);

        // send a message to subscriber
        instance1.subscribe.message(result);
        instance2.postMessage(message);

        // throw away a message, because there is no subscription
        instance1.unsubscribe.message(result);
        instance2.postMessage(message);

        expect(result.mock.calls).toHaveLength(1);
    });

    it("calls completion method, when broadcaster is destroyed", () => {
        const [instance] = createInstances(1);

        instance.subscribe.message(() => undefined, result);
        instance.close();

        expect(result.mock.calls.length).toBe(1);
    });

    it("owner should not receive it's own messages", () => {
        const [instance] = createInstances(1);

        instance.subscribe.message(result);
        instance.postMessage({error: "It should not be delivered"});

        expect(result.mock.calls).toHaveLength(0);
    });

    it("triggers an error because message was corrupted", () => {
        const [instance1, instance2] = createInstances(2);
        const message = "Hello World";
        MockBridge.throwError = new BroadcasterContentTypeMismatchError();
        const errorResult = result as unknown as jest.Mock<undefined, [BroadcasterError], unknown>;

        instance1.subscribe.errors(errorResult);
        instance2.postMessage({data: message});

        expect(errorResult.mock.calls).toHaveLength(1);
        expect(errorResult.mock.calls[0][0]?.errorType).toBe(MockBridge.throwError.errorType);

        MockBridge.throwError = undefined;
    });

    /**
     * Allows to change a payload before pushing to a channel and after receiving it.
     * It is useful, when payload is for example a class, which needs to be stringified
     * first.
     */
    it("modifies payload before pushing to a channel and after receiving from a channel", () => {
        /**
         * Example of a custom message bearer
         */
        class Message {
            public constructor(public readonly message: string) {}

            public toString(): string {
                return this.message;
            }
        }

        const message = "Hello World";

        const [instance1, instance2] = createInstances<Message,  Record<string, unknown>>(2, {
            middlewares: {
                // method transforming a message before sending
                before: (payload) => {
                    expect(payload).toBeInstanceOf(Message);

                    return payload.toString();
                },
                // method transforming a message after receiving
                after: (payload) => {
                    expect(payload).toBe(message);

                    return new Message(payload as string);
                },
            },
        });

        instance1.subscribe.message(result);
        instance2.postMessage(new Message(message));

        const data = result.mock.calls?.[0]?.[0];
        expect(data?.payload).toBeInstanceOf(Message);
        expect((data?.payload as Message).toString()).toBe(message);
    });

    it("prints an error to a console, because Broadcaster method is called after channel connection was destroyed", () => {
        // original method
        const originalMethod = console.error;
        // replace with mock
        console.error = jest.fn();

        const [instance1, instance2] = createInstances(2);

        instance2.subscribe.message(result);
        instance1.close();
        instance1.postMessage({ message: "Call after closure" });

        expect(console.error).toBeCalled();
        expect(result.mock.calls.length).toBe(0);

        // return original method
        console.error = originalMethod;
    });
});

/**
 * Broadcaster keeps record about all opened instances.
 * This set of test validates, that all state changes synchronizes.
 */
describe("Broadcaster instances states tests", () => {
    const result = jest.fn<undefined, [
        BroadcasterInstanceDescriptor<Record<string, unknown>>[],
    ]>(() => undefined);

    afterEach(() => {
        MockBridge.reset();
        result.mockReset();
    });

    it("connects two instances and syncs their state data", () => {
        const [instance1, instance2] = createInstances<unknown, Record<string, unknown>>(2);

        instance1.subscribe.broadcasters(result);
        instance2.subscribe.broadcasters(result);

        expect(result.mock.calls.length).toBe(2);
        expect(result.mock.calls[0][0].length).toBe(2);
        expect(result.mock.calls[1][0].length).toBe(2);
        expect(result.mock.calls[1][0]).toStrictEqual(result.mock.calls[0][0]);
    });

    it("synchronizes state, when new broadcaster connects", () => {
        const [instance1] = createInstances<unknown, Record<string, unknown>>(2);

        instance1.subscribe.broadcasters(result);

        expect(result.mock.calls[0][0].length).toBe(2);

        createInstances(1);
        expect(result.mock.calls[1][0].length).toBe(3);
    });

    it("removes broadcaster instance and notifies others", () => {
        const [instance1, instance2] = createInstances<unknown, Record<string, unknown>>(2);

        instance1.subscribe.broadcasters(result);

        expect(result.mock.calls[0][0].length).toBe(2);

        instance2.close();
        expect(result.mock.calls[1][0].length).toBe(1);
        expect(result.mock.calls[1][0][0].id).toBe(instance1.id);
    });

    it("updates broadcasters metadata and notifies other about the change", () => {
        const [instance1, instance2] = createInstances<unknown, Record<string, unknown>>(2);
        const metadata = {
            name: "John Doe"
        };

        instance1.subscribe.broadcasters(result);

        instance2.updateMetadata(metadata);

        const dataResult = result.mock.calls[1][0];

        expect(dataResult.length).toStrictEqual(2);
        expect(dataResult.find(
            (broadcaster) => broadcaster.id === instance2.id)?.metadata
        ).toStrictEqual(metadata);
    });
});

describe("Broadcaster lifecycle events", () => {
    const event = jest.fn<undefined, [
        Broadcaster<unknown, Record<string, unknown>>,
    ]>(() => undefined);

    afterEach(() => {
        MockBridge.reset();
        event.mockReset();
    });

    it("triggers init event", () => {
        const [instance] = createInstances(1, {
            on: {
                init: event,
            }
        });

        expect(event.mock.calls.length).toBe(1);
        expect(event.mock.calls[0][0]).toBe(instance);
    });

    it("triggers close event", () => {
        const [instance] = createInstances(1, {
            on: {
                close: event,
            }
        });

        instance.close();

        expect(event.mock.calls.length).toBe(1);
        expect(event.mock.calls[0][0]).toBe(instance);
    });
});
