import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, isValidLocale } from '@/dictionaries';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

/**
 * i18n middleware that redirects to the appropriate language version
 * Shows language in URL path for better UX and SEO
 */
export default function i18nMiddleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  
  const pathSegments = pathname.split('/').filter((segment) => segment !== '');
  const firstSegment = pathSegments[0];
  /*
  if (isValidLocale(firstSegment)) {
    return NextResponse.next();
  }
  */

	if (isValidLocale(firstSegment)) {
		// 如果是 /{locale} 格式（只有语言段），重定向到 /{locale}/profile
		if (pathSegments.length === 1) {
			// 只有语言段，没有其他路径
			const redirectUrl = req.nextUrl.clone();
			redirectUrl.pathname = `/${firstSegment}/profile`;
			redirectUrl.search = search;
			return NextResponse.redirect(redirectUrl);
		}
		// 其他情况（如 /{locale}/profile, /{locale}/about 等）正常处理
		return NextResponse.next();
	}
  
  // Get preferred language from browser
  const acceptLanguage = req.headers.get('accept-language') || '';
  const negotiator = new Negotiator({
    headers: { 'accept-language': acceptLanguage },
  });
  
  try {
    const languages = negotiator.languages();
    const matchedLocale = match(
			languages,
			locales as unknown as string[],
			defaultLocale,
		);
    
    // Create redirect URL with locale
    const redirectUrl = req.nextUrl.clone();
    if (pathname === '/') {
			redirectUrl.pathname = `/${matchedLocale}/profile`;
		} else {
			redirectUrl.pathname = `/${matchedLocale}${pathname}`;
		}
    
    // Preserve query parameters
    redirectUrl.search = search;
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Language detection failed:', error);
    
    // Fallback to default locale
    const fallbackUrl = req.nextUrl.clone();
    fallbackUrl.pathname = pathname === '/' ? `/${defaultLocale}/profile` : `/${defaultLocale}${pathname}`;
    fallbackUrl.search = search;
    
    return NextResponse.redirect(fallbackUrl);
  }
}
