export const BACKGROUND_TOGGLE_EVENT = 'backgroundtoggle';
export const BACKGROUND_REFRESH_EVENT = 'backgroundrefresh';
export const BACKGROUND_MODE_STORAGE_KEY = 'background-mode';
export const BACKGROUND_MODE_SCENE = 'scene';
export const BACKGROUND_MODE_IMAGE = 'image';
export const BACKGROUND_RANDOM_IMAGE_API = 'https://t.alcy.cc/ysz';

export type BackgroundMode =
	| typeof BACKGROUND_MODE_SCENE
	| typeof BACKGROUND_MODE_IMAGE;
