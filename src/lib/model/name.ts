/**
 * The app opens straight after sign-in, before the carer has said what they call the person, so a
 * new circle starts as "them" until a name is added. These keep the wording right either way.
 */
export const UNNAMED = 'them';

export const isUnnamed = (name: string): boolean => name.trim() === '' || name === UNNAMED;

/** "Mum's" or "their". */
export const possessive = (name: string, apostrophe = "'"): string => (isUnnamed(name) ? 'their' : `${name}${apostrophe}s`);

/** For a title or the start of a sentence: "Mum" or "Them". */
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
