import type { Article } from '@/shared/types';
import { parseArticleFromDom } from '@/lib/readability/article-parser';
import { ensureScripts, getSelectionAndDomFromTab } from './script-injector';

export async function getArticleFromContent(
  tabId: number,
  selection = false
): Promise<Article | null> {
  await ensureScripts(tabId);

  const result = await getSelectionAndDomFromTab(tabId);

  if (!result || !result.dom) {
    return null;
  }

  const article = parseArticleFromDom(result.dom);

  if (selection && result.selection) {
    article.content = result.selection;
  }

  return article;
}
