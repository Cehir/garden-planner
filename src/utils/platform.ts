// navigator.userAgentData ist (noch) nicht Teil von lib.dom, daher nur die genutzten Felder
interface NavigatorLike {
  userAgent: string
  userAgentData?: { platform: string }
}

/** Erkennt macOS/iOS über userAgentData (Chromium) bzw. den User-Agent – ohne das veraltete navigator.platform. */
export function detectMac(nav: NavigatorLike | undefined): boolean {
  if (!nav) return false
  return /mac/i.test(nav.userAgentData?.platform ?? '') || nav.userAgent.includes('Mac')
}

const isMac = detectMac(typeof navigator === 'undefined' ? undefined : navigator)

export { isMac }
