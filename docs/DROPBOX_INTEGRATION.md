# Dropbox API Integration Guide

> Last Updated: 2026-03-18
> Source: RISE MES 프로젝트 (`rise-mes`) Dropbox 연동 모듈에서 추출

## 1. Overview

Dropbox API를 통해 파일 업로드, 폴더 관리, 공유 링크 생성을 수행하는 서버 사이드 모듈.
Next.js Server Actions 기반으로 동작하며, `dropbox` npm SDK를 사용한다.

### Dropbox 경로 매핑

| 구분 | 경로 |
|------|------|
| **로컬 파일시스템** (Dropbox Desktop 동기화) | `/Users/seulkiji/Library/CloudStorage/Dropbox-(주)에바스코스메틱/팀's shared workspace/RISE` |
| **Dropbox API 경로** (코드에서 사용) | `/팀's shared workspace/RISE` |

> **주의**: 코드에서는 항상 **Dropbox API 경로**를 사용한다. 로컬 파일시스템 경로는 API에서 사용하지 않는다.

### 앱 설정 상태

- 기존 Dropbox App이 **"Full Dropbox" (Scoped access)** 권한으로 설정되어 있음
- `/팀's shared workspace/RISE` 경로는 동일 Dropbox 계정 내 폴더이므로 **추가 앱 설정 불필요**
- 기존 `DROPBOX_ACCESS_TOKEN`을 그대로 사용 가능

---

## 2. Setup

### 2.1 패키지 설치

```bash
npm install dropbox
```

- SDK 버전: `^10.34.0` (검증 완료)
- Node.js 18+ 내장 `fetch` 사용 (별도 polyfill 불필요)

### 2.2 환경변수

```env
# .env.local
DROPBOX_ACCESS_TOKEN=sl.xxxxx           # Dropbox Developer Console에서 발급
DROPBOX_BASE_FOLDER=/팀's shared workspace/RISE
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `DROPBOX_ACCESS_TOKEN` | Y | OAuth2 Access Token |
| `DROPBOX_BASE_FOLDER` | N | 기본 폴더 경로 (미설정 시 코드에서 fallback 지정) |

### 2.3 Access Token 발급 (이미 있으면 SKIP)

1. [Dropbox Developer Console](https://www.dropbox.com/developers/apps) 접속
2. 기존 앱 선택 (또는 "Create App" → Scoped access → Full Dropbox)
3. **Permissions 탭**에서 아래 스코프 활성화:

| Scope | 용도 |
|-------|------|
| `files.content.write` | 파일/폴더 생성, 업로드 |
| `files.content.read` | 파일/폴더 읽기 |
| `sharing.write` | 공유 링크 생성 |
| `sharing.read` | 공유 링크 조회 |

4. **Settings 탭** → OAuth 2 → "Generate" 버튼으로 Access Token 발급

> **토큰 만료**: 단기 토큰은 4시간 후 만료. 장기 운영 시 Refresh Token 방식 권장 (아래 참조).

---

## 3. Implementation

아래 3개 파일을 프로젝트에 추가하면 Dropbox 연동이 완성된다.

### 3.1 Types (`lib/dropbox/types.ts`)

```typescript
export interface DropboxUploadResult {
  success: boolean
  path?: string
  error?: string
}

export interface DropboxFolderResult {
  success: boolean
  folderPath?: string
  error?: string
}

export interface DropboxSharedLinkResult {
  success: boolean
  url?: string
  error?: string
}

export interface ArtworkUploadResult {
  folderPath: string
  uploadedFiles: string[]
  sharedLink: string
}
```

### 3.2 Client (`lib/dropbox/client.ts`)

```typescript
import { Dropbox } from 'dropbox'

let dropboxClient: Dropbox | null = null

/**
 * Dropbox 클라이언트 싱글톤 (서버 사이드 전용)
 */
