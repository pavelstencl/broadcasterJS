import { Broadcaster } from "./Broadcaster";
import type { BroadcasterError } from "./utils/Errors";
import { BroadcasterContentTypeMismatchError } from "./utils/Errors";
import { MockBridge } from "./testing-library/BridgeMocker";
import type { GenericBroadcasterAttributes, BroadcasterMessage, BroadcasterSettings, BroadcasterInstanceDescriptor } from "./types";

// CONFIG ---------------------------------

const CHANNEL = "CHANNEL";

type SimpleBroadcasterSettings = {
    metadata: Record<string, string>;
    payload: Record<string, string>;
    state: Record<string, unknown>;
}

const createInstances = <T extends GenericBroadcasterAttributes = SimpleBroadcasterSettings>(
    amount: number,
    settings?: Partial<BroadcasterSettings<T["payload"]>>
): Broadcaster<T>[] => new Array(amount)
    .fill(0)
    .map((_, i) => (
        new Broadcaster<T>({
            // use testing bridge instead of BroadcastChannelBridge
            bridge: new MockBridge(),
            channel: CHANNEL,
            defaultMetadata: {
                instanceID: i + 1,
            },
            ...settings,
        })
    ));

// END CONFIG ------------------------------------

describe("Broadcaster messaging tests", () => {
    const result = jest.fn<undefined, [
        BroadcasterMessage<unknown> | null,
        null | BroadcasterError,
    ]>(() => undefined);

    beforeEach(() => {
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

    it("sends custom metadata about owner", () => {
        const [instance1, instance2] = createInstances(2);

        instance1.subscribe.message(result);
        instance2.postMessage({message: "Any Message"});

        expect(result.mock.calls[0][0]?.metadata?.instanceID).toBe(2);
    });

    it("unsubscribes from broadcaster", () => {
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

        instance1.subscribe.message(result);
        instance2.postMessage({data: message});

        expect(result.mock.calls).toHaveLength(1);
        expect(result.mock.calls[0][0]).toBe(null);
        expect(result.mock.calls[0][1]?.errorType).toBe(MockBridge.throwError.errorType);

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

        const [instance1, instance2] = createInstances<{payload: Message; state: Record<string, unknown>;}>(2, {
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

    it("changes metadata and sends it packed with a message", () => {
        const [instance1, instance2] = createInstances(2);
        instance2.subscribe.message(result);
        const name = "John";
        const lastName = "Doe";

        // override metadata
        instance1.setMetadata({ name });
        instance1.postMessage({ message: "Hello World" });

        expect((result.mock.calls[0][0]?.metadata as Record<string, unknown>).name).toBe(name);

        // update metadata
        instance1.setMetadata((current) => ({...current, lastName}));
        instance1.postMessage({ message: "Hello World" });

        expect((result.mock.calls[1][0]?.metadata as Record<string, unknown>).name).toBe(name);
        expect((result.mock.calls[1][0]?.metadata as Record<string, unknown>).lastName).toBe(lastName);
    });
});

describe("Broadcaster state management tests", () => {
    const result = jest.fn<undefined, [
        BroadcasterInstanceDescriptor<Record<string, unknown>>[],
    ]>(() => undefined);

    beforeEach(() => {
        MockBridge.reset();
        result.mockReset();
    });

    it("connects two instances and syncs their state data", () => {
        const [instance1, instance2] = createInstances(2);

        instance1.subscribe.state(result);
        instance2.subscribe.state(result);

        expect(result.mock.calls.length).toBe(2);
        expect(result.mock.calls[0][0].length).toBe(2);
        expect(result.mock.calls[1][0].length).toBe(2);
        expect(result.mock.calls[1][0]).toStrictEqual(result.mock.calls[0][0]);
    });

    it("synchronizes state, when new broadcaster connects", () => {
        const [instance1] = createInstances(2);

        instance1.subscribe.state(result);

        expect(result.mock.calls[0][0].length).toBe(2);

        createInstances(1);
        expect(result.mock.calls[1][0].length).toBe(3);
    });

    it("removes broadcaster instance and notifies others", () => {
        const [instance1, instance2] = createInstances(2);

        instance1.subscribe.state(result);

        expect(result.mock.calls[0][0].length).toBe(2);

        instance2.close();
        expect(result.mock.calls[1][0].length).toBe(1);
        expect(result.mock.calls[1][0][0].id).toBe(instance1.id);
    });

    it("updates broadcaster state and notifies other about change", () => {
        const [instance1, instance2] = createInstances(2);
        const newState = {
            name: "John Doe"
        };

        instance1.subscribe.state(result);

        instance2.setState(newState);

        const dataResult = result.mock.calls[1][0];

        expect(dataResult.length).toStrictEqual(2);
        expect(dataResult.find(
            (broadcaster) => broadcaster.id === instance2.id)?.state
        ).toStrictEqual(newState);
    });
});
