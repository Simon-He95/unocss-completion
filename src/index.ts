import { createCompletionItem, getCurrentFileUrl, jumpToLine } from '@vscode-use/utils'
import type { Disposable, ExtensionContext } from 'vscode'
import { findUpSync } from 'find-up'

import { createConfigLoader as createLoader } from 'unconfig'

export async function activate(context: ExtensionContext) {
  const disposes: Disposable[] = []

  // disposes.push(registerCompletionItemProvider(['vue'], async (document, position) => {
  //   const code = getActiveText()
  //   if (!code)
  //     return
  //   const ast = parser(code, position as any)
  //   if (!ast.tag)
  //     return

  //   if (ast.propName !== 'class' && ast.propName !== 'className')
  //     return

  //   const loader = await getLoader()
  //   const shortcuts = loader?.config.shortcuts
  //   const shortcutsCompletion: any[] = []
  //   const baseCompletion = generateBaseCompletion()
  //   if (shortcuts) {
  //     shortcuts.forEach((s: any) => {
  //       const [name, value] = s
  //       shortcutsCompletion.push(name)
  //     })
  //   }
  //   const prefixPreset = loader?.config.presets.find((item: any) => item.name === '@unocss/preset-attributify')

  //   if (prefixPreset) {
  //     const prefixName = prefixPreset.options.prefix
  //   }

  //   return [
  //     ...baseCompletion,
  //     ...shortcutsCompletion.map(completion => createCompletionItem({
  //       content: completion
  //     }))
  //   ]
  // }, [' ', '"', '\'', '.']))

  // addEventListener('text-change',()=>{

  // })
  setTimeout(() => {
    jumpToLine(10)
  }, 1000)
  context.subscriptions.push(...disposes)
}

export function deactivate() {

}

async function parseUnoConfig(cwd: string) {
  const loader = createLoader<U>({
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

function getLoader() {
  const currentFileUrl = getCurrentFileUrl()!
  const cwd = findUpSync('package.json', {
    cwd: currentFileUrl,
  })

  if (!cwd)
    return

  return parseUnoConfig(cwd)
}

const sizeMap = ['w', 'h', 'top', 'bototm', 'transalate', 'min-w', 'max-w', 'min-h', 'max-h', 'indent']
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
  'gap',
  'gapx',
  'gapy',
  ...['x', 'y'].map((i) => {
    return ['gap'].map(_i => `${_i}${i}`)
  }).flat(),
  ...['t', 'l', 'r', 'b'].map((i) => {
    return ['m', 'p'].map(_i => `${_i}${i}`)
  }).flat(),
]
const otherMap = [
  'bg',
  'text',

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

function generateBaseCompletion() {
  const sizeData = sizeMap.map((s) => {
    const temp: string[] = []
    for (let i = 1; i < 10; i++) {
      temp.push(`${s}-${i}`)
      temp.push(`-${s}-${i}`)
    }
    const r = temp.map(t => createCompletionItem({
      content: t,
    }))

    return [...r, createCompletionItem({
      content: `${s}-[]`,
      snippet: `${s}-[$1]$2`,
    })]
  }).flat()

  const prefixData = prefixMap.map((p) => {
    return createCompletionItem({
      content: `${p}:`,
    })
  })

  const textData = textMap.map((t) => {
    return createCompletionItem({
      content: `text-${t}`,
    })
  })

  const whiteData = whitespaceMap.map(t => createCompletionItem({ content: `whitespace-${t}` }))
  const alignData = alignMap.map(t => createCompletionItem({ content: `align-${t}` }))

  return [...sizeData, ...prefixData, ...textData, ...alignData, ...whiteData]
}
