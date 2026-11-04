/** Saving a chart as an image. It uses the browser's own canvas, so there is no extra library and nothing leaves the phone. */
export function pngSupported(): boolean {
  return typeof document !== 'undefined' && typeof Image !== 'undefined' && typeof XMLSerializer !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined' && typeof HTMLCanvasElement.prototype.toBlob === 'function'
}

/** The chart colours are CSS variables, which do not exist once the SVG is drawn on its own, so they are filled in first. */
export function resolveCssVars(markup: string, read: (name: string) => string): string {
  return markup.replace(/var\((--[a-z0-9-]+)\)/gi, (_m, name: string) => read(name) || '#888888')
}

export async function svgToPngBlob(svg: SVGSVGElement, title: string, scale = 2): Promise<Blob> {
  if (!pngSupported()) throw new Error('This browser cannot save images.')
  const vb = svg.viewBox.baseVal
  const w = vb && vb.width ? vb.width : svg.clientWidth || 320
  const h = vb && vb.height ? vb.height : svg.clientHeight || 160
  const css = getComputedStyle(document.documentElement)
  const read = (n: string) => css.getPropertyValue(n).trim()
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(w))
  clone.setAttribute('height', String(h))
  const markup = resolveCssVars(new XMLSerializer().serializeToString(clone), read)
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  const img = new Image()
  await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error('The chart could not be drawn.')); img.src = url })
  const pad = 16
  const head = 28
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((w + pad * 2) * scale)
  canvas.height = Math.round((h + pad * 2 + head) * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot save images.')
  ctx.scale(scale, scale)
  ctx.fillStyle = read('--card') || '#ffffff'
  ctx.fillRect(0, 0, w + pad * 2, h + pad * 2 + head)
  ctx.fillStyle = read('--tx') || '#111111'
  ctx.font = '600 15px -apple-system, system-ui, sans-serif'
  ctx.fillText(title, pad, pad + 14)
  ctx.drawImage(img, pad, pad + head, w, h)
  return new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Could not create the image.'))), 'image/png'))
}
