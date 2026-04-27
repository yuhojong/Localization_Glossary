# Localization Glossary Standalone App Plan

## Goal

`data` 폴더 안의 `.xlsx` 파일들을 읽어서, 번역용 glossary를 로컬에서 빠르게 검색할 수 있는 스탠드얼론 프로그램을 만든다.

핵심 요구사항:

- 입력 파일 형식은 `A: Key`, `B: Source`, `C: KO`, `D: EN`
- 검색은 `KO` 기준으로 수행
- 긴 문장보다 단어/용어 중심 검색이 우선
- 복합 단어 검색 지원 (`활 제작대` 등)
- 동일한 `KO`는 동일한 `EN`을 가져야 함
- 동일 `KO`에 여러 `EN`이 있으면 특이점으로 표시하고, 해당 `Key`와 `Source`를 보여줌
- `data` 폴더의 파일은 추가/삭제/동일 파일명 업데이트가 가능함
- macOS, Windows에서 실행 가능한 스탠드얼론 앱으로 빌드

## Product Direction

웹 서비스가 아니라 설치형 데스크톱 앱으로 만든다.

권장 기술 스택:

- App shell: Tauri
- UI: React + TypeScript
- Local database: SQLite
- Excel parsing: Rust 또는 TypeScript 기반 xlsx parser
- Packaging target:
  - macOS: `.app`
  - Windows: `.exe` / installer

선정 이유:

- Tauri는 macOS/Windows 크로스플랫폼 데스크톱 앱 빌드에 적합하다.
- 로컬 파일 시스템 접근과 앱 패키징이 쉽다.
- SQLite를 쓰면 glossary 검색과 충돌 탐지가 빠르고 안정적이다.
- 전체 기능이 오프라인 로컬 앱으로 동작 가능하다.

## User Experience

앱의 기본 흐름:

1. 앱 실행
2. glossary 폴더 경로 확인
3. `data` 폴더의 `.xlsx` 파일 스캔
4. 로컬 DB 재구축 또는 갱신
5. 검색창에서 `KO`를 입력해 결과 확인
6. 충돌 항목은 별도 배지와 상세 패널로 확인

기본 화면 구성:

- 상단:
  - 검색 입력창
  - `재색인` 버튼
  - 폴더 경로 표시/변경 버튼
- 좌측 또는 메인:
  - 검색 결과 리스트
- 우측 또는 하단:
  - 선택 항목 상세 정보
- 보조 필터:
  - `용어 우선`
  - `전체 보기`
  - `충돌만 보기`

## Data Scope

초기 버전에서는 다음 규칙을 사용한다:

- `data` 폴더 안의 모든 `.xlsx`를 대상으로 함
- 시트명은 고정하지 않음
- 각 시트에서 첫 행이 `Key`, `Source`, `KO`, `EN` 헤더인지 확인
- 헤더가 맞는 시트/행만 파싱

주의:

- 일부 파일은 대사/문장 데이터도 포함할 수 있다.
- 따라서 "검색 불가"로 막기보다는, 용어 중심 정렬/필터링으로 제어하는 것이 안전하다.

## Functional Requirements

### 1. File Indexing

- `data` 폴더의 `.xlsx` 파일 목록을 읽는다.
- 파일 추가/삭제/수정 시 반영 가능해야 한다.
- 초기 MVP는 `재색인` 버튼 기반 전체 재색인으로 구현한다.
- 이후 자동 감시 기능은 확장 항목으로 둔다.

### 2. Row Parsing

각 row에서 저장할 정보:

- `file_name`
- `sheet_name`
- `row_no`
- `key`
- `source`
- `ko`
- `en`

추가 정규화 필드:

- `ko_normalized`
- `en_normalized`
- `is_term_candidate`

### 3. Search

검색 기준:

- 기본 검색 대상은 `KO`
- 완전 일치 우선
- 부분 포함 검색 지원
- 복합 명사 검색 지원

