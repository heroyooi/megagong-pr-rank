// app/api/rank/route.ts
export const runtime = 'nodejs'; // Puppeteer는 Node.js 런타임 필수
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') ?? '';
  const target = searchParams.get('target') ?? ''; // ex) megagong.net
  const maxPages = Math.min(Number(searchParams.get('pages') ?? '5'), 10); // 옵션: 검색 페이지 수(최대 10)

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  } as const;

  if (!keyword) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400, headers: corsHeaders });
  }
  if (!target) {
    return NextResponse.json({ error: 'target 파라미터(도메인)를 입력해주세요.' }, { status: 400, headers: corsHeaders });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
    );

    // webdriver 감지 우회
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    let currentPage = 1;
    let searchResults: Array<{ title: string; url: string; rank: number }> = [];
    let foundTargetRank: number | null = null;
    let foundTargetUrl: string | null = null;
    let targetTop10Count = 0;

    while (currentPage <= maxPages) {
      const start = (currentPage - 1) * 10;
      const searchURL = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${start}`;

      await page.goto(searchURL, { waitUntil: 'domcontentloaded' });

      const pageResults = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.MjjYud'))
          .map((el) => ({
            title: (el.querySelector('h3') as HTMLElement | null)?.innerText || '제목 없음',
            url: (el.querySelector('a') as HTMLAnchorElement | null)?.href || '',
          }))
          .filter((r) => r.title !== '제목 없음' || r.url !== '');
      });

      pageResults.forEach((r, idx) => {
        (r as any).rank = searchResults.length + 1 + idx;
      });

      searchResults = searchResults.concat(pageResults as any);

      // 누적 결과에서 타겟 도메인 찾기
      const targetResult = searchResults.find((r) => r.url.includes(target));
      targetTop10Count = searchResults.filter((r) => r.url.includes(target) && r.rank <= 10).length;

      if (targetResult) {
        foundTargetRank = targetResult.rank;
        foundTargetUrl = targetResult.url;
        break;
      }

      currentPage++;
    }

    await browser.close();

    return NextResponse.json(
      {
        keyword,
        target,
        activeRank: foundTargetRank ?? 'N/A',
        sourceUrl: foundTargetUrl,
        top10Count: targetTop10Count,
        results: searchResults,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: '검색 순위를 가져오는 중 오류 발생',
        details: error?.message ?? String(error),
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
