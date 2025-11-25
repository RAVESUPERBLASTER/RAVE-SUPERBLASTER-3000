
import { InstrumentType } from '../types';

export interface LibraryItem {
    name: string;
    genre: string;
    type: InstrumentType;
    buffer?: AudioBuffer; // Support for moved samples
    isCustom?: boolean;   // Flag to identify moved samples
}

export interface LibraryCategory {
    id: string;
    label: string;
    items: LibraryItem[];
}

const GENRES = ['TR-909', 'TR-808', 'TR-707', 'LINN-DRUM', 'JUNGLE', 'MEMPHIS', 'GOA', 'ETHNIC-WORLD', 'GABBER', 'ACID', 'UK-GARAGE', 'EURO-DANCE', 'HARDSTYLE', 'DUBSTEP'];

const generateItems = (type: InstrumentType, labelSuffix: string = ''): LibraryItem[] => {
    return GENRES.map(genre => ({
        name: `${genre} ${labelSuffix || type}`,
        genre,
        type
    }));
};

export const SOUND_LIBRARY: LibraryCategory[] = [
    {
        id: 'KICKS',
        label: 'KICKS',
        items: generateItems(InstrumentType.KICK, 'Kick')
    },
    {
        id: 'SNARES',
        label: 'SNARES',
        items: generateItems(InstrumentType.SNARE, 'Snare')
    },
    {
        id: 'HATS',
        label: 'HI-HATS',
        items: [
            ...generateItems(InstrumentType.HIHAT_CLOSED, 'Closed Hat'),
            ...generateItems(InstrumentType.HIHAT_OPEN, 'Open Hat')
        ]
    },
    {
        id: 'PERC',
        label: 'PERCUSSION',
        items: [
            ...generateItems(InstrumentType.CLAP, 'Clap'),
            ...generateItems(InstrumentType.TOM_LOW, 'Low Tom'),
            ...generateItems(InstrumentType.TOM_HI, 'Hi Tom'),
            ...generateItems(InstrumentType.COWBELL, 'Cowbell'),
            ...generateItems(InstrumentType.RIMSHOT, 'Rimshot'),
            ...generateItems(InstrumentType.CRASH, 'Crash'),
            ...generateItems(InstrumentType.RIDE, 'Ride')
        ]
    },
    {
        id: 'BASS',
        label: 'BASS & SYNTH',
        items: [
            ...generateItems(InstrumentType.BASS, 'Bass'),
            ...generateItems(InstrumentType.SYNTH_HIT, 'Synth'),
            ...generateItems(InstrumentType.CHORD, 'Chord'),
            ...generateItems(InstrumentType.LASER, 'Laser'),
            ...generateItems(InstrumentType.FX, 'FX')
        ]
    }
];