초기 검색 동작 우선순위:

1. 완전 일치
2. 접두 일치
3. 부분 포함

예시:

- `활` 검색 시 `활`, `활 제작대`, `불타는 활` 등이 조회될 수 있음
- `활 제작대` 검색 시 해당 복합 용어를 우선 상단에 노출

### 4. Term vs Sentence Heuristic

긴 문장보다 용어 위주로 보여주기 위해 휴리스틱을 둔다.

초기 규칙 예시:

- 글자 수가 너무 길면 문장 가능성 높음
- 공백 기준 어절 수가 많으면 문장 가능성 높음
- 마침표/물음표/느낌표 등 문장부호 포함 시 문장 가능성 높음

이 결과를 `is_term_candidate`로 저장하고:

- 기본 보기에서는 용어 후보를 상단 우선 노출
- `전체 보기`를 켜면 문장성 항목도 함께 표시

### 5. Duplicate KO / EN Conflict Detection

핵심 규칙:

- 동일한 `KO`는 동일한 `EN`을 가져야 함

특이점 정의:

- 같은 `KO`에 대해 서로 다른 `EN`이 2개 이상 존재

검색 결과에서 보여줄 정보:

- `KO`
- 대표 `EN`
- 총 건수
- 충돌 여부

충돌 상세에서 보여줄 정보:

- 충돌하는 모든 `EN`
- 각 `EN`과 연결된 `Key`
- 각 `EN`과 연결된 `Source`
- 파일명/시트명/행 번호

### 6. Data Refresh

MVP:

- 사용자가 `재색인` 버튼 클릭 시 전체 DB를 다시 생성

확장:

- 폴더 감시로 자동 업데이트
- 변경된 파일만 선택적으로 재처리

## Non-Functional Requirements

- 오프라인 동작 가능
- 수천~수만 row 수준에서도 검색이 빠를 것
- 데이터 추가/제거 시 앱이 깨지지 않을 것
- 잘못된 시트/빈 행/깨진 행을 만나도 전체 앱이 중단되지 않을 것
- macOS/Windows 양쪽에서 동일한 검색 경험을 제공할 것

## Suggested Database Schema

### entries

- `id` INTEGER PRIMARY KEY
- `file_name` TEXT NOT NULL
- `sheet_name` TEXT NOT NULL
- `row_no` INTEGER NOT NULL
- `key` TEXT
- `source` TEXT
- `ko` TEXT NOT NULL
- `en` TEXT NOT NULL
- `ko_normalized` TEXT NOT NULL
- `en_normalized` TEXT
- `is_term_candidate` INTEGER NOT NULL DEFAULT 1
- `file_modified_at` TEXT
- `file_hash` TEXT

인덱스:

- index on `ko_normalized`
- index on `ko`
- index on `file_name`

### Optional aggregated view: ko_conflicts

용도:

- 특정 `KO`에 대해 서로 다른 `EN` 수를 빠르게 확인

예시 집계 정보:

- `ko_normalized`
- `ko_display`
- `distinct_en_count`
- `entry_count`
- `has_conflict`

## Search Normalization Rules

검색 일관성을 위해 정규화 규칙을 둔다.

초기 규칙:

- 앞뒤 공백 제거
- 연속 공백을 단일 공백으로 축소
- 한글/영문/숫자 외 특수문자 일부 제거 또는 공백 치환
- 대소문자 무시가 필요한 경우 영문만 소문자화

`KO` 검색이 중심이므로, 한글에 손상을 주는 공격적인 정규화는 피한다.

## App Architecture

### Frontend

역할:

- 검색창, 결과 리스트, 상세 패널 렌더링
- 필터 및 정렬 상태 관리
- `재색인`, 폴더 선택, 상태 메시지 표시

추천 화면 요소:

- SearchBar
- FilterToolbar
- ResultList
- ResultDetail
- ReindexStatusBanner

