'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
	Environment as DreiEnvironment,
	useGLTF,
	useAnimations,
} from '@react-three/drei';
import type { ComponentProps } from 'react';
import React, {
	Component,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type * as THREE from 'three';
import { cn } from '@/lib/utils';
import styles from './threescene.module.css';

// 3D 场景资源（当前使用的为外链固定资源）
const FIRST_GLTF_MODEL_URL =
	'https://files-s3.aur.fan/modules/black-hole.glb';
const SECOND_GLTF_MODEL_URL =
	'https://files-s3.aur.fan/modules/black-hole.glb';
const HDR_ENV_URL = 'https://files-s3.aur.fan/potsdamer_platz_1k.hdr';
const SMALL_MOBILE_BREAKPOINT_PX = 425;
const MOBILE_BREAKPOINT_PX = 768;
const TABLET_BREAKPOINT_PX = 1024;

// 桌面端默认参数（> 1024px）
const FIRST_MODEL_DEFAULT_POSITION: Vec3 = [20, 1, -30];// 模型位置: [x, y, z] -> 右左、上下、前后(深度)
const FIRST_MODEL_DEFAULT_ROTATION: Vec3 = [Math.PI / 6, Math.PI / 9, 0];// 模型旋转(倾斜): [x, y, z]，单位为弧度(rad)
const FIRST_MODEL_DEFAULT_SCALE: Vec3 = [1, 1, 1];// 模型缩放: [x, y, z]，1 为原始大小
const SECOND_MODEL_DEFAULT_POSITION: Vec3 = [-4, -1, -5];
const SECOND_MODEL_DEFAULT_ROTATION: Vec3 = [Math.PI / 9, -Math.PI / 18, 0];
const SECOND_MODEL_DEFAULT_SCALE: Vec3 = [2, 2, 2];

// 平板/小屏桌面默认参数（<= 1024px）
const FIRST_MODEL_TABLET_POSITION: Vec3 = [12, 0.8, -30];
const FIRST_MODEL_TABLET_ROTATION: Vec3 = [Math.PI / 6, Math.PI / 9, 0];
const FIRST_MODEL_TABLET_SCALE: Vec3 = [1, 1, 1];
const SECOND_MODEL_TABLET_POSITION: Vec3 = [-4.5, -1, -5];
const SECOND_MODEL_TABLET_ROTATION: Vec3 = [Math.PI / 9, -Math.PI / 18, 0];
const SECOND_MODEL_TABLET_SCALE: Vec3 = [2, 2, 2];

// 移动端默认参数（<= 768px）
const FIRST_MODEL_MOBILE_POSITION: Vec3 = [11, 0.5, -30];
const FIRST_MODEL_MOBILE_ROTATION: Vec3 = [Math.PI / 6, Math.PI / 9, 0];
const FIRST_MODEL_MOBILE_SCALE: Vec3 = [1, 1, 1];
const SECOND_MODEL_MOBILE_POSITION: Vec3 = [-5, -1, -5];
const SECOND_MODEL_MOBILE_ROTATION: Vec3 = [Math.PI / 9, -Math.PI / 18, 0];
const SECOND_MODEL_MOBILE_SCALE: Vec3 = [2, 2, 2];

// 小屏手机默认参数（<= 425px）
const FIRST_MODEL_SMALL_MOBILE_POSITION: Vec3 = [4.5, 2, -30];
const FIRST_MODEL_SMALL_MOBILE_ROTATION: Vec3 = [Math.PI / 6, Math.PI / 9, 0];
const FIRST_MODEL_SMALL_MOBILE_SCALE: Vec3 = [1, 1, 1];
const SECOND_MODEL_SMALL_MOBILE_POSITION: Vec3 = [-4, -1, -5];
const SECOND_MODEL_SMALL_MOBILE_ROTATION: Vec3 = [Math.PI / 9, -Math.PI / 18, 0];
const SECOND_MODEL_SMALL_MOBILE_SCALE: Vec3 = [2, 2, 2];

type ViewportTier = 'small-mobile' | 'mobile' | 'tablet' | 'default';

type CanvasProps = ComponentProps<typeof Canvas>;

type Vec3 = [number, number, number];

function disposeMaterial(material?: THREE.Material) {
	if (!material) return;
	const mat = material as THREE.Material & Record<string, unknown>;
	const textureKeys = [
		'map',
		'lightMap',
		'aoMap',
		'emissiveMap',
		'bumpMap',
		'normalMap',
		'displacementMap',
		'roughnessMap',
		'metalnessMap',
		'alphaMap',
		'envMap',
	];
	for (const key of textureKeys) {
		const texture = mat[key] as THREE.Texture | undefined;
		texture?.dispose?.();
	}
	material.dispose();
}

export function preloadThreeSceneAssets(
	firstModelUrl: string = FIRST_GLTF_MODEL_URL,
	secondModelUrl: string = SECOND_GLTF_MODEL_URL,
) {
	useGLTF.preload(firstModelUrl);
	useGLTF.preload(secondModelUrl);
}

function isWebGLAvailable(): boolean {
	if (typeof window === 'undefined') return true;
	try {
		const canvas = document.createElement('canvas');
		return !!(
			canvas.getContext('webgl') ??
			canvas.getContext('experimental-webgl')
		);
	} catch {
		return false;
	}
}

function FallbackBackdrop({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				'pointer-events-none bg-cover bg-center bg-no-repeat',
				styles.sceneBackdrop,
				className,
			)}
			aria-hidden
		/>
	);
}

