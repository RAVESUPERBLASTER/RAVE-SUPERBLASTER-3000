
import { PatternData } from '../types';

// Helper to convert visual string to boolean steps
// x = active, . = silent
const p = (str: string): boolean[] => {
    const steps = Array(16).fill(false);
    // Remove spaces and pipes for readability in definitions
    const clean = str.replace(/[\s|]/g, '');
    for (let i = 0; i < 16; i++) {
        if (clean[i] && clean[i].toLowerCase() === 'x') {
            steps[i] = true;
        }
    }
    return steps;
};

// Common Rhythm Dictionary
const RHYTHMS = {
    FOUR_FLOOR:     "x...x...x...x...",
    FOUR_FLOOR_ALT: "x..xx...x..xx...",
    OFFBEAT:        "..x...x...x...x.",
    EIGHTHS:        "x.x.x.x.x.x.x.x.",
    SIXTEENTHS:     "xxxxxxxxxxxxxxxx",
    BACKBEAT:       "....x.......x...",
    GHOST_SNARE:    "..x.x..x..x.x...",
    AMEN_KICK:      "x.x.......xx....",
    AMEN_SNARE:     "....x..x.x.x....",
    CLAVE_SON:      "x..x..x...x.x...",
    CLAVE_RUMBA:    "x..x...x..x.x...",
    UKG_KICK:       "x..x......x..x..",
    UKG_SNARE:      "....x..x....x...",
    DUBSTEP_KICK:   "x.........x.....",
    DUBSTEP_SNARE:  "........x.......",
    EUCLIDEAN_3:    "x....x....x.....",
    EUCLIDEAN_5:    "x..x..x..x..x...",
    TRAP_HATS:      "xxxxxxxxxxxxxxxx", // Logic handles rolls elsewhere
    EMPTY:          "................"
};

type GenrePatternSet = Record<number, Partial<PatternData>[]>;

export interface LegendaryPattern {
    name: string;
    tracks: Record<number, string>; // trackId -> pattern string
}

