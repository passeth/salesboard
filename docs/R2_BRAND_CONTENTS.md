# Brand Contents — Cloudflare R2 Integration Guide

> Last Updated: 2026-03-18
> 프로젝트: trade-intel

## 1. Overview

브랜드 제품 콘텐츠(이미지, PDF 등)는 **Cloudflare R2** 버킷에 저장되어 있다.
품목코드와 콘텐츠 폴더는 `content_slug`(대표코드)로 매핑되며, **N:1 관계**이다.

### 이미 완료된 것

- [x] R2 버킷 `fraijour` 생성 및 콘텐츠 업로드 (`contents/` prefix)
- [x] Public Development URL 활성화
- [x] `.env`에 R2 크레덴셜 설정 완료
- [x] `next.config.ts`에 R2 public domain 이미지 허용 완료
- [x] `product_master.csv`에 품목코드 → `content_slug` 매핑 정리 완료

### 아직 해야 할 것

- [ ] Supabase `product_master` 테이블 생성 + CSV 시딩
- [ ] R2 콘텐츠 브라우징 API 구현
- [ ] 품목 매핑 관리자 페이지 구현

---

## 2. Architecture

```
R2 Bucket: fraijour
├── contents/
│   ├── KSAM001/          ← content_slug (대표코드)
│   │   ├── main.jpg
│   │   ├── detail_01.jpg
│   │   └── ...
│   ├── RRHW001/
│   ├── FJCR006/
│   └── ...
```

### URL 패턴

| 용도 | URL |
|------|-----|
| **Public 접근** (이미지 렌더링) | `https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev/contents/{content_slug}/{filename}` |
| **S3 API** (업로드/목록 조회) | `https://0d26ff61fe8d850de9aea26dcd7db66d.r2.cloudflarestorage.com/fraijour` |

### N:1 매핑 구조

여러 품목(향/사이즈 변형)이 하나의 대표코드(`content_slug`) 콘텐츠 폴더를 공유한다:

```
product_code   product_name                              content_slug
─────────────────────────────────────────────────────────────────────
KSAM001        까마 옴므 아쿠아 바이오 모이스처라이저     KSAM001  ← 대표 (자기 자신)
KSAMM01        까마 옴므 아쿠아 바이오 모이스처라이저 (미니) KSAM001
KSXX2T1        까마 옴므 아쿠아 바이오 스킨케어 세트      KSAM001
KSAT001        까마 옴므 아쿠아 바이오 토너               KSAM001
KSATM01        까마 옴므 아쿠아 바이오 토너 (미니)        KSAM001
```

> `content_slug`가 빈 값인 품목은 콘텐츠가 없는 것.

---

## 3. Environment Variables

`.env`에 이미 설정되어 있음. 참조용:

```env
# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_API_TOKEN=<api-token>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=fraijour
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_TOKEN_VALUE=<token-value>
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev
```

> **NEXT_PUBLIC_R2_PUBLIC_URL**은 클라이언트에서 이미지 URL 조합에 사용.

---

## 4. Next.js Configuration

`next.config.ts`에 이미 설정됨:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev",
    },
  ],
},
```

→ `next/image` 컴포넌트에서 R2 이미지 직접 사용 가능.

---

## 5. Data Model — product_master

### 데이터 소스

CSV: `supabase/data/product_master.csv`

```csv
product_code,product_name,brand,content_slug
KSAM001,까마 옴므 아쿠아 바이오 모이스처라이저,까마,KSAM001
KSAMM01,까마 옴므 아쿠아 바이오 모이스처라이저 (미니),까마,KSAM001
RRPM003,로에랑스 퍼퓸 미스트- 나이브,로에랑스,
```

### 데이터 현황

| 항목 | 수량 |
|------|------|
| 총 품목 수 | 474 |
| content_slug 매핑 완료 | slug가 있는 행 수 |
| content_slug 없는 품목 | slug가 비어있는 행 (콘텐츠 없음) |

### Supabase 테이블 스키마

```sql
CREATE TABLE product_master (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code   TEXT NOT NULL,         -- 품목코드 (예: KSAM001)
  product_name   TEXT NOT NULL,         -- 품목명
  brand          TEXT NOT NULL,         -- 브랜드명
  content_slug   TEXT,                  -- R2 콘텐츠 폴더 키 (NULL이면 콘텐츠 없음)
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_product_master_code UNIQUE (product_code)
);

