export function getIphoneInstallContext(userAgent: string, platform: string, touchPoints: number) {
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && touchPoints > 1);
  const isEmbedded = isIOS && (/WhatsApp|Instagram|FBAN|FBAV|GSA|Line\//i.test(userAgent) || !/Safari\//i.test(userAgent));
  const isSafari = isIOS && !isEmbedded && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  return { isIOS, isEmbedded, isSafari };
}