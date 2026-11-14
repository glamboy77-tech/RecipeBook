# 레시피북

개인용 레시피를 JSON 파일로 모아 보는 React + Vite 앱입니다. GitHub Pages의 `/RecipeBook/` 경로에 배포하며 PWA 설치와 오프라인 사용을 지원합니다.

## 실행

이 디렉터리에서 실행합니다.

```sh
npm ci
npm run dev
```

```sh
npm run lint
npm test
npm run build
npm run preview
```

## 사용

- 이름·태그·재료로 검색하고 태그 버튼으로 목록을 좁힙니다.
- PC에서는 목록과 상세를 함께, 모바일에서는 목록에서 선택한 상세를 봅니다.
- 인분을 바꾸면 기존 계량 규칙에 따라 재료량이 조정됩니다. 내용 복사에도 선택한 인분이 반영됩니다.
- 준비한 재료를 체크할 수 있습니다. 체크와 인분 변경은 현재 화면에만 적용되며 원본 파일은 바뀌지 않습니다.
- 조리 단계의 시간 버튼을 누르면 타이머가 시작됩니다. 하단에서 여러 타이머를 일시정지·이어하기·초기화할 수 있습니다. 레시피 이동이나 새로고침 후에도 유지되며, 완료 시 화면과 소리로 알립니다. 앱 종료·화면 잠금 중에는 알림 소리가 지연될 수 있습니다.
- 공유 링크의 `?recipe=...`로 해당 요리를 바로 열 수 있습니다.
- 오프라인 사용은 처음 온라인에서 접속해 서비스 워커의 저장이 완료된 뒤 가능합니다. 레시피와 로컬 사진을 함께 저장합니다.

## 레시피와 화면 수정

`public/recipes/index.json`에 레시피 파일명을 등록하고 같은 디렉터리에 JSON을 둡니다. 기존 `ingredient_groups` 및 `ingredients` 형식을 모두 지원합니다. 사진은 JSON의 `image`를 사용하고, 없으면 같은 파일명의 WebP/JPG/PNG/JPEG를 찾은 뒤 기본 이미지로 표시합니다.

- `src/components/RecipeViewer.jsx`: 목록, 검색, 필터, 파일 로드와 URL 이동
- `src/components/RecipeDetail.jsx`: 상세, 인분, 재료 체크와 공유
- `src/components/RecipeImage.jsx`: 이미지 경로와 대체 이미지
- `src/components/TimerProvider.jsx`, `TimerPanel.jsx`, `StepTimer.jsx`: 조리 타이머 상태·소리·화면
- `src/lib/timers.js`: 종료 시각 기반 타이머 계산과 저장 데이터 검증
- `src/lib/recipe.js`: 재료 정규화와 인분 계산
- `src/lib/recipeDisplay.js`: 계량·시간 표시
- `src/index.css`: 색상 변수와 반응형 화면

`src/RecipeViewer.jsx`, `src/RecipeConverter.jsx`는 기존 import 경로를 위한 진입점입니다. GitHub Pages 배포 설정은 `vite.config.js`와 루트의 `.github/workflows/pages.yml`에 있습니다.
