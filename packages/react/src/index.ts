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
 * export const { useBroadcaster } = createBroadcaster({
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
 * @see{@link BroadcasterSettings}
 * @returns broadcaster hooks
 */
export const createBroadcaster = <Payload, Metadata>(
    settings: BroadcasterSettings<Payload, Metadata>,
): ReactBroadcasterFactoryReturnType<Payload, Metadata> => {
    let broadcaster:Broadcaster<Payload, Metadata> | undefined = undefined;

    /**
     * Destroys Broadcasters connection with note to other instances
     *
     * @param event
     * @returns
     */
    const closeBeforeUnload = (event: BeforeUnloadEvent): void => {
        event.preventDefault();
        event.stopPropagation();

        broadcaster?.close();

        return undefined;
    };

    // register browser based event listeners
    broadcaster = new Broadcaster<Payload, Metadata>({
        ...settings,
        on: {
            init:(broadcasterInstance): void => {
                window.addEventListener("beforeunload", closeBeforeUnload);
                settings.on?.init?.(broadcasterInstance);
            },
            close: (broadcasterInstance): void => {
                window.removeEventListener("beforeunload", closeBeforeUnload);
                settings.on?.close?.(broadcasterInstance);
            }
        }
    });

    const useBroadcaster = createUseBroadcaster(broadcaster);

    return {
        broadcaster,
        useBroadcaster,
    };
};
