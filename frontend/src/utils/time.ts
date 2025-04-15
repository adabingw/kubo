export const calcTime = (t: string | number): string => {
    const timestamp = new Date(t).getTime();
    const now = Date.now();
    const deltaSeconds = Math.floor(Math.abs(now - timestamp) / 1000);

    const minutes = Math.floor(deltaSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (deltaSeconds < 60) {
        return `${deltaSeconds} second${deltaSeconds == 1 ? '' : 's'}`;
    } else if (minutes < 60) {
        return `${minutes} minute${minutes == 1 ? '' : 's'}`;
    } else if (hours < 24) {
        return `${hours} hour${hours == 1 ? '' : 's'}`;
    } else {
        return `${days} day${days == 1 ? '' : 's'}`;
    }
}
