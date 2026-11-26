# SQLite Desktop

Rust + Tauri로 만든 SQLite GUI 데스크탑 앱입니다.

## 기능

- SQLite DB 파일 열기 (`.db`, `.sqlite`, `.sqlite3`)
- 테이블 목록 및 스키마(컬럼 정보) 조회
- `SELECT`, `WITH`, `PRAGMA`, `EXPLAIN` 등 읽기 전용 SQL 실행 및 결과 표시

## 개발 환경

- [Rust](https://www.rust-lang.org/)
- [Node.js](https://nodejs.org/)

## 실행

```bash
pnpm install
pnpm tauri dev
```

## 빌드

```bash
pnpm tauri build
```

## 테스트

```bash
pnpm run test:rust
```

Rust 테스트는 `src-tauri/src/tests/`에 분리해 둡니다.

## CI

GitHub Actions는 push, pull request 및 수동 실행에서 다음을 Windows 환경으로 검증합니다.

- ESLint, TypeScript, Knip
- Rust 포맷, Clippy 및 테스트
- Tauri 릴리스 번들 빌드

성공한 실행은 Windows 설치 번들을 7일간 아티팩트로 보관합니다.
