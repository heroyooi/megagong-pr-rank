# 📊 Megagong PR ranking (메가공 PR 랭킹)

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
megagong-pr-rank/
├── app/                  # (App Router 기반 API 및 페이지)
│   └── api/
│       └── rank/
│           └── route.ts  # Google 검색 순위 체크 API (App Router)
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

## 내 로컬 서버 https 인증서 설치

- powershell에서 OpenSSL이 PATH에 없다면 풀 경로로 실행하세요.
```powershell
cd D:\MEGA\Desktop\repo\megagong-pr-rank # 내 경로
& "C:\Program Files\OpenSSL-Win64\bin\openssl.exe" req -x509 -newkey rsa:2048 -nodes -days 365 -keyout key.pem -out cert.pem -subj "/CN=10.70.6.131" -addext "subjectAltName=IP:10.70.6.131"
```

- powershell에서 생성 확인
```powershell
dir cert.pem, key.pem
```


- package.json → scripts에 아래 추가/수정:
```json
{
  "scripts": {
    "dev:https": "next dev --port 5857 --experimental-https --experimental-https-key ./key.pem --experimental-https-cert ./cert.pem"
  }
}
```

## ASP 파일에서 해당 API 사용

- ns\view\meta.asp
```js
async function fetchRankForItem(it) {
  const keywords = extractKeywords(it.meta || {});
  const target = buildTargetStr(it);
  const base = "https://10.70.6.131:5857/api/rank";

  let bestRank = null;          // 최소(가장 좋은) 순위
  let bestKeyword = null;       // 그 순위를 만든 키워드
  let sumTop10Count = 0;        // 각 키워드의 top10Count 합산
  const perKeyword = [];        // 디버깅/표시용

  for (const kw of keywords) {
    // const url = `${base}?keyword=${encodeURIComponent(kw)}&target=${encodeURIComponent(target)}&pages=10`; // 100개
    const url = `${base}?keyword=${encodeURIComponent(kw)}&target=${encodeURIComponent(target)}`; // 50개
    try {
      const res = await fetch(url);
      const data = await res.json();

      // activeRank가 숫자일 때만 비교
      const rank = (typeof data.activeRank === "number") ? data.activeRank : null;
      const t10 = Number(data.top10Count || 0);

      if (rank !== null) {
        if (bestRank === null || rank < bestRank) {
          bestRank = rank;
          bestKeyword = kw;
        }
      }
      if (!Number.isNaN(t10)) sumTop10Count += t10;

      perKeyword.push({ keyword: kw, rank, top10Count: t10, sourceUrl: data.sourceUrl || "" });
    } catch (e) {
      perKeyword.push({ keyword: kw, rank: null, top10Count: 0, error: String(e) });
    }
  }

  return { bestRank, bestKeyword, sumTop10Count, perKeyword, target, keywords };
}
```
- https로 사용할 수 있으며, 회사 내부 IP에서는 해당 api를 호출할 수 있다.
- 외부 api로는 사용불가