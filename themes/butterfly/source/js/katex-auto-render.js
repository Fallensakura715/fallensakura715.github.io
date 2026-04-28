(() => {
  const normalizeDisplayMath = container => {
    const children = Array.from(container.children);

    for (let i = 0; i < children.length; i++) {
      const current = children[i];
      if (!current || current.querySelector('.katex')) continue;

      const firstText = current.textContent.trim();
      if (!firstText.startsWith('$$')) continue;

      const nodes = [current];
      const parts = [firstText];
      let cursor = i;

      while (!parts.join('\n').trim().endsWith('$$') && cursor < children.length - 1 && nodes.length < 20) {
        cursor += 1;
        const next = children[cursor];
        nodes.push(next);
        parts.push(next.textContent.trim());
      }

      const math = parts.join('\n').trim();
      if (!math.endsWith('$$')) continue;

      const displayMath = document.createElement('div');
      displayMath.className = 'math-display';
      displayMath.textContent = math;
      nodes[0].replaceWith(displayMath);
      nodes.slice(1).forEach(node => node.remove());
      i = cursor;
    }
  };

  const render = () => {
    const container = document.querySelector('#article-container');
    if (!container || typeof window.renderMathInElement !== 'function') return;

    normalizeDisplayMath(container);

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
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  document.addEventListener('pjax:complete', render);
})();
