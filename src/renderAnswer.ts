import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Answers can come straight from an upstream README or a picked file, so they are not trusted.
 * Their images are relative to that repository, which is not where this app is served from.
 */
export const renderAnswer = (markdown: string, repo: string): string => {
  const html = marked.parse(markdown, { async: false }) as string;
  const root = document.createElement('div');
  root.append(DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true }));

  for (const image of root.querySelectorAll('img')) {
    const src = image.getAttribute('src');
    if (src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src)) {
      const path = src.replace(/^(?:\.?\/)+/, '');
      image.src = `https://raw.githubusercontent.com/${repo}/master/${path}`;
    }
  }

  return root.innerHTML;
};