CREATE INDEX idx_product_master_slug ON product_master (content_slug);
CREATE INDEX idx_product_master_brand ON product_master (brand);

COMMENT ON TABLE product_master IS '품목 마스터. content_slug로 R2 콘텐츠 폴더와 N:1 매핑';
```

---

## 6. Implementation — R2 Client

R2는 S3-compatible API이므로 `@aws-sdk/client-s3`를 사용한다.

### 6.1 패키지 설치

```bash
npm install @aws-sdk/client-s3
```

### 6.2 R2 Client (`lib/r2/client.ts`)

```typescript
import { S3Client } from '@aws-sdk/client-s3'

let r2Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return r2Client
}

export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'fraijour'
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev'

/**
 * content_slug로 Public URL 생성
 */
export function getContentUrl(contentSlug: string, fileName: string): string {
  return `${R2_PUBLIC_URL}/contents/${contentSlug}/${fileName}`
}
```

### 6.3 Types (`lib/r2/types.ts`)

```typescript
export interface R2ContentFile {
  key: string           // 전체 R2 key (예: contents/KSAM001/main.jpg)
  fileName: string      // 파일명 (예: main.jpg)
  size: number          // bytes
  lastModified: Date
  publicUrl: string     // Public 접근 URL
}

export interface ContentFolder {
  slug: string          // content_slug (예: KSAM001)
  files: R2ContentFile[]
}
```

### 6.4 Actions (`lib/r2/actions.ts`)

```typescript
'use server'

import { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, R2_BUCKET, R2_PUBLIC_URL } from './client'
import type { R2ContentFile } from './types'

/**
 * content_slug 폴더의 파일 목록 조회
 */
export async function listContentFiles(
  contentSlug: string
): Promise<{ success: boolean; files?: R2ContentFile[]; error?: string }> {
  try {
    const client = getR2Client()
    const prefix = `contents/${contentSlug}/`

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: prefix,
      Delimiter: '/',
    })

    const response = await client.send(command)

    const files: R2ContentFile[] = (response.Contents || [])
      .filter((obj) => obj.Key && obj.Key !== prefix) // 폴더 자체 제외
      .map((obj) => {
        const fileName = obj.Key!.replace(prefix, '')
        return {
          key: obj.Key!,
          fileName,
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          publicUrl: `${R2_PUBLIC_URL}/${obj.Key}`,
        }
      })

    return { success: true, files }
  } catch (error: any) {
    console.error('listContentFiles error:', error)
    return { success: false, error: error?.message || '파일 목록 조회 실패' }
  }
}

/**
 * R2 contents/ 하위의 모든 slug 폴더 목록 조회
 */
export async function listContentSlugs(): Promise<{
  success: boolean
  slugs?: string[]
  error?: string
}> {
  try {
    const client = getR2Client()

    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: 'contents/',
      Delimiter: '/',
    })

    const response = await client.send(command)

    const slugs = (response.CommonPrefixes || [])
      .map((p) => p.Prefix?.replace('contents/', '').replace('/', '') || '')
      .filter(Boolean)
      .sort()

    return { success: true, slugs }
  } catch (error: any) {
    console.error('listContentSlugs error:', error)
    return { success: false, error: error?.message || '슬러그 목록 조회 실패' }
  }
}

/**
 * 파일 업로드
 */
