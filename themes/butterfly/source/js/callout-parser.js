/**
 * Callout Parser for Hexo - 修复版
 * 解析 Obsidian 风格的 [!TYPE] 语法
 */

(function () {
  'use strict';

  // 图标映射
  const CALLOUT_ICONS = {
    note: '💡',
    tip: '✅',
    hint: '✅',
    warning: '⚠️',
    attention: '⚠️',
    danger: '🚨',
    caution: '⚠️',
    info: 'ℹ️',
    important: '📌',
    abstract: '📋',
    summary: '📋',
    question: '❓',
    faq: '❓',
    example: '📝',
    quote: '💬',
    success: '✅',
    failure: '❌',
    error: '❌',
    bug: '🐛'
  };

  // 默认标题映射
  const CALLOUT_TITLES = {
    note: 'NOTE',
    tip: 'TIP',
    hint: 'HINT',
    warning: 'WARNING',
    attention: 'ATTENTION',
    danger: 'DANGER',
    caution: 'CAUTION',
    info: 'INFO',
    important: 'IMPORTANT',
    abstract: 'ABSTRACT',
    summary: 'SUMMARY',
    question: 'QUESTION',
    faq: 'FAQ',
    example: 'EXAMPLE',
    quote: 'QUOTE',
    success: 'SUCCESS',
    failure: 'FAILURE',
    error: 'ERROR',
    bug: 'BUG'
  };

  // 类型别名（映射到基础样式类型）
  const TYPE_ALIASES = {
    hint: 'tip',
    attention: 'warning',
    caution: 'warning',
    abstract: 'info',
    summary: 'info',
    question: 'warning',
    faq: 'warning',
    example: 'note',
    quote: 'note',
    success: 'tip',
    failure: 'danger',
    error: 'danger',
    bug: 'danger'
  };

  function parseCallouts() {
    const container = document.getElementById('article-container');
    if (!container) return;

    const blockquotes = container.querySelectorAll('blockquote');

    blockquotes.forEach(function (bq) {
      // 跳过已处理的
      if (bq.hasAttribute('data-callout')) return;

      const firstP = bq.querySelector('p');
      if (!firstP) return;

      // 获取纯文本用于匹配
      const fullText = firstP.textContent || '';

      // 匹配 [!TYPE] 或 [!TYPE] 标题
      const match = fullText.match(/^\s*\[!([\w-]+)\](?:\s+(.*))?/i);
      if (!match) return;

      const rawType = match[1].toLowerCase();
      const matchedPart = match[0]; // 整个匹配的部分 "[!TYPE] 标题" 或 "[!TYPE]"
      const customTitle = match[2] ? match[2].trim() : '';

      // 获取基础类型（用于样式）
      const baseType = TYPE_ALIASES[rawType] || rawType;

      // 获取图标和标题
      const icon = CALLOUT_ICONS[rawType] || '📝';
      const title = customTitle || CALLOUT_TITLES[rawType] || rawType.charAt(0).toUpperCase() + rawType.slice(1);

      // 设置 data 属性
      bq.setAttribute('data-callout', baseType);

      // ===== 提取内容 =====
      let contentParts = [];

      // 处理第一个 p 标签中 [!TYPE] 标题 之后的内容
      const firstPHTML = firstP.innerHTML;

      // 移除 [!TYPE] 和标题部分
      // 需要处理 HTML 中可能的换行 <br> 情况
      let remainingContent = firstPHTML;

      // 按 <br> 分割
      const htmlLines = remainingContent.split(/<br\s*\/?>/gi);

      if (htmlLines.length > 0) {
        // 第一行包含 [!TYPE] 标记，需要移除
        const firstLineText = htmlLines[0].replace(/\s*\[![\w-]+\](?:\s+.*)?/i, '').trim();

        // 如果第一行还有其他内容（标题后面的内容）
        if (firstLineText) {
          contentParts.push(firstLineText);
        }

        // 其余行都是内容
        for (let i = 1; i < htmlLines.length; i++) {
          if (htmlLines[i].trim()) {
            contentParts.push(htmlLines[i].trim());
          }
        }
      }

      // 获取其他 p 标签
      const otherPs = bq.querySelectorAll('p:not(:first-child)');
      otherPs.forEach(function (p) {
        contentParts.push(p.innerHTML);
      });

      // 构建内容 HTML
      let contentHTML = '';
      if (contentParts.length > 0) {
        contentHTML = '<div class="callout-content">';
        contentParts.forEach(function (part) {
          contentHTML += '<p>' + part + '</p>';
        });
        contentHTML += '</div>';
      }

      // 重建 blockquote
      bq.innerHTML =
        '<div class="callout-title">' +
        '<span class="callout-title-icon">' + icon + '</span>' +
        '<span class="callout-title-text">' + title + '</span>' +
        '</div>' +
        contentHTML;
    });
  }

  // 执行解析
  function init() {
    parseCallouts();
  }

  // DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // PJAX 支持
  document.addEventListener('pjax:complete', init);

  // 其他 SPA 框架支持
  if (typeof InstantClick !== 'undefined') {
    InstantClick.on('change', init);
  }

})();