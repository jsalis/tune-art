import { useState, useRef, useEffect } from "react";
import { useCallbackRef } from "londo-ui";

import { clamp } from "../utils/math-util";

const ZOOM_SCALAR = 0.0015;

/**
 * Uses panner controls for moving and scaling a DOM element.
 *
 * @param   {Object}                   [options]
 * @param   {Boolean}                  [options.initAtCenter]
 * @param   {{ x: Number, y: Number }} [options.centerOffset]
 * @param   {Number}                   [options.minZoom]
 * @param   {Number}                   [options.maxZoom]
 * @param   {Function}                 [options.onUpdate]
 * @returns {{
 *     ref: Object,
 *     position: { x: Number, y: Number },
 *     scale: Number,
 * }}
 */
export function usePanner({
    initAtCenter,
    centerOffset = { x: 0, y: 0 },
    minZoom = 0.25,
    maxZoom = 2.5,
    onUpdate,
}) {
    const [isPanning, setIsPanning] = useState(false);
    const ref = useRef(null);
    const position = useRef({ x: 0, y: 0 });
    const scale = useRef(1);
    const handleUpdate = useCallbackRef(onUpdate);

    const onMouseDown = useCallbackRef((event) => {
        if (event.button === 2) {
            setIsPanning(true);
        }
    });

    const onWheel = useCallbackRef((event) => {
        const pointerX = event.pageX - (ref.current?.offsetLeft ?? 0);
        const pointerY = event.pageY - (ref.current?.offsetTop ?? 0);
        const targetX = (pointerX - position.current.x) / scale.current;
        const targetY = (pointerY - position.current.y) / scale.current;
        scale.current = clamp(scale.current + event.deltaY * -ZOOM_SCALAR, minZoom, maxZoom);
        position.current = {
            x: -targetX * scale.current + pointerX,
            y: -targetY * scale.current + pointerY,
        };
        handleUpdate(position.current, scale.current);
    });

    useEffect(() => {
        if (initAtCenter && ref.current) {
            const { width, height } = ref.current.getBoundingClientRect();
            position.current = {
                x: width / 2 - centerOffset.x,
                y: height / 2 - centerOffset.y,
            };
        }
        handleUpdate(position.current, scale.current);
    }, []);

    useEffect(() => {
        ref.current.addEventListener("mousedown", onMouseDown);
        ref.current.addEventListener("wheel", onWheel);
        return () => {
            ref.current?.removeEventListener("mousedown", onMouseDown);
            ref.current?.removeEventListener("wheel", onWheel);
        };
    }, []);

    useEffect(() => {
        if (isPanning) {
            const onMouseMove = (event) => {
                position.current = {
                    x: position.current.x + event.movementX,
                    y: position.current.y + event.movementY,
                };
                handleUpdate(position.current, scale.current);
            };
            const onMouseUp = () => {
                setIsPanning(false);
            };
            document.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
            return () => {
                document.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };
        }
    }, [isPanning, handleUpdate]);

    return { ref, position, scale };
}
