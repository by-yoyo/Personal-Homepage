'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import type { Locale } from '@/dictionaries';
import styles from './page.module.css';

const CHAR_MS_ZH = 95;
const CHAR_MS_EN = 55;
const ERASE_MS_ZH = 55;
const ERASE_MS_EN = 40;
const PAUSE_AFTER_WORD_MS = 520;
const PAUSE_AFTER_WHITESPACE_MS = 220;
const PAUSE_BEFORE_ERASE_MS = 420;
const PAUSE_BETWEEN_CHUNKS_MS = 480;
const PAUSE_BEFORE_HIDE_CURSOR_MS = 200;

type FlowStage = 'suffix' | 'erase' | 'full';

function isWhitespaceToken(token: string): boolean {
	return /^\s+$/.test(token);
}

function tokenize(text: string): string[] {
	return text.split(/(\s+)/).filter((seg) => seg.length > 0);
}

function visibleFromTokens(
	tokens: string[],
	tokenIndex: number,
	countInToken: number,
): string {
	let s = '';
	for (let i = 0; i < tokenIndex; i++) s += tokens[i];
	if (tokenIndex < tokens.length) {
		const g = [...tokens[tokenIndex]];
		s += g.slice(0, countInToken).join('');
	}
	return s;
}

type Props = {
	locale: Locale;
	fullText: string;
	suffixFirst: string;
	prefixSecond: string;
};

export function TypewriterWelcome({
	locale,
	fullText,
	suffixFirst,
	prefixSecond,
}: Props) {
	const mountedRef = useRef(true);

	const suffixTokens = useMemo(() => tokenize(suffixFirst), [suffixFirst]);
	const fullTokens = useMemo(() => tokenize(fullText), [fullText]);
	const suffixGraphemes = useMemo(() => [...suffixFirst], [suffixFirst]);

	const charMs = locale === 'zh' ? CHAR_MS_ZH : CHAR_MS_EN;
	const eraseMs = locale === 'zh' ? ERASE_MS_ZH : ERASE_MS_EN;

	const [flow, setFlow] = useState<FlowStage>(
		suffixFirst.length > 0 ? 'suffix' : 'full',
	);
	const [tokenIndex, setTokenIndex] = useState(0);
	const [countInToken, setCountInToken] = useState(0);
	const [eraseLen, setEraseLen] = useState(0);
	const [done, setDone] = useState(false);
	const [showCursor, setShowCursor] = useState(true);

	const typingTokens = flow === 'suffix' ? suffixTokens : fullTokens;

	useEffect(() => {
		let cancelled = false;
		queueMicrotask(() => {
			if (cancelled || !mountedRef.current) return;
			setFlow(suffixFirst.length > 0 ? 'suffix' : 'full');
			setTokenIndex(0);
			setCountInToken(0);
			setEraseLen(0);
			setDone(false);
			setShowCursor(true);
		});
		return () => {
			cancelled = true;
		};
	}, [fullText, suffixFirst, prefixSecond]);

	/** 擦除后缀 */
	useEffect(() => {
		if (done || flow !== 'erase') return;

		if (eraseLen > 0) {
			const t = window.setTimeout(
				() => setEraseLen((n) => n - 1),
				eraseMs,
			);
			return () => window.clearTimeout(t);
		}

		const t = window.setTimeout(() => {
			setFlow('full');
			setTokenIndex(0);
			setCountInToken(0);
		}, PAUSE_BETWEEN_CHUNKS_MS);
		return () => window.clearTimeout(t);
	}, [flow, eraseLen, eraseMs, done]);

	/** 后缀 / 整句 打字 */
	useEffect(() => {
		if (done) return;
		if (flow === 'erase') return;

		if (typingTokens.length === 0) {
			const t = window.setTimeout(() => {
				if (flow === 'suffix') {
					if (prefixSecond.length === 0) {
						setShowCursor(false);
						setDone(true);
					} else {
						setFlow('erase');
						setEraseLen(suffixGraphemes.length);
					}
				} else {
					setShowCursor(false);
					setDone(true);
				}
			}, flow === 'suffix' ? PAUSE_BETWEEN_CHUNKS_MS : PAUSE_BEFORE_HIDE_CURSOR_MS);
			return () => window.clearTimeout(t);
		}

		const token = typingTokens[tokenIndex];
		if (token === undefined) {
			queueMicrotask(() => {
				if (!mountedRef.current) return;
				setShowCursor(false);
				setDone(true);
			});
			return;
		}

		const gLen = [...token].length;
		const spaceTok = isWhitespaceToken(token);
		const isLastToken = tokenIndex >= typingTokens.length - 1;

		if (countInToken < gLen) {
			const t = window.setTimeout(
				() => setCountInToken((c) => c + 1),
				charMs,
			);
			return () => window.clearTimeout(t);
		}

		function advanceChunkOrFinish() {
			if (!isLastToken) {
				setTokenIndex((i) => i + 1);
				setCountInToken(0);
				return;
			}
			if (flow === 'suffix') {
				if (prefixSecond.length === 0) {
					setShowCursor(false);
					setDone(true);
				} else {
					setFlow('erase');
					setEraseLen(suffixGraphemes.length);
				}
			} else {
				setShowCursor(false);
				setDone(true);
			}
		}

		let delay: number;
		if (!isLastToken) {
			delay = spaceTok ? PAUSE_AFTER_WHITESPACE_MS : PAUSE_AFTER_WORD_MS;
		} else if (flow === 'suffix' && prefixSecond.length > 0) {
			delay = spaceTok
				? PAUSE_AFTER_WHITESPACE_MS + PAUSE_BEFORE_ERASE_MS
				: PAUSE_AFTER_WORD_MS + PAUSE_BEFORE_ERASE_MS;
		} else {
			delay = PAUSE_BEFORE_HIDE_CURSOR_MS;
		}

		const t = window.setTimeout(advanceChunkOrFinish, delay);
		return () => window.clearTimeout(t);
	}, [
		tokenIndex,
		countInToken,
		typingTokens,
		charMs,
		flow,
		prefixSecond.length,
		done,
		suffixGraphemes.length,
	]);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	let visible = '';
	if (flow === 'suffix') {
		visible = visibleFromTokens(suffixTokens, tokenIndex, countInToken);
	} else if (flow === 'erase') {
		visible = suffixGraphemes.slice(0, eraseLen).join('');
	} else {
		visible = visibleFromTokens(fullTokens, tokenIndex, countInToken);
	}

	return (
		<p className={styles.typeLine}>
			<span className={styles.visuallyHidden}>{fullText}</span>
			<span
				className={styles.typeVisible}
				aria-hidden='true'>
				{visible}
				{showCursor && !done ? (
					<span
						className={styles.cursorChar}
						aria-hidden>
						_
					</span>
				) : null}
			</span>
		</p>
	);
}
