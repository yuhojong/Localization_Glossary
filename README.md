# Navi Localization Glossary

스튜디오나비 글로서리를 검색하는 스탠드얼론 데스크톱 앱 초안이다.

## Current Stack

- Electron
- React
- TypeScript
- xlsx

## Implemented MVP Pieces

- `data` 폴더의 `.xlsx` 파일 읽기
- `Key / Source / KO / EN` 헤더 검증
- `KO` 기준 검색
- 복합 단어 검색 지원
- 용어 우선 표시
- 동일 `KO`에 대한 상이한 `EN` 충돌 감지
- 충돌 상세에 `Key`, `Source`, 파일명, 시트명, 행 번호 표시
- 데이터 폴더 변경
- 전체 재색인

## Project Structure

- `electron/main.js`: Electron main process
- `electron/preload.js`: renderer bridge
- `electron/glossary.js`: xlsx 인덱싱 및 검색 로직
- `src/App.tsx`: UI
- `src/styles.css`: UI 스타일

## Run

의존성 설치 후:

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- 현재 버전은 SQLite 대신 메모리 인덱스를 사용한다.
- Rust가 없는 현재 환경에서도 빠르게 MVP를 올릴 수 있도록 Electron 기반으로 시작했다.
- 이후 필요하면 SQLite 영속 저장 또는 Tauri 전환이 가능하다.