export function getDropboxClient(): Dropbox {
  if (!dropboxClient) {
    const accessToken = process.env.DROPBOX_ACCESS_TOKEN

    if (!accessToken) {
      throw new Error('DROPBOX_ACCESS_TOKEN 환경 변수가 설정되지 않았습니다.')
    }

    dropboxClient = new Dropbox({
      accessToken,
      fetch: fetch, // Node.js 18+ 내장 fetch
    })
  }

  return dropboxClient
}

/**
 * 기본 폴더 경로
 */
export function getBaseFolderPath(): string {
  return process.env.DROPBOX_BASE_FOLDER || "/팀's shared workspace/RISE"
}
```

### 3.3 Actions (`lib/dropbox/actions.ts`)

```typescript
'use server'

import { getDropboxClient, getBaseFolderPath } from './client'
import type {
  DropboxFolderResult,
  DropboxUploadResult,
  DropboxSharedLinkResult,
} from './types'

/**
 * 폴더 생성
 * - 이미 존재하면 성공으로 처리 (멱등성)
 */
export async function createDropboxFolder(
  folderPath: string
): Promise<DropboxFolderResult> {
  try {
    const dbx = getDropboxClient()

    const response = await dbx.filesCreateFolderV2({
      path: folderPath,
      autorename: false,
    })

    return {
      success: true,
      folderPath: response.result.metadata.path_display || folderPath,
    }
  } catch (error: any) {
    if (error?.error?.error_summary?.includes('path/conflict/folder')) {
      return { success: true, folderPath }
    }
    console.error('createDropboxFolder error:', error)
    return {
      success: false,
      error: error?.message || 'Dropbox 폴더 생성 실패',
    }
  }
}

/**
 * 파일 업로드
 * - mode: overwrite (동일 이름 파일 덮어쓰기)
 */
export async function uploadFileToDropbox(
  folderPath: string,
  fileName: string,
  fileContent: Buffer | ArrayBuffer
): Promise<DropboxUploadResult> {
  try {
    const dbx = getDropboxClient()
    const filePath = `${folderPath}/${fileName}`

    const contents =
      fileContent instanceof Buffer
        ? fileContent
        : new Uint8Array(fileContent)

    const response = await dbx.filesUpload({
      path: filePath,
      contents: contents,
      mode: { '.tag': 'overwrite' },
      autorename: false,
      mute: false,
    })

    return {
      success: true,
      path: response.result.path_display || filePath,
    }
  } catch (error: any) {
    console.error('uploadFileToDropbox error:', error)
    return {
      success: false,
      error: error?.message || 'Dropbox 파일 업로드 실패',
    }
  }
}

/**
 * 공유 링크 생성 (이미 존재하면 기존 링크 반환)
 */
export async function createDropboxSharedLink(
  path: string
): Promise<DropboxSharedLinkResult> {
  try {
    const dbx = getDropboxClient()

    const response = await dbx.sharingCreateSharedLinkWithSettings({
      path,
      settings: {
        requested_visibility: { '.tag': 'public' },
        audience: { '.tag': 'public' },
        access: { '.tag': 'viewer' },
        allow_download: true,
      },
    })

    return { success: true, url: response.result.url }
  } catch (error: any) {
    // 이미 공유 링크 존재 시 기존 링크 반환
    if (error?.error?.error_summary?.includes('shared_link_already_exists')) {
      try {
        const dbx = getDropboxClient()
        const existing = await dbx.sharingListSharedLinks({
          path,
          direct_only: true,
        })
        if (existing.result.links.length > 0) {
          return { success: true, url: existing.result.links[0].url }
        }
      } catch (listError) {
        console.error('sharingListSharedLinks error:', listError)
      }
    }
    console.error('createDropboxSharedLink error:', error)
    return {
      success: false,
      error: error?.message || 'Dropbox 공유 링크 생성 실패',
    }
  }
}

/**
 * 기존 공유 링크 조회
 */