class SceneErrorBoundary extends Component<
	React.PropsWithChildren<{ fallback: React.ReactNode }>,
	{ error: Error | null }
> {
	state = { error: null as Error | null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.warn('[ThreeScene]', error.message, info.componentStack);
	}

	render() {
		if (this.state.error) return this.props.fallback;
		return this.props.children;
	}
}

class ModelErrorBoundary extends Component<
	React.PropsWithChildren<{
		modelName: string;
		modelUrl: string;
		onError?: () => void;
	}>,
	{ error: Error | null }
> {
	state = { error: null as Error | null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error) {
		console.warn(
			`[ThreeScene:${this.props.modelName}] failed to load model: ${this.props.modelUrl}`,
			error,
		);
		this.props.onError?.();
	}

	render() {
		if (this.state.error) return null;
		return this.props.children;
	}
}

function FirstFrameReadyAfterGate({
	gate,
	onReady,
}: {
	gate: boolean;
	onReady: () => void;
}) {
	const didCallRef = useRef(false);

	// 等“闸门”打开（例如第一个模型已挂载）后，等待下一帧再通知 UI 淡入。
	useFrame(() => {
		if (!gate) return;
		if (didCallRef.current) return;
		didCallRef.current = true;
		onReady();
	});

	return null;
}

function WebGLContextLostListener({ onLost }: { onLost: () => void }) {
	const gl = useThree((s) => s.gl);
	useEffect(() => {
		const el = gl.domElement;
		const handler = (e: Event) => {
			e.preventDefault();
			onLost();
		};
		el.addEventListener('webglcontextlost', handler);
		return () => el.removeEventListener('webglcontextlost', handler);
	}, [gl, onLost]);
	return null;
}

function EnvironmentWithCleanup({ files }: { files: string }) {
	const scene = useThree((s) => s.scene);
	useEffect(() => {
		const prevEnvironment = scene.environment;
		const prevBackground = scene.background;

		return () => {
			// drei's Environment 可能会设置 scene.environment（以及可能的 scene.background）
			const env = scene.environment;
			if (
				env &&
				typeof (env as unknown as { dispose?: () => void }).dispose ===
					'function'
			) {
				try {
					(env as unknown as { dispose: () => void }).dispose();
				} catch {
					// ignore
				}
			}
			scene.environment = prevEnvironment;
			scene.background = prevBackground;
		};
	}, [scene]);

	// background: true 表示把加载到的环境贴图设置为可见天空盒（scene.background）
	return <DreiEnvironment files={files} background />;
}