export async function uploadContentFile(
  contentSlug: string,
  fileName: string,
  fileContent: Buffer | ArrayBuffer,
  contentType?: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const client = getR2Client()
    const key = `contents/${contentSlug}/${fileName}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: new Uint8Array(fileContent instanceof Buffer ? fileContent : fileContent),
      ContentType: contentType || 'application/octet-stream',
    })

    await client.send(command)

    return {
      success: true,
      publicUrl: `${R2_PUBLIC_URL}/${key}`,
    }
  } catch (error: any) {
    console.error('uploadContentFile error:', error)
    return { success: false, error: error?.message || '파일 업로드 실패' }
  }
}

/**
 * 파일 삭제
 */
export async function deleteContentFile(
  key: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getR2Client()

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })

    await client.send(command)
    return { success: true }
  } catch (error: any) {
    console.error('deleteContentFile error:', error)
    return { success: false, error: error?.message || '파일 삭제 실패' }
  }
}
```

---

## 7. Usage — 품목별 콘텐츠 조회

```typescript
import { createClient } from '@/lib/supabase/client'
import { listContentFiles } from '@/lib/r2/actions'
import { R2_PUBLIC_URL } from '@/lib/r2/client'

/**
 * 품목코드로 브랜드 콘텐츠 이미지 목록 조회
 */
async function getProductContents(productCode: string) {
  const supabase = createClient()

  // 1. DB에서 content_slug 조회
  const { data } = await supabase
    .from('product_master')
    .select('content_slug')
    .eq('product_code', productCode)
    .single()

  if (!data?.content_slug) {
    return { files: [], message: '등록된 콘텐츠가 없습니다.' }
  }

  // 2. R2에서 파일 목록 조회
  return listContentFiles(data.content_slug)
}
```

### 클라이언트에서 이미지 직접 렌더링 (Public URL)

DB 조회 없이 content_slug를 이미 알고 있는 경우:

```tsx
import Image from 'next/image'

// R2 Public URL로 직접 접근 — 별도 API 호출 불필요
<Image
  src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/contents/${contentSlug}/main.jpg`}
  alt={productName}
  width={400}
  height={400}
/>
```

---

## 8. 품목 매핑 관리자 페이지

### 필요성

- 신규 제품 출시 → content_slug 매핑 추가
- R2에 새 콘텐츠 업로드 → 매핑 확인/수정
- 잘못된 매핑 수정, 매핑 현황 모니터링

### 핵심 기능

| 기능 | 설명 |
|------|------|
| **R2 slug 폴더 실시간 조회** | `listContentSlugs()`로 R2 `contents/` 하위 폴더 목록 조회 → 선택 목록 제공 |
| **품목코드 매칭** | R2 slug 선택 → 매칭할 품목코드 지정 (다건, N:1) |
| **매핑 현황 대시보드** | 전체 품목 중 매핑 완료/미완료 비율, R2에만 있는 미매핑 slug 표시 |
| **콘텐츠 미리보기** | slug 선택 시 해당 폴더의 이미지를 Public URL로 미리보기 |
| **매핑 CRUD** | 추가, 수정, 해제. product_code unique 제약 위반 시 에러 안내 |
| **검색/필터** | 브랜드별, 매핑 상태(완료/미완료), 품목코드/품목명 검색 |

### UI 구성 제안

```
┌──────────────────────────────────────────────────────────────────────┐
│  품목 콘텐츠 매핑 관리                          매핑률: 78% (370/474) │
│                                                                      │
│  ┌─ 필터 ────────────────────────────────────────────────────────┐  │
│  │ 브랜드: [전체 ▼]  상태: [전체 ▼]  검색: [____________🔍]     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ R2 Content Slugs (좌) ──┐  ┌─ 매핑된 품목 (우) ───────────────┐│
│  │                           │  │                                   ││
│  │ 📁 KSAM001              │→│ KSAM001 까마 모이스처라이저        ││
│  │    5 품목 매핑 | 3 files  │  │ KSAMM01 까마 모이스처라이저(미니) ││
│  │                           │  │ KSXX2T1 까마 스킨케어 세트        ││
│  │ 📁 RRHW001              │  │ KSAT001 까마 토너                 ││
│  │    6 품목 매핑 | 8 files  │  │ KSATM01 까마 토너 (미니)          ││
│  │                           │  │                                   ││
│  │ 📁 FJCR010  ⚠️           │  │ [+ 품목 추가]                     ││
│  │    매핑 없음 | 4 files    │  │                                   ││
│  │                           │  ├─ 미리보기 ────────────────────────┤│
│  │                           │  │ [main.jpg] [detail_01] [detail_02]││
│  └───────────────────────────┘  └───────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