export async function getDropboxSharedLinks(path: string): Promise<string[]> {
  try {
    const dbx = getDropboxClient()
    const response = await dbx.sharingListSharedLinks({
      path,
      direct_only: true,
    })
    return response.result.links.map((link) => link.url)
  } catch (error) {
    console.error('getDropboxSharedLinks error:', error)
    return []
  }
}

/**
 * 전체 워크플로우: 폴더 생성 → 파일 업로드 → 공유 링크 생성
 */
export async function uploadWithSharedLink(
  subFolderName: string,
  fileName: string,
  fileContent: Buffer | ArrayBuffer
): Promise<{ success: boolean; result?: ArtworkUploadResult; error?: string }> {
  try {
    const basePath = getBaseFolderPath()
    const folderPath = `${basePath}/${subFolderName}`

    const folderResult = await createDropboxFolder(folderPath)
    if (!folderResult.success) {
      return { success: false, error: folderResult.error }
    }

    const uploadResult = await uploadFileToDropbox(folderPath, fileName, fileContent)
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error }
    }

    const linkResult = await createDropboxSharedLink(folderPath)
    if (!linkResult.success) {
      return { success: false, error: linkResult.error }
    }

    return {
      success: true,
      result: {
        folderPath: folderResult.folderPath!,
        uploadedFiles: [uploadResult.path!],
        sharedLink: linkResult.url!,
      },
    }
  } catch (error: any) {
    console.error('uploadWithSharedLink error:', error)
    return { success: false, error: error?.message || '업로드 실패' }
  }
}
```

---

## 4. Usage Examples

### 4.1 단일 파일 업로드 + 공유 링크

```typescript
import { uploadWithSharedLink } from '@/lib/dropbox/actions'

const result = await uploadWithSharedLink(
  'reports/2026-03',        // basePath 하위 폴더
  'monthly-report.pdf',     // 파일명
  fileBuffer                // Buffer | ArrayBuffer
)

if (result.success) {
  console.log('공유 링크:', result.result.sharedLink)
  // → https://www.dropbox.com/sh/xxx/yyy?dl=0
}
```

### 4.2 개별 API 호출

```typescript
import { createDropboxFolder, uploadFileToDropbox, createDropboxSharedLink } from '@/lib/dropbox/actions'

// 1. 폴더 생성
const folder = await createDropboxFolder("/팀's shared workspace/RISE/exports")

// 2. 파일 업로드
const upload = await uploadFileToDropbox(
  "/팀's shared workspace/RISE/exports",
  'data.csv',
  csvBuffer
)

