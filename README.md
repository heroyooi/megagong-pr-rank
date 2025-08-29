# 📊 Megagong PR rank (메가공 PR 랭킹)

Google 검색 순위 및 트렌드 데이터를 수집/시각화하는 Next.js 기반 프로젝트입니다.  
메가공무원(`megagong.net`)과 같은 특정 도메인의 검색 순위를 추적하거나, Google Trends 데이터를 가져와 **실시간 대시보드** 형태로 확인할 수 있습니다.

---

## 🚀 기술 스택

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router + Pages Router 혼합 가능)
- **Language**: TypeScript
- **UI**: React 19 + SCSS
- **Chart**: [ECharts](https://echarts.apache.org/) + `echarts-for-react`
- **Crawler**: Puppeteer (Google 검색 결과 스크래핑)
- **API**: Google Trends API (`google-trends-api`)
- **Database**: Firebase (Firestore / Realtime Database)

---

## 📂 프로젝트 구조

```bash
megagong-gtrends/
├── app/                  # (App Router 기반 API 및 페이지)
│   └── api/
│       └── rank/
│           └── route.ts  # Google 검색 순위 체크 API (App Router)
├── pages/                # (Pages Router 페이지 및 API)
│   └── api/
│       └── rank.ts       # Google 검색 순위 체크 API (Pages Router)
├── public/               # 정적 파일
├── styles/               # SCSS 스타일
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 API 사용법
검색 순위 조회 API

- 엔드포인트 (App Router)

```bash
GET /api/rank?keyword=검색어&target=도메인&pages=5
```
    - keyword: 검색 키워드 (필수)
    - target: 매칭할 도메인 (필수)
    - pages: 최대 검색 페이지 수 (선택, 기본 5, 최대 10)

- 응답 예시
```json
{
  "keyword": "공무원",
  "target": "megagong.net",
  "activeRank": 12,
  "sourceUrl": "https://www.megagong.net/some/page",
  "top10Count": 1,
  "results": [
    {
      "title": "메가공무원 - 공무원 인강 1위",
      "url": "https://www.megagong.net/",
      "rank": 1
    }
  ]
}
```

## 크롤링
```js
while (currentPage <= 5) {
  const searchURL = `https://www.google.com/search?q=${encodeURIComponent(
    keyword
  )}&start=${(currentPage - 1) * 10}`;
  ...
}
```
- currentPage <= 5 로 되어 있어서, 구글 검색결과 5페이지까지 확인
- 구글은 한 페이지당 기본 10개 검색결과를 보여주니까 → 5페이지 × 10개 = 최대 50개 결과까지 수집하는 구조
- 그 안에서만 rank 값을 매기고, target(예: megagong.net)이 발견되면 해당 순위를 리턴
