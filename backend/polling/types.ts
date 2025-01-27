interface Subscriptions {
    flight: Flight[]
}

interface Flight {
    num: string
    token: string
    cabin: CabinType
    from: string
    to: string
    date: string
    subscribers: User[]
}

interface User {
    uuid: string
}

type CabinType = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST"