// 3. 공유 링크
const link = await createDropboxSharedLink("/팀's shared workspace/RISE/exports")
```

### 4.3 React 컴포넌트에서 사용 (파일 input)

```typescript
async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return

  const buffer = await file.arrayBuffer()
  const result = await uploadWithSharedLink(
    `uploads/${new Date().toISOString().slice(0, 10)}`,
    file.name,
    buffer
  )

  if (result.success) {
    // DB에 공유 링크 저장 등 후처리
  }
}
```

---

## 5. Error Handling

| 에러 | 원인 | 처리 |
|------|------|------|
| `path/conflict/folder` | 폴더 이미 존재 | 성공으로 처리 (코드에 구현됨) |
| `path/not_found` | 상위 경로 없음 | 상위 폴더부터 재귀 생성 |
| `shared_link_already_exists` | 링크 이미 존재 | 기존 링크 조회 반환 (코드에 구현됨) |
| `insufficient_space` | 저장 공간 부족 | 관리자 알림 |
| `invalid_access_token` | 토큰 만료/무효 | 토큰 갱신 필요 |

---

## 6. Long-lived Token (Refresh Token 방식)

단기 Access Token은 4시간 후 만료된다. 프로덕션에서는 Refresh Token 사용 권장:

```typescript
// client.ts 수정
const dbx = new Dropbox({
  clientId: process.env.DROPBOX_APP_KEY,
  clientSecret: process.env.DROPBOX_APP_SECRET,
  refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
})
// SDK가 자동으로 토큰 갱신
```

추가 환경변수:

```env
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret
DROPBOX_REFRESH_TOKEN=your_refresh_token
```

---

## 7. API Reference

### Files

| 메서드 | Dropbox API | 용도 |
|--------|-------------|------|
| `dbx.filesCreateFolderV2()` | `POST /2/files/create_folder_v2` | 폴더 생성 |
| `dbx.filesUpload()` | `POST /2/files/upload` | 파일 업로드 (150MB 이하) |

### Sharing

| 메서드 | Dropbox API | 용도 |
|--------|-------------|------|
| `dbx.sharingCreateSharedLinkWithSettings()` | `POST /2/sharing/create_shared_link_with_settings` | 공유 링크 생성 |
| `dbx.sharingListSharedLinks()` | `POST /2/sharing/list_shared_links` | 공유 링크 조회 |

### Limits

| 항목 | 제한 |
|------|------|
| 단일 업로드 | 150MB |
| 대용량 업로드 | `upload_session` API 사용 |
| API Rate Limit | 앱당 ~1000 req/10min |

---

## 8. Brand Contents 열람 (폴더 브라우징)

### 8.1 개요

Dropbox `/팀's shared workspace/RISE/100_Brand Contents` 폴더에는 브랜드별 제품 콘텐츠(이미지, PDF 등)가 저장되어 있다.
이 콘텐츠를 사이트에서 열람할 수 있도록 하려면 **품목코드 → 폴더명 매칭 테이블**이 필요하다.

### 8.2 왜 매칭 테이블이 필요한가

Dropbox 폴더명은 **제품 라인명** (예: `로즈마인 퍼퓸드 바디`)이고, 시스템에서 사용하는 **품목코드** (예: `RMBL015`)와 직접 매칭되지 않는다.
또한 **품목코드:콘텐츠 폴더 = N:1 관계**이다 — 동일 라인의 여러 품목(향/사이즈 변형)이 하나의 콘텐츠 폴더를 공유한다.

```
품목코드          품목명                              → 콘텐츠 폴더
─────────────────────────────────────────────────────────────────────
RMBL015     로즈마인 퍼퓸드 바디로션 - 가든로즈        → 로즈마인 퍼퓸드 바디
RMBL016     로즈마인 퍼퓸드 바디로션 - 러브센세이션     → 로즈마인 퍼퓸드 바디
RPBC015     로즈마인 퍼퓸드 바디워시 - 가든로즈        → 로즈마인 퍼퓸드 바디
RPBC016     로즈마인 퍼퓸드 바디워시 - 러브센세이션     → 로즈마인 퍼퓸드 바디
```

### 8.3 데이터 현황

| 항목 | 수량 |
|------|------|
| 총 품목 수 (CSV rows) | 474 |
| 매핑된 고유 폴더 수 | ~82 |
| Dropbox 실제 폴더 수 | 172 |
| 폴더 매핑 없는 품목 | 일부 (Folder Name 비어있음) |

> 172개 Dropbox 폴더 중 82개만 CSV에 매핑됨. 나머지 90개 폴더는 아직 품목코드 매핑이 없는 상태.

### 8.4 매칭 테이블 (brand_content_map)

#### 데이터 소스

CSV 파일: `supabase/data/Brand_content_map.csv`

```csv
Product Code,Product Name,Brand,Folder Name
RMBL015,로즈마인 퍼퓸드 바디로션 - 가든로즈,로즈마인,로즈마인 퍼퓸드 바디
RMBL016,로즈마인 퍼퓸드 바디로션 - 러브센세이션,로즈마인,로즈마인 퍼퓸드 바디
KBBC003,키스바이 로즈마인 스텔라리 바디워시- 블리스,키스바이,키스바이 로즈마인 스텔라리 바디워시
```

