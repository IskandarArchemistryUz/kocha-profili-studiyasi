/** Ilova ichidagi brauzerlar (Instagram, Telegram, Facebook, Chrome iOS…) va kengaytmalar oʻzi qoʻshadigan skript xatolari.
 *  Ular bizning koddan emas — egasi panelidagi «Xatolar»ga yozilmaydi. */
const FOREIGN_ERR = /WebViewJavascriptBridge|__gCrWeb|__firefox__|_AutofillCallbackHandler|instantSearchSDKJSBridge|ucapi|MetaMask|zaloJSV2/i;

export const isForeignErr = (m: string): boolean => FOREIGN_ERR.test(m);
