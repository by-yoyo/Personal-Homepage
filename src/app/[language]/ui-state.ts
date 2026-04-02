/**
 * BackgroundLayer 与 Footer 之间通过 `window.dispatchEvent(new Event(...))`
 * 进行松耦合通信的事件名。
 */
export const BACKGROUND_TOGGLE_EVENT = 'backgroundtoggle';
export const BACKGROUND_REFRESH_EVENT = 'backgroundrefresh';

/**
 * 背景模式的持久化 key（用于服务端 RootLayout 读取初始态）。
 */
export const BACKGROUND_MODE_STORAGE_KEY = 'background-mode';
export const BACKGROUND_MODE_SCENE = 'scene';
export const BACKGROUND_MODE_IMAGE = 'image';

/**
 * 随机背景图接口。
 * - `BackgroundLayer` 内部会在切换/刷新时追加 `?t=${Date.now()}` 来做缓存绕过。
 */
export const BACKGROUND_RANDOM_IMAGE_API = 'https://t.alcy.cc/ysz/';

export type BackgroundMode =
	| typeof BACKGROUND_MODE_SCENE
	| typeof BACKGROUND_MODE_IMAGE;
