export interface StopParams {
    type: 'stop',
    stopCode: string
}

export interface TripParams {
    type: 'trip'
    from: string,
    to: string
}