### Backend

역할:

- 폴더 경로 읽기/설정
- `.xlsx` 스캔
- row 파싱
- SQLite 적재
- 검색 쿼리 실행
- 충돌 집계

Tauri command 예시:

- `select_data_dir`
- `get_app_status`
- `reindex_glossary`
- `search_glossary`
- `get_entry_detail`
- `get_conflict_detail`

## MVP Definition

MVP에서 반드시 포함할 기능:

1. `data` 폴더 또는 사용자 지정 폴더 선택
2. `.xlsx` 전체 스캔
3. `Key/Source/KO/EN` 파싱
4. `KO` 검색
5. `KO` 중복-`EN` 충돌 탐지
6. `Key`, `Source`, 파일명, 시트명 표시
7. `재색인` 버튼
8. macOS / Windows 빌드

MVP에서 제외 가능:

- 자동 폴더 감시
- 초성 검색
- 형태소 분석
- EN/Source 보조 검색
- Excel 직접 수정 기능
- 다중 폴더 병합

## Implementation Phases

### Phase 1. Project Bootstrap

- Tauri + React + TypeScript 프로젝트 생성
- 기본 창 실행 확인
- 빌드 타깃 설정 확인

### Phase 2. Data Pipeline

- `.xlsx` 읽기
- 헤더 검증
- row 파싱
- SQLite 저장
- 전체 재색인 구현

### Phase 3. Search Core

- `KO` 검색 쿼리 작성
- 완전/접두/포함 우선순위 정렬
- `is_term_candidate` 기반 정렬

### Phase 4. Conflict Detection

- 동일 `KO`에 대한 `EN` 분기 탐지
- 충돌 배지 표시
- 상세 패널에 관련 `Key`, `Source`, 파일 정보 노출

### Phase 5. Desktop UX

- 폴더 선택
- `재색인` 버튼
- 상태 메시지
- 오류 처리

### Phase 6. Packaging

- macOS 빌드
- Windows 빌드
- 배포용 산출물 정리

## Risk Notes

### 1. 문장과 용어가 섞인 파일

위험:

- 검색 결과가 문장 데이터로 오염될 수 있음

대응:

- 휴리스틱 기반 `용어 우선`
- `전체 보기` 토글 제공

### 2. 동일 헤더가 아닌 파일

위험:

- 일부 파일 구조가 예상과 다를 수 있음

대응:

- 헤더 검증 후 불일치 시 스킵
- 스킵된 파일/시트 수를 상태 메시지로 안내

### 3. 동일 KO, 복수 EN

위험:

- 번역 일관성 검수 포인트가 됨

대응:

- 충돌을 숨기지 않고 적극적으로 노출
- 관련 row를 모두 보여줌

### 4. 폴더 내용 변경

위험:

- 색인 DB와 실제 파일 상태가 어긋날 수 있음

대응:

- 초기에는 `재색인` 버튼 중심
- 이후 자동 감시 추가

## Recommended Next Step

다음 구현 단계는 아래 순서가 가장 안정적이다:

1. Tauri 프로젝트 초기화
2. 샘플 `xlsx`를 읽어 SQLite에 적재
3. CLI 수준 검색 검증
4. UI 연결
5. 충돌 표시 추가
6. 빌드 테스트

## Open Decisions

아직 확정이 필요한 항목:

- 기본 glossary 경로를 프로젝트 내 `data`로 고정할지, 사용자 선택형으로 시작할지
- 긴 문장을 "숨김" 기본값으로 둘지, "표시하되 낮은 우선순위"로 둘지
- 첫 버전에서 EN/Source 보조 검색을 포함할지

현재 추천안:

- 기본 경로는 프로젝트 내 `data`
- 사용자가 다른 폴더로 변경 가능
- 긴 문장은 기본적으로 낮은 우선순위 처리
- 검색은 `KO` 중심으로 먼저 완성