#### Supabase 테이블 스키마

```sql
CREATE TABLE brand_content_map (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code  TEXT NOT NULL,                    -- 품목코드 (예: RMBL015)
  product_name  TEXT NOT NULL,                    -- 품목명
  brand         TEXT NOT NULL,                    -- 브랜드명 (예: 로즈마인)
  folder_name   TEXT,                             -- Dropbox 폴더명 (NULL이면 콘텐츠 없음)
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_brand_content_map_product_code UNIQUE (product_code)
);

-- 폴더명으로 조회 (동일 폴더의 모든 품목 찾기)
CREATE INDEX idx_brand_content_map_folder ON brand_content_map (folder_name);

-- 브랜드별 조회
CREATE INDEX idx_brand_content_map_brand ON brand_content_map (brand);

COMMENT ON TABLE brand_content_map IS '품목코드 → Dropbox Brand Contents 폴더 매칭 테이블 (N:1 관계)';
```

#### CSV 시딩

```sql
-- Supabase CSV Import 또는 아래 SQL로 직접 입력
-- CSV 파일: supabase/data/Brand_content_map.csv
-- 컬럼 매핑: Product Code → product_code, Product Name → product_name, Brand → brand, Folder Name → folder_name
```

### 8.5 콘텐츠 열람 데이터 플로우

```
사용자: 품목 선택 (product_code: RMBL015)
    ↓
DB 조회: brand_content_map WHERE product_code = 'RMBL015'
    ↓
결과: folder_name = '로즈마인 퍼퓸드 바디'
    ↓
Dropbox API 경로 조합: /팀's shared workspace/RISE/100_Brand Contents/로즈마인 퍼퓸드 바디
    ↓
Dropbox API: files/list_folder → 폴더 내 파일 목록
    ↓
Dropbox API: files/get_temporary_link → 각 파일의 임시 다운로드 URL (4시간 유효)
    ↓
사이트: 이미지/PDF 뷰어로 렌더링
```

### 8.6 폴더 브라우징 API (추가 구현 필요)

기존 모듈(Section 3)에는 업로드/공유 링크만 있다. 열람을 위해 아래 API 추가 필요:

#### 폴더 내 파일 목록 조회

```typescript
/**
 * Dropbox 폴더 내 파일/서브폴더 목록 조회
 */
export async function listDropboxFolder(
  folderPath: string
): Promise<{ success: boolean; entries?: DropboxEntry[]; error?: string }> {
  try {
    const dbx = getDropboxClient()

    const response = await dbx.filesListFolder({
      path: folderPath,
      recursive: false,
      include_media_info: true,
      include_deleted: false,
    })

    const entries: DropboxEntry[] = response.result.entries.map((entry) => ({
      name: entry.name,
      path: entry.path_display || '',
      type: entry['.tag'] as 'file' | 'folder',
      size: entry['.tag'] === 'file' ? (entry as any).size : undefined,
      modified: entry['.tag'] === 'file' ? (entry as any).server_modified : undefined,
    }))

    return { success: true, entries }
  } catch (error: any) {
    console.error('listDropboxFolder error:', error)
    return { success: false, error: error?.message || '폴더 목록 조회 실패' }
  }
}
```

#### 파일 임시 다운로드 링크 생성

```typescript
/**
 * 파일별 임시 다운로드 URL (4시간 유효, 인증 불필요)
 */
export async function getTemporaryLink(
  filePath: string
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const dbx = getDropboxClient()

    const response = await dbx.filesGetTemporaryLink({
      path: filePath,
    })

    return { success: true, link: response.result.link }
  } catch (error: any) {
    console.error('getTemporaryLink error:', error)
    return { success: false, error: error?.message || '임시 링크 생성 실패' }
  }
}
```

#### 썸네일 가져오기 (이미지 미리보기용)

