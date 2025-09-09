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
  // ✅ Top10만 확인하므로 페이지는 고정 1
  const maxPages = 1;

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

    const start = 0;
    const searchURL = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&start=${start}&num=10&hl=ko&gl=KR`;

    await page.goto(searchURL, { waitUntil: 'domcontentloaded' });

    // 페이지에서 결과 수집
    const pageResults: Array<{ title: string; url: string }> = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.MjjYud'));
      // document.querySelectorAll('a h3') // 광고/리치결과 때문에 섞이는 경우가 있으면, 선택자를 조금 더 좁혀서
      const items = nodes.map((el) => ({
        title: (el.querySelector('h3') as HTMLElement | null)?.innerText || '제목 없음',
        url: (el.querySelector('a') as HTMLAnchorElement | null)?.href || '',
      }));
      return items.filter((r) => r.title !== '제목 없음' && r.url);
    });

    const top10 = pageResults.slice(0, 10).map((r, idx) => ({
      title: r.title,
      url: r.url,
      rank: idx + 1,
    }));

    const targetHit = top10.find((r) => r.url.includes(target)) || null;
    const foundTargetRank = targetHit ? targetHit.rank : null;
    const foundTargetUrl = targetHit ? targetHit.url : null;

    const targetTop10Count = top10.filter((r) => r.url.includes(target)).length;

    await browser.close();

    return NextResponse.json(
      {
        keyword,
        target,
        activeRank: foundTargetRank ?? null,
        sourceUrl: foundTargetUrl ?? null,
        top10Count: targetTop10Count,
        results: top10,
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
