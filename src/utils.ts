const matchCssVarNameRegex = /var\((?<cssVarName>--[^,|)]+)(?:,\s*(?<fallback>[^)]+))?\)/gm
const cssColorRegex = /(?:#|0x)(?:[a-f0-9]{3}|[a-f0-9]{6})\b|(?:rgb|hsl)a?\(.*\)/gm
export function getColorString(str: string) {
  let colorString = str.match(cssColorRegex)?.[0] // e.g rgb(248 113 113 / var(--maybe-css-var))

  if (!colorString)
    return

  const cssVars = getCssVariables(str)

  // replace `var(...)` with its value
  for (const match of colorString.matchAll(matchCssVarNameRegex)) {
    const matchedString = match[0]
    const cssVarName = match.groups?.cssVarName
    const fallback = match.groups?.fallback

    if (cssVarName && cssVars.get(cssVarName))
      // rgb(248 113 113 / var(--un-text-opacity)) => rgb(248 113 113 / 1)
      colorString = colorString.replaceAll(matchedString, cssVars.get(cssVarName) ?? matchedString)
    else if (fallback)
      // rgb(248 113 113 / var(--no-value, 0.5)) => rgb(248 113 113 / 0.5)
      colorString = colorString.replaceAll(matchedString, fallback)

    // rgb(248 113 113 / var(--no-value)) => rgba(248 113 113)
    colorString = colorString.replaceAll(/,?\s+var\(--.*?\)/gm, '')
  }

  // if (!(new TinyColor(colorString).isValid))
  //   return

  return colorString
}

function getCssVariables(code: string) {
  const regex = /(?<key>--\S+?):\s*(?<value>.+?)\s*[!;]/gm
  const cssVariables = new Map<string, string>()
  for (const match of code.matchAll(regex)) {
    const key = match.groups?.key
    if (key)
      cssVariables.set(key, match.groups?.value ?? '')
  }

  return cssVariables
}

export function addRemToPxComment(str?: string, remToPixel = 16) {
  if (!str)
    return ''
  const rem = str.match(/(-?[\d.]+)rem(\s+\!important)?;/)
  if (!rem)
    return
  const px = ` /* ${Number.parseFloat(rem[1]) * remToPixel}px */`

  return px
}