// --- 99 LEGENDARY PATTERNS ---
export const LEGENDARY_PATTERNS: LegendaryPattern[] = [
    { name: "THE AMEN BREAK", tracks: { 0: "x.x.......xx....", 1: "....x..x.x.x....", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "FUNKY DRUMMER", tracks: { 0: "x..x..x.x.......", 1: "....x..x.x.x....", 2: "xxxx.x.xxxxxxx.x", 5: "....x.......x..." } },
    { name: "IMPEACH PRESIDENT", tracks: { 0: "x.......xx......", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 3: "..............x." } },
    { name: "APACHE", tracks: { 0: "x.........x.....", 1: "....x.......x...", 6: "......x.x.......", 7: "............x..." } },
    { name: "WHEN LEVEE BREAKS", tracks: { 0: "x.x.....x.x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "x.x.x.x.x.x.x.x." } },
    { name: "BLUE MONDAY", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 4: "x.x.x.x.x.x.x.x." } },
    { name: "PLANET ROCK", tracks: { 0: "x..x..x...x.x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 9: "x...x...x...x..." } },
    { name: "TR-808 STATE", tracks: { 0: "x.......x.......", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 9: "x..x..x..x..x..." } },
    { name: "HOUSE CLASSIC", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "..x...x...x...x.", 3: "..x...x...x...x." } },
    { name: "FRENCH TOUCH", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 4: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "MOTORIK BEAT", tracks: { 0: "x.x.x.x.x.x.x.x.", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "................" } },
    { name: "BILLIE JEAN", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 3: "................" } },
    { name: "ROSANNA SHUFFLE", tracks: { 0: "x..x..x...x.x...", 1: "...x..x....x..x.", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "SUCKER MCs", tracks: { 0: "x..x............", 1: "....x..x.x..x...", 2: "................", 5: "....x.......x..." } },
    { name: "IT'S A NEW DAY", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "THINK (ABOUT IT)", tracks: { 0: "x.x.x.x.........", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 3: "..............x." } },
    { name: "HOT PANTS", tracks: { 0: "x...x..x..x.x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 6: "......x........." } },
    { name: "COLD SWEAT", tracks: { 0: "x..x......x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 14: "x..............." } },
    { name: "WALK THIS WAY", tracks: { 0: "x..x..x.x..x....", 1: "....x.......x...", 2: "................", 3: "x.x.x.x.x.x.x.x." } },
    { name: "WE WILL ROCK YOU", tracks: { 0: "x.x.....x.x.....", 1: "................", 5: "....x.......x...", 2: "................" } },
    { name: "ONE MORE TIME", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "AROUND THE WORLD", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 4: "..x...x...x...x.", 5: "....x.......x..." } },
    { name: "STRINGS OF LIFE", tracks: { 0: "x...x...x...x...", 2: "..x...x...x...x.", 3: "..x...x...x...x.", 14: "x..x..x...x....." } },
    { name: "WINDOWLICKER", tracks: { 0: "x...x.....x.....", 1: "........x.......", 2: "x.x.x.x.x.x.x.x.", 12: "x.x.x.x.x.x.x.x." } },
    { name: "SMACK MY BITCH UP", tracks: { 0: "x.x...x.x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "FIRESTARTER", tracks: { 0: "x.x.x...x.x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 10: "x.x............." } },
    { name: "REGULATE (G-FUNK)", tracks: { 0: "x...x.....x.x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "NUTHIN BUT A G THANG", tracks: { 0: "x.........xx....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "x..............." } },
    { name: "STILL D.R.E.", tracks: { 0: "x..x..x...x.....", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx" } },
    { name: "DROP IT LIKE IT'S HOT", tracks: { 0: "x.......x.......", 5: "....x.......x...", 10: "x..x..x..x..x...", 1: "................" } },
    { name: "GRINDIN'", tracks: { 0: "x..x..x..x..x...", 1: "....x.......x...", 5: "....x.......x...", 2: "................" } },
    { name: "IN DA CLUB", tracks: { 0: "x.......xx......", 1: "....x.......x...", 5: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "HEY YA", tracks: { 0: "x...x.....x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "SEVEN NATION ARMY", tracks: { 0: "x...x...x...x...", 4: "x...x...x...x...", 1: "................" } },
    { name: "HARDER BETTER FASTER", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "................", 5: "....x.......x..." } },
    { name: "DANCE YRSELF CLEAN", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 9: "x.x.x.x.x.x.x.x." } },
    { name: "LOSING MY EDGE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "BANQUET", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 3: "..x...x...x...x.", 13: "................" } },
    { name: "TAKE ME OUT", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 14: "x.x............." } },
    { name: "MR. BRIGHTSIDE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "xxxxxxxxxxxxxxxx" } },
    { name: "FEEL GOOD INC", tracks: { 0: "x..x......x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 4: "x.........x....." } },
    { name: "CLINT EASTWOOD", tracks: { 0: "x...x...x.x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "................" } },
    { name: "DARE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "PAPER PLANES", tracks: { 0: "x.........x.....", 1: "....x.......x...", 5: "....x.......x...", 11: "x..............." } },
    { name: "PON DE REPLAY", tracks: { 0: "x..x...x........", 1: "...x.......x....", 5: "...x.......x....", 2: "x.x.x.x.x.x.x.x." } },
    { name: "DEM BOW", tracks: { 0: "x...x...x...x...", 1: "..x...x...x...x.", 2: "x.x.x.x.x.x.x.x.", 6: "x..x..x..x..x..." } },
    { name: "GASOLINA", tracks: { 0: "x...x...x...x...", 1: "..x...x...x...x.", 2: "x.x.x.x.x.x.x.x." } },
    { name: "DESPACITO", tracks: { 0: "x...x...x...x...", 1: "..x...x...x...x.", 2: "x.x.x.x.x.x.x.x.", 14: "................" } },
    { name: "BAILE FUNK", tracks: { 0: "x.......x.......", 1: "..x...x...x.....", 2: "................", 5: "..x...x...x....." } },
    { name: "SOCA RHYTHM", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 6: "..x...x...x...x." } },
    { name: "AFROBEAT", tracks: { 0: "x...x...x...x...", 1: "..x.....x.....x.", 2: "x.x.x.x.x.x.x.x.", 6: "x..x..x..x..x..." } },
    { name: "BOSSA NOVA", tracks: { 0: "x..xx..x..xx..x.", 1: "................", 2: "x.x.x.x.x.x.x.x.", 14: "..x..x...x..x..." } },
    { name: "SAMBA BATUCADA", tracks: { 0: "x...x...x...x...", 1: "................", 2: "x.x.x.x.x.x.x.x.", 6: ".x.x.x.x.x.x.x.x" } },
    { name: "SALSA CLAVE 3-2", tracks: { 0: "................", 1: "................", 14: "x..x..x...x.x...", 9: "x...x...x...x..." } },
    { name: "SALSA CLAVE 2-3", tracks: { 0: "................", 1: "................", 14: "..x.x...x..x..x.", 9: "x...x...x...x..." } },
    { name: "MERENGUE", tracks: { 0: "x...x...x...x...", 1: "x...x...x...x...", 2: "x.x.x.x.x.x.x.x.", 6: "x.x.x.x.x.x.x.x." } },
    { name: "CUMBIA", tracks: { 0: "....x.......x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "x...x...x...x..." } },
    { name: "TANGO", tracks: { 0: "x..x..x.x.......", 1: "x..x..x.x.......", 2: "................", 5: "................" } },
    { name: "WALTZ", tracks: { 0: "x.....x.....x...", 1: "...x.....x......", 2: "................", 5: "................" } },
    { name: "SWING JAZZ", tracks: { 0: "x.......x.......", 1: "................", 2: "....x.......x...", 13: "x..xx...x..xx..." } },
    { name: "BEBOP", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "................", 13: "x..xx...x..xx..." } },
    { name: "DUBSTEP WOBBLE", tracks: { 0: "x.........x.....", 1: "........x.......", 2: "x.x.x.x.x.x.x.x.", 4: "x.x.x.x.x.x.x.x." } },
    { name: "SKRILLEX", tracks: { 0: "x.........x.....", 1: "........x.......", 2: "xxxxxxxxxxxxxxxx", 12: "x..............." } },
    { name: "BURIAL", tracks: { 0: "x..x......x.....", 1: "....x.......x...", 2: "x.x...x.x.x...x.", 14: "x..............." } },
    { name: "AUTONOMIC", tracks: { 0: "x.........x.....", 1: "....x...........", 2: "x.x.x.x.x.x.x.x.", 6: "................" } },
    { name: "FOOTWORK", tracks: { 0: "x..x..x..x..x...", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 5: "x.x.x.x.x.x.x.x." } },
    { name: "JUKE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "..x...x...x...x." } },
    { name: "GHETTO HOUSE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "BALTIMORE CLUB", tracks: { 0: "x..x...x..x...x.", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "JERSEY CLUB", tracks: { 0: "x..x...x..x...x.", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "x...x...x...x..." } },
    { name: "VOGUE BEAT", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "NEW JACK SWING", tracks: { 0: "x..xx...x.x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x.x............." } },
    { name: "POISON", tracks: { 0: "x..x..x...x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "THIS IS HOW WE DO", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "RETURN OF THE MACK", tracks: { 0: "x..x..x...x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 4: "x.x.x.x.x.x.x.x." } },
    { name: "NO DIGGITY", tracks: { 0: "x..x......x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "PONY", tracks: { 0: "x..x......x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "x.x............." } },
    { name: "IGNITION REMIX", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "YEAH!", tracks: { 0: "x...xx....x.xx..", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "GET LOW", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "TURN DOWN FOR WHAT", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 5: "....x.......x..." } },
    { name: "HARLEM SHAKE", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 5: "....x.......x..." } },
    { name: "HOTLINE BLING", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 14: "....x.......x..." } },
    { name: "SICKO MODE", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 5: "....x.......x..." } },
    { name: "OLD TOWN ROAD", tracks: { 0: "x.........x.....", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "BAD GUY", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 5: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "BLINDING LIGHTS", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 3: "................" } },
    { name: "LEVITATING", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "UPTOWN FUNK", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "GET LUCKY", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "HAPPY", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "CAN'T STOP FEELING", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "SHAKE IT OFF", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "SINGLE LADIES", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 5: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "CRAZY IN LOVE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "x.x.x.x.x.x.x.x." } },
    { name: "UMBRELLA", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 12: "x..............." } },
    { name: "TOXIC", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "POKER FACE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "BAD ROMANCE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 4: "x...x...x...x..." } },
    { name: "SANDSTORM", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "INSOMNIA", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "..x...x...x...x.", 4: "..............x." } },
    { name: "BORN SLIPPY", tracks: { 0: "x.x.x.x.x.x.x.x.", 1: "................", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "KERNKRAFT 400", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 5: "....x.......x...", 12: "x...x...x...x..." } },
    { name: "SATISFACTION", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 4: "x...x...x...x..." } },
    { name: "CALL ON ME", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 5: "....x.......x...", 2: "..x...x...x...x." } },
    { name: "RHYTHM IS A DANCER", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "WHAT IS LOVE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 4: "..x...x...x...x." } },
    { name: "BLUE (DA BA DEE)", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "BETTER OFF ALONE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "..x...x...x...x.", 13: "................" } },
    { name: "SCATMAN", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "BARBIE GIRL", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 14: "x.x.x.x.x.x.x.x." } },
    { name: "BOOM BOOM BOOM", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 4: "x...x...x...x..." } },
    { name: "WE LIKE TO PARTY", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 10: "x..............." } },
    { name: "COTTON EYE JOE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 14: "x.x.x.x.x.x.x.x." } },
    { name: "MACARENA", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "MAMBO NO 5", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } },
    { name: "CHA CHA SLIDE", tracks: { 0: "x.......x.......", 5: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 13: "................" } },
    { name: "GANGNAM STYLE", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "PARTY ROCK ANTHEM", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 5: "....x.......x..." } },
    { name: "SEXY AND I KNOW IT", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 5: "....x.......x...", 2: "x.x.x.x.x.x.x.x." } },
    { name: "THRILLER", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 3: "..............x." } },
    { name: "BEAT IT", tracks: { 0: "x...x...x...x...", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "SMELLS LIKE TEEN", tracks: { 0: "x.x.x.x.x.x.x.x.", 1: "x.x.x.x.x.x.x.x.", 2: "x.x.x.x.x.x.x.x.", 12: "x.x.x.x.x.x.x.x." } },
    { name: "ENTER SANDMAN", tracks: { 0: "x.......x.......", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "x..............." } },
    { name: "BACK IN BLACK", tracks: { 0: "x.......x.......", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 12: "................" } },
    { name: "HIGHWAY TO HELL", tracks: { 0: "x.......x.......", 1: "....x.......x...", 2: "xxxxxxxxxxxxxxxx", 12: "................" } },
    { name: "ANOTHER ONE BITES", tracks: { 0: "x.x.x.........x.", 1: "....x.......x...", 2: "x.x.x.x.x.x.x.x.", 5: "....x.......x..." } }
];

const createPatterns = (templates: Record<number, string[]>): GenrePatternSet => {
    const result: GenrePatternSet = {};
    // Updated for 15 Tracks
    for (let trackId = 0; trackId < 15; trackId++) {
        const trackTemplates = templates[trackId] || Array(7).fill(RHYTHMS.EMPTY);
        result[trackId] = trackTemplates.map((patternStr, idx) => ({
            steps: p(patternStr || RHYTHMS.EMPTY),
            variation: idx % 4, 
            pitch: 0,
            pan: 0
        }));
    }
    return result;
};

// --- GENRE DEFINITIONS ---

const P_909 = createPatterns({
    0: [ // Kick
        "x...x...x...x...", "x...x...x...x...", "x...x..xx...x...", "x...x...x...x...", "x...x...x.......", "x...x...x...x...", "x.x.x.x.x.x.x.x."
    ],
    1: [ // Snare
        "....x.......x...", "....x.......x...", "....x.......x.x.", "....x..x....x...", "................", "x.x.x.x.x.x.x.x.", "....x.......x..."
    ],
    2: [ // CH
        "..x...x...x...x.", "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "..x...x...x...x."
    ],
    3: [ // OH
        "..x...x...x...x.", "................", "..x...x...x...x.", "..x...x.........", "................", "................", "..x...x...x...x."
    ],
    9: [ // Cowbell
        "................", "..............x.", "x...x...x...x...", "..............x.", "x.x.x.x.x.x.x.x.", "x...x...x...x...", "................"
    ],
    12: [ // Crash
        "x...............", "................", "x...............", "................", "................", "x...............", "x...x...x...x..."
    ]
});

const P_808 = createPatterns({
    0: [ // Kick (Trap/HipHop)
        "x.........x.....", "x.........x..x..", "x.....x...x.....", "x..x..x..x..x...", "x...............", "x.x.x.x.x.x.x.x.", "x..x..x...x..x.."
    ],
    1: [ // Snare
        "....x.......x...", "....x.......x...", "....x.......x.x.", "....x..x....x...", "................", "x.x.x.x.x.x.x.x.", "....x.......x..."
    ],
    2: [ // CH (Trap rolls often need manual intervention, but we set base)
        "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x.", "xxxx.xxxxxxx.xxx", "x.x.x.x.x.x.x.x.", "................", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x."
    ],
    5: [ // Clap
        "....x.......x...", "....x.......x...", "....x.......x...", "....x.......x...", "....x...x...x...", "x.x.x.x.x.x.x.x.", "....x.......x..."
    ],
    4: [ // Sub Bass
        "x...............", "x.........x.....", "x.......x.......", "x...............", "x.x.............", "x...............", "x...x..........."
    ]
});

const P_JUNGLE = createPatterns({
    0: [ // Kick (Amen-ish)
        "x.x.......xx....", "x.x.......x.....", "x.x.......xx..x.", "x...x...x...x...", "................", "x.x.x.x.x.x.x.x.", "x..x..x..x..x..."
    ],
    1: [ // Snare
        "....x..x.x.x....", "....x.......x...", "....x..x.x.x.xxx", "....x..x.x.x....", "x.x.x.x.x.x.x.x.", "x...............", "....x.......x..."
    ],
    2: [ // CH
        "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x."
    ],
    4: [ // Reese Bass
        "x...............", ".......x........", "x.......x.......", "x...x...x...x...", "x...............", "................", "x..x..x..x..x..x"
    ]
});

const P_GABBER = createPatterns({
    0: [ // Kick (Distorted 4/4)
        "x...x...x...x...", "x.x.x...x...x...", "x...x.x.x...x...", "x.x.x.x.x.x.x.x.", "x...x...x...x...", "x.xx.xx.x.xx.xx.", "x...x...x...x..."
    ],
    2: [ // Hat
        "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "..x...x...x...x."
    ],
    9: [ // Bell
        "................", "x...............", "....x.......x...", "x...x...x...x...", "................", "x.x.x.x.x.x.x.x.", "................"
    ]
});

const P_UKG = createPatterns({
    0: [ // Kick (2-step)
        "x..x......x..x..", "x.........x..x..", "x..x...x..x..x..", "x...............", "................", "x...x...x...x...", "x..x......x....."
    ],
    1: [ // Snare/Rim
        "....x.......x...", "....x..x....x...", "....x.......x.x.", "....x..x....x...", "................", "x...x...x...x...", "....x.......x..."
    ],
    2: [ // CH
        "x.x.x.x.x.x.x.x.", "x...x...x...x...", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x."
    ],
    4: [ // Organ Bass
        "x..x............", "x..x......x.....", "x..x...x........", "x...............", "................", "x...............", "x..x..x..x..x..."
    ],
    13: [ // Vox Chop
        "..............x.", "......x.........", "x...........x...", "................", "x...x...x...x...", "................", "..............x."
    ]
});

const P_TR707 = createPatterns({
    0: [ "x...x...x...x...", "x...x...x...x...", "x...x..xx...x...", "x.x.x.x.x.x.x.x.", "x...............", "x...x...x...x...", "x.x.x.x.x.x.x.x." ],
    1: [ "....x.......x...", "....x.......x...", "....x.......x.x.", "....x..x....x...", "................", "x.x.x.x.x.x.x.x.", "....x.......x..." ],
    9: [ "x...x...x...x...", "..............x.", "x.x.x.x.x.x.x.x.", "..............x.", "x...x...x...x...", "x.x.x.x.x.x.x.x.", "................" ],
    14: [ "................", "x...x...x...x...", "................", "x.x.x.x.x.x.x.x.", "................", "................", "x...x...x...x..." ]
});

const P_ACID = createPatterns({
    0: [ "x...x...x...x...", "x...x...x...x...", "x...x..xx...x...", "x...x...x...x...", "x...x...x...x...", "x.x.x.x.x.x.x.x.", "x...x...x...x..." ],
    2: [ "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "..x...x...x...x.", "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "..x...x...x...x." ],
    4: [ // 303 Bass
         "x..x..x..x..x...", "x.x.x.x.x.x.x.x.", "x...x...x...x...", "x..x.x.x..x.x...", "x................", "x.x.x.x.x.x.x.x.", "x...x.x...x.x..." 
    ]
});

const P_DUBSTEP = createPatterns({
    0: [ "x.........x.....", "x.........x.....", "x.......x.x.....", "x...............", "x...............", "x...x...x...x...", "x..x..x..x..x..." ],
    1: [ "........x.......", "........x.......", "........x..x....", "........x.......", "................", "....x.......x...", "........x......." ],
    2: [ "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x." ],
    4: [ "x...............", "x...............", "x.......x.......", "x.x.x.x.x.x.x.x.", "x...............", "................", "x.x.x.x.x.x.x.x." ]
});

const P_ETHNIC = createPatterns({
    0: [ "x..x..x...x.x...", "x..x...x..x.x...", "x.x.x.x.x.x.x.x.", "x...x...x...x...", "x...............", "x.x.x.x.x.x.x.x.", "x..x..x..x..x..." ],
    1: [ "....x.......x...", "....x.......x...", "....x.......x...", "....x.......x...", "................", "x.x.x.x.x.x.x.x.", "....x.......x..." ],
    2: [ "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x." ],
    6: [ "x..x..x...x.....", "x...x.....x.....", "x.x.x.x.x.x.x.x.", "x...............", "x...............", "x.x.x.x.x.x.x.x.", "x..x..x..x..x..." ]
});

const P_HARDSTYLE = createPatterns({
    0: [ "x...x...x...x...", "x...x...x...x...", "x.x.x.x.x.x.x.x.", "x...x...x...x...", "x...............", "x.xx.xx.x.xx.xx.", "x...x...x...x..." ],
    1: [ "....x.......x...", "....x.......x...", "....x.......x.x.", "....x..x....x...", "................", "x.x.x.x.x.x.x.x.", "....x.......x..." ],
    2: [ "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x." ],
    4: [ "................", "x.x.x.x.x.x.x.x.", "................", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x.", "x.x.x.x.x.x.x.x." ]
});

const GENRE_MAP: Record<string, GenrePatternSet> = {
    'TR-909': P_909,
    'TR-808': P_808,
    'TR-707': P_TR707,
    'LINN-DRUM': P_909, 
    'JUNGLE': P_JUNGLE,
    'MEMPHIS': P_808, 
    'GOA': P_909, 
    'ETHNIC-WORLD': P_ETHNIC,
    'GABBER': P_GABBER,
    'ACID': P_ACID,
    'UK-GARAGE': P_UKG,
    'EURO-DANCE': P_909,
    'HARDSTYLE': P_HARDSTYLE,
    'DUBSTEP': P_DUBSTEP
};

export const getGenrePatterns = (genre: string): GenrePatternSet => {
    return GENRE_MAP[genre] || P_909;
};