function Model({
	modelUrl,
	modelPosition,
	modelRotation,
	modelScale,
	onLoaded,
}: {
	modelUrl: string;
	modelPosition: Vec3;
	modelRotation: Vec3;
	modelScale: Vec3;
	onLoaded?: () => void;
}) {
	const groupRef = useRef<THREE.Group>(null);
	const { scene, animations } = useGLTF(modelUrl);
	// 即使 URL 相同，也为每个实例克隆独立场景，避免后一个实例“抢走”前一个实例的 object3D
	const sceneClone = useMemo(() => scene.clone(true), [scene]);
	const { actions } = useAnimations(animations, sceneClone);
	// 挂载后播放模型动画（如果存在）

	useEffect(() => {
		const firstAction = Object.values(actions)[0];
		if (firstAction) firstAction.play();
	}, [actions]);

	useEffect(() => {
		// 这个 effect 只会在 useGLTF 成功加载并提交后触发
		console.debug('[ThreeScene] model loaded:', modelUrl);
		onLoaded?.();
	}, [onLoaded, modelUrl]);

	useEffect(() => {
		return () => {
			// 停止正在运行的动画，以释放 mixer 引用。
			try {
				for (const action of Object.values(actions)) {
					action?.stop?.();
				}
			} catch {
				// 忽略
			}
		};
	}, [actions]);

	return (
		<group
			ref={groupRef}
			position={modelPosition}
			rotation={modelRotation}
			scale={modelScale}
		>
			<primitive object={sceneClone} />
		</group>
	);
}

function SceneContent({
	onContextLost,
	onFirstModelLoaded,
	firstModelLoaded,
	onReady,
	onAnyError,
	firstModelUrl,
	firstModelPosition,
	firstModelRotation,
	firstModelScale,
	secondModelUrl,
	secondModelPosition,
	secondModelRotation,
	secondModelScale,
}: {
	onContextLost: () => void;
	onFirstModelLoaded: () => void;
	firstModelLoaded: boolean;
	onReady: () => void;
	onAnyError: () => void;
	firstModelUrl: string;
	firstModelPosition: Vec3;
	firstModelRotation: Vec3;
	firstModelScale: Vec3;
	secondModelUrl: string;
	secondModelPosition: Vec3;
	secondModelRotation: Vec3;
	secondModelScale: Vec3;
}) {
	return (
		<>
			{/* 使用 HDR 天空盒时，不要清空 scene.background */}
			<WebGLContextLostListener onLost={onContextLost} />
			<ambientLight intensity={0.6} />
			<directionalLight position={[5, 10, 5]} intensity={1} />
			<Suspense fallback={null}>
				<ModelErrorBoundary
					modelName='environment'
					modelUrl={HDR_ENV_URL}
					onError={onAnyError}
				>
					<EnvironmentWithCleanup files={HDR_ENV_URL} />
				</ModelErrorBoundary>
			</Suspense>
			<Suspense fallback={null}>
				<ModelErrorBoundary
					modelName='first'
					modelUrl={firstModelUrl}
					onError={onAnyError}
				>
				<Model
					modelUrl={firstModelUrl}
					modelPosition={firstModelPosition}
					modelRotation={firstModelRotation}
					modelScale={firstModelScale}
					onLoaded={onFirstModelLoaded}
				/>
				</ModelErrorBoundary>
			</Suspense>
			<Suspense fallback={null}>
				<ModelErrorBoundary
					modelName='second'
					modelUrl={secondModelUrl}
					onError={onAnyError}
				>
				<Model
					modelUrl={secondModelUrl}
					modelPosition={secondModelPosition}
					modelRotation={secondModelRotation}
					modelScale={secondModelScale}
				/>
				</ModelErrorBoundary>
			</Suspense>
			<FirstFrameReadyAfterGate gate={firstModelLoaded} onReady={onReady} />
		</>
	);
}

