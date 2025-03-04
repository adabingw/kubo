import { RefObject, useEffect, useState } from "react";


/**
 * Hook that alerts clicks outside of the passed ref
 */
export const useClickOutside = (ref: RefObject<HTMLDivElement>, inputRef: RefObject<HTMLInputElement>) => {
    const [ clickOutside, setClickOutside ] = useState(false);
    useEffect(() => {
      /**
       * Alert if clicked outside of element
       */
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node) && 
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setClickOutside(true);
            }
        }
        // Bind the event listener
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);

    return { clickOutside, setClickOutside };
}
