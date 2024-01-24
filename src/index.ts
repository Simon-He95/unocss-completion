import { createCompletionItem, getActiveText, getCurrentFileUrl, registerCompletionItemProvider } from '@vscode-use/utils'
import { CompletionItemKind, type Disposable, type ExtensionContext, MarkdownString, type Position } from 'vscode'
import { findUpSync } from 'find-up'
import { createGenerator } from '@unocss/core'

import { createConfigLoader as createLoader } from 'unconfig'
import { parser } from './parser'
import { addRemToPxComment, getColorString } from './utils'

// todo: 监听收集过的uno.config 的cwd文件是否发生变化，变化则将路径的cache移除
export async function activate(context: ExtensionContext) {
  const disposes: Disposable[] = []

  const shortcutsCache = new Map()
  init()
  disposes.push(registerCompletionItemProvider(['vue'], async (_: any, position: Position) => {
    const code = getActiveText()
    if (!code)
      return
    const ast = parser(code, position as any)
    if (!ast.tag)
      return

    if (ast.propName !== 'class' && ast.propName !== 'className')
      return

    const [baseCompletion, shortcuts, uno] = await init() || []
    const shortcutsCompletion: any = []
    if (shortcuts) {
      for (const s of shortcuts) {
        const [name, value] = s
        const key = `${name},${value}`
        if (shortcutsCache.has(key)) {
          shortcutsCompletion.push(shortcutsCache.get(key))
          continue
        }
        const { css } = await uno?.generate(value, { preflights: false }) || {}
        const documentation = new MarkdownString()
        documentation.appendCodeblock(css || '', 'css')
        const result = [name, documentation]
        shortcutsCache.set(key, result)

        shortcutsCompletion.push(result)
      }
    }

    return [
      ...baseCompletion,
      ...shortcutsCompletion.map(([content, documentation]: any) => createCompletionItem({
        content,
        documentation,
      })),
    ]
  }, [' ', '"', '\'', '.']))
}

export function deactivate() {

}

async function init() {
  const loader = await getLoader()
  if (loader) {
    const uno = loader ? createGenerator(loader.config) : null
    const prefixPreset = loader?.config.presets.find((item: any) => item.name === '@unocss/preset-attributify')
    const { prefixName, prefixedOnly } = prefixPreset?.options?.prefix || {}
    const shortcuts = loader?.config.shortcuts

    let baseCompletion = await generateBaseCompletion(uno, prefixName)
    if (!prefixedOnly && prefixName)
      baseCompletion = [...baseCompletion, ...await generateBaseCompletion(uno, '')]

    return [baseCompletion, shortcuts, uno]
  }
}

async function parseUnoConfig(cwd: string) {
  const loader = createLoader({
    sources: [
      {
        files: [
          'unocss.config',
          'uno.config',
        ],
      },
    ],
    cwd,
  })

  const result = await loader.load()
  return result
}
const loaderCache = new Map()
async function getLoader() {
  const currentFileUrl = getCurrentFileUrl()!

  const cwd = findUpSync('package.json', {
    cwd: currentFileUrl,
  })

  if (!cwd)
    return

  if (loaderCache.has(cwd))
    return loaderCache.get(cwd)

  const result = await parseUnoConfig(cwd)
  loaderCache.set(cwd, result)

  return result
}

const sizeMap = ['w', 'h', 'top', 'bottom', 'transalate', 'min-w', 'max-w', 'min-h', 'max-h', 'indent', 'text', 'gap', 'spacing', ...['x', 'y'].map((i) => {
  return ['gap', 'p', 'm'].map(_i => `${_i}-${i}`)
}).flat(), ...['t', 'l', 'r', 'b'].map((i) => {
  return ['m', 'p'].map(_i => `${_i}${i}`)
}).flat()]
const prefixMap = [
  'before',
  'after',
  'hover',
  'focus',
  'active',
  'disabled',
  'invalid',
  'checked',
  'required',
  'first',
  'last',
  'odd',
  'even',
  'file',
  'marker',
  'selection',
  'first-line',
  'first-letter',
  'backdrop',
  'md',
  'sm',
  'xl',
  '2xl',
  'lg',
  'dark',
  'ltr',
  'rtl',
  'group-hover',
  'group-focus',
  'group-active',
]
const aspectMap = [
  'aspect-auto',
  'aspect-square',
  'aspect-video',
]
const colorMap = [
  'black',
  'white',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',

]
const textMap = [
  'ellipsis',
  'clip',
  'wrap',
  'nowrap',
  'balance',
  'pretty',
]

const alignMap = [
  'baseline',
  'top',
  'middle',
  'bottom',
  'text-top',
  'ext-bottom',
  'sub',
  'super',
]

const whitespaceMap = [
  'normal',
  'nowrap',
  'pre',
  'pre-line',
  'pre-wrap',
  'break-spaces',
]
const size = []