```typescript
/**
 * 이미지 파일 썸네일 (base64)
 */
export async function getThumbnail(
  filePath: string,
  size: 'w32h32' | 'w64h64' | 'w128h128' | 'w256h256' | 'w480h320' | 'w640h480' | 'w960h640' | 'w1024h768' = 'w256h256'
): Promise<{ success: boolean; data?: ArrayBuffer; error?: string }> {
  try {
    const dbx = getDropboxClient()

    const response = await dbx.filesGetThumbnailV2({
      resource: { '.tag': 'path', path: filePath },
      format: { '.tag': 'jpeg' },
      size: { '.tag': size },
    })

    return { success: true, data: (response.result as any).fileBlob }
  } catch (error: any) {
    console.error('getThumbnail error:', error)
    return { success: false, error: error?.message || '썸네일 조회 실패' }
  }
}
```

#### 추가 타입 정의

```typescript
// types.ts에 추가
export interface DropboxEntry {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number          // bytes (file only)
  modified?: string      // ISO timestamp (file only)
}
```

### 8.7 Brand Contents 열람 사용 예시

```typescript
import { createClient } from '@/lib/supabase/client'
import { listDropboxFolder, getTemporaryLink } from '@/lib/dropbox/actions'

const BRAND_CONTENTS_BASE = "/팀's shared workspace/RISE/100_Brand Contents"

/**
 * 품목코드로 브랜드 콘텐츠 파일 목록 조회
 */
async function getBrandContents(productCode: string) {
  const supabase = createClient()

  // 1. DB에서 폴더명 조회
  const { data } = await supabase
    .from('brand_content_map')
    .select('folder_name')
    .eq('product_code', productCode)
    .single()

  if (!data?.folder_name) {
    return { files: [], message: '등록된 콘텐츠 폴더가 없습니다.' }
  }

  // 2. Dropbox에서 파일 목록 조회
  const folderPath = `${BRAND_CONTENTS_BASE}/${data.folder_name}`
  const result = await listDropboxFolder(folderPath)

  if (!result.success) {
    return { files: [], error: result.error }
  }

  // 3. 파일별 임시 링크 생성
  const filesWithLinks = await Promise.all(
    (result.entries || [])
      .filter((e) => e.type === 'file')
      .map(async (entry) => {
        const linkResult = await getTemporaryLink(entry.path)
        return {
          ...entry,
          downloadUrl: linkResult.link,
        }
      })
  )

  return { files: filesWithLinks }
}
```

### 8.8 추가 API Reference (열람용)

| 메서드 | Dropbox API | 용도 |
|--------|-------------|------|
| `dbx.filesListFolder()` | `POST /2/files/list_folder` | 폴더 내 파일 목록 |
| `dbx.filesListFolderContinue()` | `POST /2/files/list_folder/continue` | 페이지네이션 (25개+) |
| `dbx.filesGetTemporaryLink()` | `POST /2/files/get_temporary_link` | 임시 다운로드 URL (4h) |
| `dbx.filesGetThumbnailV2()` | `POST /2/files/get_thumbnail_v2` | 이미지 썸네일 |

### 8.9 품목 매핑 관리자 페이지

#### 필요성

CSV 시딩은 초기 데이터 투입용이다. 운영 중에는:
- 신규 제품 출시 시 매핑 추가
- Dropbox에 새 콘텐츠 폴더 생성 시 매핑 갱신
- 잘못된 매핑 수정

이를 위해 **관리자 전용 매핑 관리 페이지**가 필요하다.

#### 핵심 기능

| 기능 | 설명 |
|------|------|
| **Dropbox 폴더 목록 조회** | `100_Brand Contents` 하위 폴더를 Dropbox API로 실시간 조회하여 드롭다운/선택 목록으로 제공 |
| **품목코드 매칭** | 조회된 Dropbox 폴더를 선택 → 해당 폴더에 매칭할 품목코드를 지정 (다건 선택 가능, N:1) |
| **매핑 현황 대시보드** | 전체 품목 중 매핑 완료/미완료 비율, 미매핑 Dropbox 폴더 수 표시 |
| **매핑 CRUD** | 매핑 추가, 수정, 삭제. 품목코드 unique 제약조건 위반 시 에러 안내 |
| **검색/필터** | 브랜드별 필터, 품목코드/품목명 검색, 매핑 상태(완료/미완료) 필터 |