- **좌측**: `listContentSlugs()`로 R2 폴더 실시간 조회. 각 slug 옆에 매핑 품목 수 + 파일 수.
- **우측 상단**: 선택 slug에 매핑된 품목 목록. "품목 추가" 버튼.
- **우측 하단**: `listContentFiles(slug)`로 해당 폴더의 이미지 썸네일 미리보기 (Public URL 직접 로드).

### Server Actions

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { listContentSlugs } from '@/lib/r2/actions'

/**
 * R2 slug 목록 + DB 매핑 현황 결합
 */
export async function getContentMappingOverview() {
  const supabase = await createClient()

  // 1. R2에서 slug 목록
  const r2Result = await listContentSlugs()
  const r2Slugs = r2Result.slugs || []

  // 2. DB에서 slug별 매핑 수
  const { data: mappings } = await supabase
    .from('product_master')
    .select('content_slug')
    .not('content_slug', 'is', null)
    .neq('content_slug', '')

  const countBySlug = (mappings || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.content_slug] = (acc[row.content_slug] || 0) + 1
    return acc
  }, {})

  // 3. R2 기준으로 결합
  const overview = r2Slugs.map((slug) => ({
    slug,
    mappedCount: countBySlug[slug] || 0,
  }))

  // 4. DB에만 있고 R2에 없는 slug (orphaned)
  const r2Set = new Set(r2Slugs)
  const orphanedSlugs = Object.keys(countBySlug).filter((s) => !r2Set.has(s))

  return { overview, orphanedSlugs }
}

/**
 * 특정 slug에 매핑된 품목 목록
 */
export async function getMappedProducts(contentSlug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_master')
    .select('*')
    .eq('content_slug', contentSlug)
    .order('product_code')

  return { data: data || [], error: error?.message }
}

/**
 * 품목 slug 매핑 업데이트
 */
export async function updateContentSlug(
  productCode: string,
  contentSlug: string | null
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('product_master')
    .update({
      content_slug: contentSlug,
      updated_at: new Date().toISOString(),
    })
    .eq('product_code', productCode)

  return { success: !error, error: error?.message }
}

/**
 * 매핑 현황 통계
 */
export async function getMappingStats() {
  const supabase = await createClient()

  const { count: total } = await supabase
    .from('product_master')
    .select('*', { count: 'exact', head: true })

  const { count: mapped } = await supabase
    .from('product_master')
    .select('*', { count: 'exact', head: true })
    .not('content_slug', 'is', null)
    .neq('content_slug', '')

  return {
    total: total || 0,
    mapped: mapped || 0,
    unmapped: (total || 0) - (mapped || 0),
    percentage: total ? Math.round(((mapped || 0) / total) * 100) : 0,
  }
}
```

---

## 9. Data Flow Summary

```
[사용자]  품목 선택 (product_code)
    ↓
[Supabase]  product_master WHERE product_code = ? → content_slug
    ↓
[R2 Public URL]  https://pub-xxx.r2.dev/contents/{content_slug}/{filename}
    ↓
[Browser]  next/image 렌더링 (캐시 활용, CDN 배포)
```

콘텐츠 관리:
```
[관리자 페이지]
    ↓
[R2 S3 API]  listContentSlugs() → slug 폴더 목록
    ↓
[R2 S3 API]  listContentFiles(slug) → 파일 목록 + Public URL 미리보기
    ↓
[Supabase]   product_master UPDATE content_slug → 매핑 CRUD
```

---

## 10. Cloudflare R2 vs Dropbox 비교

| 항목 | Cloudflare R2 (현재) | Dropbox (이전 검토) |
|------|---------------------|---------------------|
| **접근 방식** | Public URL 직접 접근 | API로 임시 링크 생성 (4h 만료) |
| **CDN** | Cloudflare CDN 자동 | 없음 |
| **비용** | 10GB 무료, 이후 $0.015/GB/월 | 무료 2GB, 이후 유료 플랜 |
| **이미지 최적화** | `next/image` + CDN 캐싱 | 불가 |
| **매핑 방식** | `content_slug` (대표 품목코드) | `folder_name` (한글 제품 라인명) |
| **API** | S3-compatible (표준) | Dropbox 전용 SDK |

---

## 11. File Structure

```
lib/
└── r2/
    ├── client.ts    # S3Client 싱글톤 + URL 헬퍼
    ├── types.ts     # R2ContentFile, ContentFolder 타입
    └── actions.ts   # Server Actions (list, upload, delete)
