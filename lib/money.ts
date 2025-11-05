export const toCents = (dollars: string | number) =>
    Math.round(Number(dollars) * 100);
    
    
    export const fromCents = (cents: number) => (cents / 100).toFixed(2);
    
    
    export type Denoms = {
    white: number; blue: number; red: number; green: number; black: number;
    };
    
    
    export type ChipCounts = {
    white: number; blue: number; red: number; green: number; black: number;
    };
    
    
    export const chipValue = (counts: ChipCounts, denoms: Denoms) =>
    counts.white * denoms.white +
    counts.blue * denoms.blue +
    counts.red * denoms.red +
    counts.green * denoms.green +
    counts.black * denoms.black;