#### UI 구성 제안

```
┌─────────────────────────────────────────────────────────────────┐
│  품목 매핑 관리                                    [매핑 현황]  │
│                                                                 │
│  ┌─ 필터 ──────────────────────────────────────────────────┐   │
│  │ 브랜드: [전체 ▼]  상태: [전체 ▼]  검색: [________🔍]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Dropbox 폴더 (좌측) ─────┐  ┌─ 매핑된 품목 (우측) ──────┐ │
│  │                            │  │                            │ │
│  │ 📁 로즈마인 퍼퓸드 바디   │→│ RMBL015 바디로션-가든로즈  │ │
│  │    (14개 품목 매핑)        │  │ RMBL016 바디로션-러브센..  │ │
│  │                            │  │ RPBC015 바디워시-가든로즈  │ │
│  │ 📁 밸르모나 블루클리닉..  │  │ ...                        │ │
│  │    (3개 품목 매핑)         │  │                            │ │
│  │                            │  │ [+ 품목 추가]              │ │
│  │ 📁 프레쥬 어성초 블레..   │  │                            │ │
│  │    (매핑 없음) ⚠️          │  │                            │ │
│  │                            │  │                            │ │
│  └────────────────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**좌측 패널** — Dropbox `100_Brand Contents` 폴더를 `listDropboxFolder`로 실시간 조회. 각 폴더 옆에 매핑된 품목 수 표시. 미매핑 폴더는 경고 아이콘.

**우측 패널** — 좌측에서 폴더 선택 시, 해당 폴더에 매핑된 품목 목록 표시. "품목 추가" 버튼으로 미매핑 품목을 검색/선택하여 매핑.

#### Server Actions

```typescript
'use server'

import { getDropboxClient, getBaseFolderPath } from '@/lib/dropbox/client'
import { createClient } from '@/lib/supabase/server'

const BRAND_CONTENTS_PATH = "/팀's shared workspace/RISE/100_Brand Contents"

/**
 * Dropbox Brand Contents 폴더 목록 + 각 폴더별 매핑 품목 수
 */
export async function getBrandContentFolders() {
  const dbx = getDropboxClient()
  const supabase = await createClient()

  // 1. Dropbox 폴더 목록
  const response = await dbx.filesListFolder({
    path: BRAND_CONTENTS_PATH,
    recursive: false,
  })

  const folders = response.result.entries
    .filter((e) => e['.tag'] === 'folder')
    .map((e) => e.name)
    .sort()

  // 2. DB에서 폴더별 매핑 수 집계
  const { data: mappingCounts } = await supabase
    .from('brand_content_map')
    .select('folder_name')
    .not('folder_name', 'is', null)

  const countByFolder = (mappingCounts || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.folder_name] = (acc[row.folder_name] || 0) + 1
    return acc
  }, {})

  return folders.map((name) => ({
    folderName: name,
    mappedCount: countByFolder[name] || 0,
  }))
}

/**
 * 특정 폴더에 매핑된 품목 목록
 */
export async function getMappedProducts(folderName: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('brand_content_map')
    .select('*')
    .eq('folder_name', folderName)
    .order('product_code')

  return { data: data || [], error: error?.message }
}

/**
 * 품목-폴더 매핑 추가/수정
 */
export async function upsertMapping(
  productCode: string,
  productName: string,
  brand: string,
  folderName: string | null
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('brand_content_map')
    .upsert(
      {
        product_code: productCode,
        product_name: productName,
        brand,
        folder_name: folderName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'product_code' }
    )

  return { success: !error, error: error?.message }
}