```

---

## 12. Checklist

### 기본 연동

- [x] Cloudflare R2 버킷 생성 (`fraijour`)
- [x] 콘텐츠 업로드 (`contents/` prefix)
- [x] `.env`에 R2 크레덴셜 설정
- [x] `next.config.ts` 이미지 도메인 허용
- [x] `product_master.csv` content_slug 매핑 완료
- [ ] `npm install @aws-sdk/client-s3`
- [ ] `lib/r2/` 폴더에 3개 파일 생성 (client, types, actions)

### 데이터베이스

- [ ] Supabase `product_master` 테이블 생성 (Section 5 스키마)
- [ ] `product_master.csv` 데이터 시딩

### 콘텐츠 열람

- [ ] `listContentFiles(slug)` → 파일 목록 조회 구현
- [ ] 품목코드 → content_slug → R2 파일 목록 E2E 테스트
- [ ] `next/image`로 R2 이미지 렌더링 확인

### 매핑 관리자 페이지

- [ ] 관리자 페이지 라우트 (예: `/admin/content-mapping`)
- [ ] `getContentMappingOverview` — R2 slug + DB 매핑 결합 (Section 8)
- [ ] `getMappedProducts` — slug별 매핑 품목 조회 (Section 8)
- [ ] `updateContentSlug` — 매핑 CRUD (Section 8)
- [ ] `getMappingStats` — 매핑 현황 통계 (Section 8)
- [ ] 좌측: R2 slug 목록 (매핑 수 + 파일 수)
- [ ] 우측: 매핑 품목 목록 + 콘텐츠 미리보기
- [ ] 검색/필터: 브랜드, 매핑 상태, 품목코드/품목명

---

## 13. Environment Variables

```env
# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=0d26ff61fe8d850de9aea26dcd7db66d
CLOUDFLARE_API_TOKEN=34436f75d108a6ed55222730f290ad0ce60a2
R2_ENDPOINT=https://0d26ff61fe8d850de9aea26dcd7db66d.r2.cloudflarestorage.com
R2_BUCKET_NAME=fraijour
R2_ACCESS_KEY_ID=eaf21cc1858dfaf9c5848c43386786d8
R2_SECRET_ACCESS_KEY=65636016ea5fae977092798ffc8ffbff14d7e60f25dd4c70b91e5ff3dcdb2e7f
R2_TOKEN_VALUE=G1rwtgEnqZNJFBlrdHaTDfACY4KYHxzf1k6HYzmo
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev
```

| 변수 | 용도 | 클라이언트 노출 |
|------|------|----------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID | No |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 인증 | No |
| `R2_ENDPOINT` | S3 호환 엔드포인트 | No |
| `R2_BUCKET_NAME` | 버킷명 (`fraijour`) | No |
| `R2_ACCESS_KEY_ID` | S3 Access Key | No |
| `R2_SECRET_ACCESS_KEY` | S3 Secret Key | No |
| `R2_TOKEN_VALUE` | R2 Token | No |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Public 접근 URL | **Yes** (이미지 렌더링용) |

### Cloudflare URLs

| 용도 | URL |
|------|-----|
| Dashboard | `https://dash.cloudflare.com/0d26ff61fe8d850de9aea26dcd7db66d/r2/default/buckets/fraijour` |
| S3 API | `https://0d26ff61fe8d850de9aea26dcd7db66d.r2.cloudflarestorage.com/fraijour` |
| Public Dev URL | `https://pub-cdb650c7bfa1416a8f0e200aea466576.r2.dev` |
| R2 Data Catalog | `https://catalog.cloudflarestorage.com/0d26ff61fe8d850de9aea26dcd7db66d/fraijour` |