export default function ThreeScene({
	className,
	firstModelUrl = FIRST_GLTF_MODEL_URL,
	firstModelPosition,
	firstModelRotation,
	firstModelScale,
	secondModelUrl = SECOND_GLTF_MODEL_URL,
	secondModelPosition,
	secondModelRotation,
	secondModelScale,
	...props
}: CanvasProps & {
	className?: string;
	firstModelUrl?: string;
	firstModelPosition?: Vec3;
	firstModelRotation?: Vec3;
	firstModelScale?: Vec3;
	secondModelUrl?: string;
	secondModelPosition?: Vec3;
	secondModelRotation?: Vec3;
	secondModelScale?: Vec3;
}) {
	const [webglOk, setWebglOk] = useState(() => isWebGLAvailable());
	const [sceneReady, setSceneReady] = useState(false);
	const [firstModelLoaded, setFirstModelLoaded] = useState(false);
	const [viewportTier, setViewportTier] = useState<ViewportTier>('default');
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const sceneRef = useRef<THREE.Scene | null>(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const getResolvedWidth = () => {
			const widths = [
				window.innerWidth,
				document.documentElement.clientWidth,
				window.visualViewport?.width ?? Number.POSITIVE_INFINITY,
			].filter(Number.isFinite) as number[];
			return Math.floor(Math.min(...widths));
		};
		const update = () => {
			const resolvedWidth = getResolvedWidth();
			if (resolvedWidth <= SMALL_MOBILE_BREAKPOINT_PX) {
				setViewportTier('small-mobile');
				return;
			}
			if (resolvedWidth <= MOBILE_BREAKPOINT_PX) {
				setViewportTier('mobile');
				return;
			}
			if (resolvedWidth <= TABLET_BREAKPOINT_PX) {
				setViewportTier('tablet');
				return;
			}
			setViewportTier('default');
		};
		update();
		window.addEventListener('resize', update);
		window.visualViewport?.addEventListener('resize', update);
		window.addEventListener('orientationchange', update);
		return () => {
			window.removeEventListener('resize', update);
			window.visualViewport?.removeEventListener('resize', update);
			window.removeEventListener('orientationchange', update);
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const widths = [
			window.innerWidth,
			document.documentElement.clientWidth,
			window.visualViewport?.width ?? Number.POSITIVE_INFINITY,
		].filter(Number.isFinite) as number[];
		const resolvedWidth = Math.floor(Math.min(...widths));
		console.debug(
			'[ThreeScene] viewport tier:',
			viewportTier,
			'resolvedWidth:',
			resolvedWidth,
			'raw:',
			{
				innerWidth: window.innerWidth,
				clientWidth: document.documentElement.clientWidth,
				visualViewportWidth: window.visualViewport?.width,
			},
		);
	}, [viewportTier]);

	const resolvedFirstModelPosition =
		firstModelPosition ??
		(viewportTier === 'small-mobile'
			? FIRST_MODEL_SMALL_MOBILE_POSITION
			: viewportTier === 'mobile'
				? FIRST_MODEL_MOBILE_POSITION
				: viewportTier === 'tablet'
					? FIRST_MODEL_TABLET_POSITION
				: FIRST_MODEL_DEFAULT_POSITION);
	const resolvedFirstModelRotation =
		firstModelRotation ??
		(viewportTier === 'small-mobile'
			? FIRST_MODEL_SMALL_MOBILE_ROTATION
			: viewportTier === 'mobile'
				? FIRST_MODEL_MOBILE_ROTATION
				: viewportTier === 'tablet'
					? FIRST_MODEL_TABLET_ROTATION
				: FIRST_MODEL_DEFAULT_ROTATION);
	const resolvedFirstModelScale =
		firstModelScale ??
		(viewportTier === 'small-mobile'
			? FIRST_MODEL_SMALL_MOBILE_SCALE
			: viewportTier === 'mobile'
				? FIRST_MODEL_MOBILE_SCALE
				: viewportTier === 'tablet'
					? FIRST_MODEL_TABLET_SCALE
				: FIRST_MODEL_DEFAULT_SCALE);
	const resolvedSecondModelPosition =
		secondModelPosition ??
		(viewportTier === 'small-mobile'
			? SECOND_MODEL_SMALL_MOBILE_POSITION
			: viewportTier === 'mobile'
				? SECOND_MODEL_MOBILE_POSITION
				: viewportTier === 'tablet'
					? SECOND_MODEL_TABLET_POSITION
				: SECOND_MODEL_DEFAULT_POSITION);
	const resolvedSecondModelRotation =
		secondModelRotation ??
		(viewportTier === 'small-mobile'
			? SECOND_MODEL_SMALL_MOBILE_ROTATION
			: viewportTier === 'mobile'
				? SECOND_MODEL_MOBILE_ROTATION
				: viewportTier === 'tablet'
					? SECOND_MODEL_TABLET_ROTATION
				: SECOND_MODEL_DEFAULT_ROTATION);
	const resolvedSecondModelScale =
		secondModelScale ??
		(viewportTier === 'small-mobile'
			? SECOND_MODEL_SMALL_MOBILE_SCALE
			: viewportTier === 'mobile'
				? SECOND_MODEL_MOBILE_SCALE
				: viewportTier === 'tablet'
					? SECOND_MODEL_TABLET_SCALE
				: SECOND_MODEL_DEFAULT_SCALE);

	const handleContextLost = useCallback(() => {
		setSceneReady(false);
		setFirstModelLoaded(false);
		setWebglOk(false);
	}, []);
	const handleAnyResourceError = useCallback(() => {
		// 任一资源失败：整场景降级为静态背景
		setSceneReady(false);
		setFirstModelLoaded(false);
		setWebglOk(false);
	}, []);
	const handleReady = useCallback(() => setSceneReady(true), []);
	const handleFirstModelLoaded = useCallback(
		() => setFirstModelLoaded(true),
		[],
	);
	const handleCanvasCreated = useCallback((state: {
		gl: THREE.WebGLRenderer;
		scene: THREE.Scene;
	}) => {
		rendererRef.current = state.gl;
		sceneRef.current = state.scene;
	}, []);

	// 仅在客户端预加载模型，提升首屏进入时的加载速度
	useEffect(() => {
		if (typeof window === 'undefined') return;
		preloadThreeSceneAssets(firstModelUrl, secondModelUrl);
	}, [firstModelUrl, secondModelUrl]);

	// 卸载 ThreeScene（例如切回图片模式）时主动释放 GPU 与模型缓存。
	useEffect(() => {
		return () => {
			const scene = sceneRef.current;
			if (scene) {
				scene.traverse((object) => {
					const mesh = object as THREE.Mesh & {
						geometry?: THREE.BufferGeometry;
						material?: THREE.Material | THREE.Material[];
					};
					mesh.geometry?.dispose?.();
					if (Array.isArray(mesh.material)) {
						for (const material of mesh.material) disposeMaterial(material);
					} else {
						disposeMaterial(mesh.material);
					}
				});
			}
			const renderer = rendererRef.current;
			if (renderer) {
				try {
					renderer.dispose();
					renderer.forceContextLoss?.();
				} catch {
					// ignore
				}
			}
			sceneRef.current = null;
			rendererRef.current = null;
		};
	}, []);

	if (!webglOk) {
		return (
			<FallbackBackdrop
				className={cn('h-full min-h-100 w-full', className)}
			/>
		);
	}

	const frameClass = cn('relative w-full min-h-[400px]', className);

	return (
		<div className={frameClass}>
			<FallbackBackdrop
				className={cn(
					'absolute inset-0 z-0 min-h-[inherit] h-full w-full transition-opacity duration-700 ease-out',
					sceneReady ? 'opacity-0' : 'opacity-100',
				)}
			/>
			<SceneErrorBoundary
				fallback={
					<FallbackBackdrop className="absolute inset-0 z-10 h-full min-h-[inherit] w-full" />
				}>
				<Canvas
					onCreated={handleCanvasCreated}
					className={cn(
						'absolute inset-0 z-1 h-full w-full touch-none transition-opacity duration-700 ease-out',
						sceneReady ? 'opacity-100' : 'opacity-0',
					)}
					camera={{ position: [0, 1, 3], fov: 45 }}
					dpr={[1, 2]}
					gl={{
						antialias: true,
						alpha: true,
						powerPreference: 'high-performance',
					}}
					{...props}>
					<SceneContent
						onContextLost={handleContextLost}
						onFirstModelLoaded={handleFirstModelLoaded}
						firstModelLoaded={firstModelLoaded}
						onReady={handleReady}
						onAnyError={handleAnyResourceError}
						firstModelUrl={firstModelUrl}
						firstModelPosition={resolvedFirstModelPosition}
						firstModelRotation={resolvedFirstModelRotation}
						firstModelScale={resolvedFirstModelScale}
						secondModelUrl={secondModelUrl}
						secondModelPosition={resolvedSecondModelPosition}
						secondModelRotation={resolvedSecondModelRotation}
						secondModelScale={resolvedSecondModelScale}
					/>
				</Canvas>
			</SceneErrorBoundary>
		</div>
	);
}
