# 壯遊 — 線上翻頁書

一本可以翻頁的線上書籍，支援電腦、手機、平板（直／橫），用 Markdown 直接編輯內容，部署於 GitHub Pages，最後一頁用 Giscus 留言。

## 線上網址

部署後：`https://if-else-master.github.io/grand-tour-book/`

## 目錄結構（圖片與內容分離）

```
index.html            ← 網站入口
css/
  style.css           ← 版面、封面、圖片定位 class、引導、響應式
  book.css            ← 翻頁動畫引擎樣式
js/
  flipbook.js         ← 翻頁引擎（橫向翻書 / 縱向滑動 + 手勢）
  app.js              ← 載入內容、裝置判斷、留言、設定
content/
  book.json           ← 書本設定（書名、作者、封面、頁面清單）
  pages/*.md          ← 各頁內文（直接編輯）
images/               ← 所有圖片放這裡
```

## 怎麼編輯內容

### 1. 改書本資訊與封面
編輯 `content/book.json`：書名 `title`、副標 `subtitle`、作者 `author`、出版者 `publisher`、年份 `year`、封面圖 `cover.image`、配色 `cover.bgColor/textColor/accentColor`。

### 2. 新增 / 修改頁面
- 在 `content/pages/` 新增 `.md` 檔，寫好 Markdown。
- 到 `book.json` 的 `pages` 陣列裡，依想要的順序加入檔案路徑。

### 3. 目錄頁
`content/pages/01-toc.md` 可直接用 Markdown 編輯。內部跳頁連結寫 `#page-N`（N 從 1 開始，1 = 封面後的第一頁）。

### 4. 放圖片（含位置 / 大小，可複製貼上）
圖片放進 `images/`，在 Markdown 裡用：

```html
<img src="images/你的圖.jpg" class="img-right img-md img-shadow img-round" alt="說明">
```

| 類別 | 可用 class |
|------|-----------|
| 位置 | `img-left`（靠左繞排）`img-right`（靠右繞排）`img-center`（置中） |
| 大小 | `img-sm`(30%) `img-md`(50%) `img-lg`(75%) `img-full`(100%) |
| 樣式 | `img-shadow`（陰影）`img-round`（圓角）`img-border`（白框） |

加圖說用 `<figure>`：
```html
<figure class="img-center img-md">
  <img src="images/你的圖.jpg" alt="">
  <figcaption>這是圖片說明</figcaption>
</figure>
```

## 操作方式（依螢幕自動切換版面）
- **橫向螢幕（電腦、橫式平板）**：左右兩頁攤開，翻頁有整頁翻書動畫；封面維持單頁置中。左右滑動、滾輪、或左右箭頭鍵翻頁。
- **直向平板 / 窄視窗**：單頁翻書動畫，左右滑動翻頁。
- **手機**：上下滑動翻頁（內容捲到頂／底才會翻頁）；下方角落有翻頁按鈕。
- 兩側恆有翻頁按鈕；首次進入會有滑動引導動畫。

## 留言（Giscus）
最後一頁是留言區。需先：
1. 在 repo 開啟 **Settings → Features → Discussions**。
2. 安裝 [giscus app](https://github.com/apps/giscus) 並授權此 repo。
3. 將 `js/app.js` 裡 `GISCUS.repoId` 與 `categoryId` 填為正確值（可在 https://giscus.app 產生）。

## 本地預覽
```bash
python3 -m http.server 8000
# 開 http://localhost:8000
```
