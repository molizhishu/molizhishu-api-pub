'use client';

import React, { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Check, Copy, X } from 'lucide-react';
import 'highlight.js/styles/github-dark.css';

type MarkdownContentProps = {
  content: string;
  className?: string;
};

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [code]);

  return (
    <button className="markdownCopyButton" onClick={handleCopy} type="button" aria-label="复制代码">
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? '已复制' : '复制'}</span>
    </button>
  );
}

const languageMap: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  json: 'JSON',
  md: 'Markdown',
  markdown: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  yaml: 'YAML',
  yml: 'YAML',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  sql: 'SQL',
  php: 'PHP',
  python: 'Python',
  py: 'Python',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++'
};

const components: Components = {
  a: ({ ...props }) => (
    <a
      {...props}
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noreferrer noopener' : undefined}
    />
  ),
  img: ({ ...props }) => <img {...props} loading="lazy" />,
  pre: ({ children, ...props }) => {
    const codeChild = React.Children.toArray(children).find(
      (child) => React.isValidElement(child) && child.type === 'code'
    ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined;

    const className = codeChild?.props?.className || '';
    const lang = className.match(/language-(\S+)/)?.[1] ?? '';
    const langLabel = languageMap[lang] ?? (lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : '');
    const code = codeChild ? extractText(codeChild.props.children) : '';
    const lines = code.split('\n');
    const lineCount = lines.length > 0 && lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;

    return (
      <div className="markdownCodeBlock">
        <div className="markdownCodeHeader">
          <span className="markdownCodeDots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="markdownCodeLang">{langLabel}</span>
          <CodeCopyButton code={code} />
        </div>
        <div className="markdownCodeBody">
          <div className="markdownCodeLines" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </div>
          <pre {...props}>{children}</pre>
        </div>
      </div>
    );
  }
};

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const onClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setLightbox({ src: img.src, alt: img.alt || '' });
    }
  }, []);

  const markdown = useMemo(() => content || '', [content]);

  return (
    <>
      <div className={`markdownContent ${className}`.trim()} onClick={onClick}>
        <ReactMarkdown
          components={components}
          rehypePlugins={[
            rehypeRaw,
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: 'wrap' }],
            rehypeHighlight
          ]}
          remarkPlugins={[remarkGfm]}
        >
          {markdown}
        </ReactMarkdown>
      </div>

      {lightbox && (
        <div className="markdownLightbox" onClick={() => setLightbox(null)}>
          <button className="markdownLightboxClose" type="button" onClick={() => setLightbox(null)} aria-label="关闭">
            <X size={22} />
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(event) => event.stopPropagation()}
          />
          {lightbox.alt && <p>{lightbox.alt}</p>}
        </div>
      )}
    </>
  );
}