/**
 * 매핑 삭제 (품목 자체가 아닌 폴더 연결만 해제)
 */
export async function unlinkMapping(productCode: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('brand_content_map')
    .update({ folder_name: null, updated_at: new Date().toISOString() })
    .eq('product_code', productCode)

  return { success: !error, error: error?.message }
}

/**
 * 매핑 현황 통계
 */
export async function getMappingStats() {
  const supabase = await createClient()

  const { count: total } = await supabase
    .from('brand_content_map')
    .select('*', { count: 'exact', head: true })

  const { count: mapped } = await supabase
    .from('brand_content_map')
    .select('*', { count: 'exact', head: true })
    .not('folder_name', 'is', null)
    .neq('folder_name', '')

  return {
    total: total || 0,
    mapped: mapped || 0,
    unmapped: (total || 0) - (mapped || 0),
    percentage: total ? Math.round(((mapped || 0) / total) * 100) : 0,
  }
}
```

### 8.10 주의사항

- `filesGetTemporaryLink`의 URL은 **4시간 후 만료**. 클라이언트에서 캐싱 시 TTL 고려 필요.
- `filesListFolder`는 기본 최대 500개 항목 반환. `has_more=true`이면 `filesListFolderContinue`로 다음 페이지 조회.
- `folder_name`이 NULL/빈 문자열인 품목은 콘텐츠가 없는 것이므로 UI에서 "콘텐츠 없음" 처리.
- Dropbox에 172개 폴더가 있으나 CSV에 82개만 매핑됨. 매핑 누락 폴더는 추후 관리자 페이지에서 매핑 추가.

---

## 9. File Structure

프로젝트에 아래 구조로 추가:

```
lib/
└── dropbox/
    ├── types.ts    # 타입 정의
    ├── client.ts   # 싱글톤 클라이언트 + 경로 헬퍼
    └── actions.ts  # Server Actions (폴더/업로드/공유)
```

---

## 9. Checklist

### 기본 연동

- [ ] `npm install dropbox` 실행
- [ ] `lib/dropbox/` 폴더에 3개 파일 생성 (types, client, actions)
- [ ] `.env.local`에 `DROPBOX_ACCESS_TOKEN` 설정
- [ ] `.env.local`에 `DROPBOX_BASE_FOLDER=/팀's shared workspace/RISE` 설정
- [ ] `.gitignore`에 `.env.local` 포함 확인
- [ ] 테스트: 폴더 생성 → 파일 업로드 → 공유 링크 생성

### Brand Contents 열람

- [ ] Supabase에 `brand_content_map` 테이블 생성 (Section 8.4 스키마)
- [ ] `supabase/data/Brand_content_map.csv` 데이터 시딩
- [ ] `listDropboxFolder`, `getTemporaryLink` 함수 추가 (Section 8.6)
- [ ] `DropboxEntry` 타입 추가 (Section 8.6)
- [ ] 품목코드 → 폴더 브라우징 → 파일 목록 E2E 테스트

### 품목 매핑 관리자 페이지

- [ ] 관리자 페이지 라우트 생성 (예: `/admin/brand-content-map`)
- [ ] `getBrandContentFolders` — Dropbox 폴더 실시간 조회 + 매핑 수 (Section 8.9)
- [ ] `getMappedProducts` — 폴더별 매핑 품목 조회 (Section 8.9)
- [ ] `upsertMapping` / `unlinkMapping` — 매핑 CRUD (Section 8.9)
- [ ] `getMappingStats` — 매핑 현황 대시보드 (Section 8.9)
- [ ] 좌측: Dropbox 폴더 목록 패널 (매핑 수, 미매핑 경고)
- [ ] 우측: 선택 폴더의 매핑 품목 목록 + 품목 추가/해제
- [ ] 검색/필터: 브랜드, 매핑 상태, 품목코드/품목명