const border = ['l', 'r', 't', 'b', 'x', 'y', 's', 'e']
const colorPrefix = ['decoration', 'text', 'bg', 'accent', 'from', 'to', 'via', 'fill', 'ring-offset', 'ring', 'outline', 'placeholder', 'shadow', 'stroke', 'caret', 'divide', ...border.map(i => `border-${i}`), ...border.map(i => `divide-${i}`)]
const baseCache = new Map()
async function generateBaseCompletion(uno: any, prefixName: string = '') {
  if (baseCache.has(prefixName))
    return baseCache.get(prefixName)

  const sizeData: any[] = []
  for (const s of sizeMap) {
    const temp: string[] = []
    for (let i = 1; i < 10; i++) {
      temp.push(`${prefixName}${s}-${i}`)
      temp.push(`${prefixName}-${s}-${i}`)
    }

    for (const content of temp) {
      const { css: detail } = await uno?.generate(content, { preflights: false }) || {}
      const css = addRemToPxComment(detail, 16)

      const documentation = new MarkdownString()
      documentation.appendCodeblock(detail, 'css')
      sizeData.push(createCompletionItem({
        content: `${prefixName}${content} ${css}`,
        snippet: `${prefixName}${content}`,
        documentation,
        type: CompletionItemKind.Constant,
      }))
    }

    sizeData.push(createCompletionItem({
      content: `${prefixName}${s}-[]`,
      snippet: `${prefixName}${s}-[$1]$2`,
    }))
  }

  const prefixData = prefixMap.map((p) => {
    return createCompletionItem({
      content: `${p}:`,
      type: CompletionItemKind.Module,
      command: {
        command: 'editor.action.triggerSuggest', // 这个命令会触发代码提示
        title: 'Trigger Suggest',
      },
    })
  })
    ;['max', 'min', 'per', 'area', 'data', 'group', 'supports', 'peer-aria', 'peer-data', 'group-aria', 'group-data'].forEach((i) => {
    prefixData.push(
      createCompletionItem({
        content: `${i}-[]:`,
        snippet: `${i}-[$1]:$2`,
        type: CompletionItemKind.Module,
        commands: {
          command: 'editor.action.triggerSuggest', // 这个命令会触发代码提示
          title: 'Trigger Suggest',
        },
      }),
    )
  })

  const colorData: any = []
  for (const i of ['inherit', 'current', 'transparent']) {
    for (const j of ['text', 'bg']) {
      const content = `${prefixName}${j}-${i}`
      const { css: detail } = await uno?.generate(content, { preflights: false, safelist: false }) || {}
      const documentation = new MarkdownString()
      documentation.appendCodeblock(detail, 'css')
      colorData.push(createCompletionItem({
        content,
        type: CompletionItemKind.Color,
        documentation,
      }))
    }
  }

  for (const c of colorMap) {
    for (const i of colorPrefix) {
      if (c === 'white' || c === 'black') {
        const content = `${prefixName}${i}-${c}`
        const { css: detail } = await uno?.generate(content, { preflights: false }) || {}
        const colorString = getColorString(detail)
        colorData.push(createCompletionItem({
          content: `${content}${colorString ? ` ${colorString}` : ''}`,
          snippet: content,
          type: CompletionItemKind.Color,
          documentation: colorString,
          detail,
        }))
      }
      else {
        for (const j of ['50', '200', '400', '600', '800', '900']) {
          const content = `${prefixName}${i}-${c}-${j}`
          const { css: detail } = await uno?.generate(content, { preflights: false }) || {}
          const colorString = getColorString(detail)

          colorData.push(createCompletionItem({
            content: `${content}${colorString ? ` ${colorString}` : ''}`,
            snippet: content,
            type: CompletionItemKind.Color,
            documentation: colorString,
            detail,
          }))
        }
      }
    }
  }

  const textData = textMap.map(async (t) => {
    const content = `${prefixName}text-${t}`
    const { css: detail } = await uno?.generate(content, { preflights: false }) || {}
    const documentation = new MarkdownString()
    documentation.appendCodeblock(detail, 'css')
    return createCompletionItem({
      content,
      documentation,
      type: CompletionItemKind.Constant,
    })
  })

  const whiteData = whitespaceMap.map(async (t) => {
    const content = `${prefixName}whitespace-${t}`
    const { css: detail } = await uno?.generate(content, { preflights: false }) || {}
    const documentation = new MarkdownString()
    documentation.appendCodeblock(detail, 'css')
    return createCompletionItem({
      content,
      documentation,
      type: CompletionItemKind.Constant,
    })
  })
  const alignData = alignMap.map(async (t) => {
    const content = `${prefixName}align-${t}`
    const { css: detail } = await uno?.generate(content, { preflights: false }) || {}
    const documentation = new MarkdownString()
    documentation.appendCodeblock(detail, 'css')
    return createCompletionItem({ content, documentation })
  })

  const aspectData = aspectMap.map(t => createCompletionItem({ content: `${prefixName}${t}` }))

  const data = await Promise.all([...colorData, ...sizeData, ...prefixData, ...textData, ...alignData, ...whiteData, ...aspectData])

  baseCache.set(prefixName, data)

  return data
}
