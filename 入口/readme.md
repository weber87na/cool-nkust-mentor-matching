# 3D 捲動房間網站分析

這是一個純靜態網站，主要由 `index.html` 和 4 張 AVIF 圖片組成，不需要打包工具、框架或後端伺服器。頁面透過 CSS 3D transform、perspective、scroll snap 和背景圖片，做出「往下捲動時穿過一間間 3D 房間」的視覺效果。

## 專案結構

```text
.
├── index.html
├── 山.avif
├── 木地板.avif
├── 海.avif
└── 森林.avif
```

## 網站寫法概覽

整個網站都寫在 `index.html` 裡，包含：

- HTML：用多個 `<section class="room">` 表示一間間房間。
- CSS：直接寫在 `<style>` 中，負責 3D 空間、牆面、地板、天花板與文字效果。
- 圖片素材：使用 AVIF 作為牆面與地板貼圖。

頁面沒有 JavaScript，所有互動都依靠瀏覽器的滾動行為和 CSS 視覺效果完成。

## HTML 結構

主要結構如下：

```html
<main class="building">
  <section class="room">
    <div class="room-walls"></div>
    <p class="room-content">hello</p>
  </section>
</main>
```

每個 `.room` 代表一個可停靠的畫面區塊。`.room-walls` 負責產生後牆、左牆、右牆；`.room-content` 則放置每一段置中的文字。

目前一共有 7 個房間，文字依序是：

- `hello`
- `it's me`
- `i was wondering`
- `if after all these years`
- `you'd like to meet`
- `to go over`
- `everything`

## CSS 核心技巧

### 1. CSS 變數控制 3D 深度與文字角度

```css
:root {
  --depth: 500px;
  --turnLeft: 0.06turn;
  --turnRight: -0.06turn;
  --turn: var(--turnRight);
}
```

`--depth` 是房間深度，會影響牆面、天花板、地板延伸的距離。`--turnLeft` 和 `--turnRight` 用來讓文字在奇偶房間之間左右交替傾斜。

### 2. 滾動吸附

```css
body {
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
}

.room {
  scroll-snap-align: center;
}
```

這讓使用者每次往下捲動時，畫面會自然停在下一個房間的中央，形成一頁一頁切換的感覺。

### 3. 3D 場景

```css
body {
  perspective: 1000px;
  perspective-origin: 50% 35%;
}

.building,
.room {
  transform-style: preserve-3d;
}
```

`perspective` 設定觀察者距離，讓 3D 旋轉有近大遠小的透視效果。`transform-style: preserve-3d` 則讓子元素保留在 3D 空間中，而不是被壓平成 2D。

### 4. 天花板與地板

`.room::before` 被當作天花板，`.room::after` 被當作地板：

```css
.room::before {
  transform: rotatex(-89.99999deg) scale(1.001);
  transform-origin: center top;
}

.room::after {
  transform: rotateX(89.99999deg);
  transform-origin: center bottom;
}
```

它們透過接近 `90deg` 的 X 軸旋轉，從平面變成向內延伸的水平面。地板使用 `木地板.avif` 作為背景圖。

程式中使用 `89.99999deg` 而不是剛好 `90deg`，是為了避開 WebKit 瀏覽器的 3D transform 顯示問題。

### 5. 三面牆

`.room-walls` 是後牆：

```css
.room-walls {
  transform: translatez(calc(var(--depth) * -1));
}
```

它被往 Z 軸負方向推到房間後方，背景使用 `海.avif`。

左右牆則用 `.room-walls::before` 和 `.room-walls::after` 產生：

```css
.room-walls::before {
  right: 100%;
  transform: rotatey(89.99999deg);
  transform-origin: right center;
}

.room-walls::after {
  left: 100%;
  transform: rotatey(-89.99999deg);
  transform-origin: left center;
}
```

左牆使用 `山.avif`，右牆使用 `森林.avif`。

### 6. 文字擺放

```css
.room-content {
  display: grid;
  place-content: center;
  transform: translatez(calc(var(--depth) / -2)) rotatey(var(--turn));
}
```

文字被放在房間中央，並往深度方向推進一半，使它位在 3D 房間內部。奇數房間會改用左轉角度：

```css
.room:nth-child(odd) > .room-content {
  --turn: var(--turnLeft);
}
```

## 視覺素材使用

目前圖片用途如下：

- `木地板.avif`：地板材質。
- `海.avif`：後牆背景。
- `山.avif`：左牆背景。
- `森林.avif`：右牆背景。

所有牆面還疊加了 `radial-gradient` 或 `linear-gradient`，用來增加陰影、亮度和踢腳線效果，讓空間感更明顯。

## 如何修改內容

### 修改每一頁文字

直接修改每個 `.room-content` 內的文字即可：

```html
<p class="room-content">新的文字</p>
```

### 增加房間

複製一段 `.room`：

```html
<section class="room">
  <div class="room-walls"></div>
  <p class="room-content">new room</p>
</section>
```

### 更換牆面圖片

修改 CSS 中的 `url(...)`：

```css
url('海.avif') center / cover
```

如果圖片檔名包含中文，建議保持檔案與 HTML 在同一層資料夾，避免路徑或編碼問題。

### 調整房間深度

修改 `--depth`：

```css
--depth: 500px;
```

數值越大，房間越深；數值越小，空間越扁。

## 注意事項

- AVIF 圖片壓縮率高，但較舊瀏覽器可能不支援。
- 這個效果高度依賴 CSS 3D transform，不同瀏覽器可能會有些微渲染差異。
- `html` 設定了 `overflow: hidden`，實際滾動發生在 `body`。
- 頁面標題目前是 `Document`，正式使用時可以改成更符合內容的名稱。
- 所有 CSS 都集中在 HTML 裡，適合小作品；若網站變大，可以拆成獨立的 `style.css`。

## 執行方式

這是純靜態網頁，直接用瀏覽器開啟 `index.html` 即可，不需要安裝依賴。

