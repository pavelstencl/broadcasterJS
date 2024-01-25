import { Broadcaster, BroadcasterSettings } from "@broadcaster/core";

import { ReactBroadcasterFactoryReturnType } from "./types";
import { createUseBroadcaster } from "./hooks/useBroadcaster";

/**
 * **Create Broadcaster Hook Factory**
 *
 * Creates Broadcaster instance according to provided settings and creates
 * hooks, which can be used in React App.
 *
 * _____
 *
 * @example```tsx
 * // init file
 *
 * // returns useBroadcaster hook and Broadcaster instance as well
 * export const { useBroadcaster, broadcaster} = createBroadcaster({
 *     // Broadcaster settings from broadcaster/core package
 *     ....settings,
 * });
 *
 * // in react component file:
 * import { useBroadcaster } from "./path-to-init-file"
 *
 * const ExampleComponent: FunctionComponent = () => {
 *     const { message } = useBroadcaster();
 *
 *     return <div>The latest message: {message.payload}</div>
 * }
 * ```
 *
 * @param settings Broadcaster settings
 *
 * @typeParam Payload message shape
 * @typeParam Metadata metadata object shape
 *
 * @see{@link BroadcasterSettings}
 *
 * @returns broadcaster hooks
 */
export const createBroadcaster = <Payload, Metadata>(
    settings: BroadcasterSettings<Payload, Metadata>,
): ReactBroadcasterFactoryReturnType<Payload, Metadata> => {
    let broadcaster:Broadcaster<Payload, Metadata> | undefined = undefined;

    // register browser based event listeners
    broadcaster = new Broadcaster<Payload, Metadata>({
        ...settings,
    });

    const useBroadcaster = createUseBroadcaster(broadcaster);

    return {
        broadcaster,
        useBroadcaster,
    };
};
