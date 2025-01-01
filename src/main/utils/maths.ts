export function probability(n: number) {
    if(n > 100) throw new RangeError("n must be inferior to 100");
    if(n > 1) n = n/100;
    return !!n && Math.random() <= n;
}

export function randInt(min: number, max: number) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}