(() => {
  const ignoredSelector = 'pre, code, script, style, textarea, .katex, .no-math'

  const isIgnoredElement = el => el.matches(ignoredSelector) || el.querySelector(ignoredSelector)

  const textFromNode = node => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''

    const el = node
    if (el.matches('.headerlink, script, style, textarea, pre, code, .katex, .no-math')) return ''
    if (el.matches('br')) return '\n'

    return Array.from(el.childNodes).map(textFromNode).join('')
  }

  const mathTextFromElement = el => textFromNode(el).replace(/ /g, ' ').trim()

  const restoreMarkdownEscapedTex = text => text.replace(/(^|[^\\])\\(?=\n)/gm, '$1\\\\')

  const mathTextFromNodes = nodes => {
    return restoreMarkdownEscapedTex(nodes.map((node, index) => {
      const text = mathTextFromElement(node)
      const tagName = node.tagName && node.tagName.toLowerCase()

      if ((tagName === 'h1' || tagName === 'h2') && index < nodes.length - 1) {
        return `${text}\n${tagName === 'h1' ? '=' : '-'}\n`
      }

      return text
    }).join('\n').replace(/\n{3,}/g, '\n\n').trim())
  }

  const normalizeDisplayMath = container => {
    const children = Array.from(container.children)

    for (let i = 0; i < children.length; i++) {
      const current = children[i]
      if (!current || !current.isConnected || isIgnoredElement(current)) continue

      const firstText = mathTextFromElement(current)
      if (!firstText.startsWith('$$')) continue

      const nodes = [current]
      let cursor = i
      let math = mathTextFromNodes(nodes)

      while (!math.endsWith('$$') && cursor < children.length - 1 && nodes.length < 20) {
        cursor += 1
        const next = children[cursor]
        if (!next || isIgnoredElement(next)) break

        nodes.push(next)
        math = mathTextFromNodes(nodes)
      }

      if (!math.endsWith('$$')) continue

      const displayMath = document.createElement('div')
      displayMath.className = 'math-display'
      displayMath.textContent = math
      nodes[0].replaceWith(displayMath)
      nodes.slice(1).forEach(node => node.remove())
      i = cursor
    }
  }

  const showRenderedKatex = container => {
    container.querySelectorAll('.katex').forEach(el => el.classList.add('katex-show'))
  }

  const render = () => {
    const container = document.querySelector('#article-container')
    if (!container || typeof window.renderMathInElement !== 'function') return

    normalizeDisplayMath(container)

    window.renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$', right: '$', display: false }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      ignoredClasses: ['katex', 'no-math'],
      throwOnError: false
    })

    showRenderedKatex(container)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render)
  } else {
    render()
  }

  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', render, 'katexAutoRender')
  } else {
    document.addEventListener('pjax:complete', render)
  }
})()
