export interface StopDataType {
    type: string,
    params: {
        stopCode: string
    };
    users: string[]
}

export interface AlertDataType {
    type: 'stop' | 'line',
    stops: Stop | null,
    lines: string | null
    messages: {
        subject: string,
        body: string,
        category: string,
        subcategory: string,
    }[]
}

export interface Stop {
    stopCode: string,
    stopName: string
}

export interface Props {
    subscription: string, 
    topic: string, 
    data: StopDataType | undefined, 
    message: any, 
    subscribedUsers: string[]
}
