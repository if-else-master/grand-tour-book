/* ============================================================
   app.js — 啟動、載入內容、裝置判斷、引導、留言
   ============================================================ */

/* ── Giscus 設定（部署後由腳本自動填入正確 ID）──────────────
   若要手動設定，到 https://giscus.app 取得下列值貼上即可。 */
const GISCUS = {
  repo: "if-else-master/grand-tour-book",
  repoId: "__GISCUS_REPO_ID__",
  category: "Announcements",
  categoryId: "__GISCUS_CATEGORY_ID__",
  mapping: "specific",
  term: "讀者留言",
  theme: "light",
  lang: "zh-TW"
};

const App = {
  config: null,
  flip: null,

  async init() {
    const appEl = document.getElementById('app');
    const bookEl = document.getElementById('book');
    const stageEl = document.getElementById('stage');

    // 1. 讀取書本設定
    this.config = await fetch('content/book.json').then(r => r.json());
    document.title = this.config.title || '書';
    this._applyCoverVars();

    // 2. 建立翻頁引擎
    this.flip = new FlipBook({
      bookEl, stageEl,
      onChange: (i, total) => this._onPageChange(i, total)
    });

    // 3. 組頁面：封面 → 內文 → 留言頁
    const pages = [];
    pages.push(this._buildCover());

    const mdTexts = await Promise.all(
      (this.config.pages || []).map(p =>
        fetch(p).then(r => r.ok ? r.text() : `# 找不到頁面\n\n\`${p}\``)
      )
    );
    mdTexts.forEach(md => pages.push(this._buildContentPage(md)));

    if (this.config.comments?.enabled) pages.push(this._buildCommentsPage());

    this.flip.setPages(pages);

    // 4. 裝置判斷 + 監聽
    this._applyDeviceMode();
    window.addEventListener('resize', () => this._applyDeviceMode());
    window.addEventListener('orientationchange', () => setTimeout(() => this._applyDeviceMode(), 200));

    // 5. 按鈕、目錄連結、引導
    this._bindNav();
    this._bindTocLinks(bookEl);
    this._setupGuide();

    // 6. 收掉載入畫面
    appEl.classList.remove('loading');
    document.getElementById('splash').classList.add('hide');
  },

  _applyCoverVars() {
    const c = this.config.cover || {};
    const r = document.documentElement.style;
    if (c.bgColor) r.setProperty('--cover-bg', c.bgColor);
    if (c.textColor) r.setProperty('--cover-text', c.textColor);
    if (c.accentColor) r.setProperty('--accent', c.accentColor);
  },

  /* ---------- 封面 ---------- */
  _buildCover() {
    const c = this.config;
    const cv = c.cover || {};
    const el = document.createElement('div');
    el.className = 'page is-cover';
    el.innerHTML = `
      <div class="cover">
        ${cv.image ? `<div class="cover-art"><img src="${cv.image}" alt=""></div>` : ''}
        <div class="cover-overlay">
          <div class="cover-top">
            <div class="cover-kicker">${c.publisher || ''}</div>
            <h1 class="cover-title">${c.title || ''}</h1>
            <div class="cover-rule"></div>
            <div class="cover-sub">${c.subtitle || ''}</div>
          </div>
          <div class="cover-bottom">
            <div class="cover-author"><small>著　　者</small>${c.author || ''}</div>
            <div class="cover-pub">${c.year || ''}</div>
          </div>
        </div>
      </div>`;
    return el;
  },

  /* ---------- 內文頁 ---------- */
  _buildContentPage(md) {
    const el = document.createElement('div');
    el.className = 'page';
    const html = window.marked ? marked.parse(md) : md;
    el.innerHTML = `<div class="page-content">${html}</div>`;
    return el;
  },

  /* ---------- 留言頁 ---------- */
  _buildCommentsPage() {
    const cm = this.config.comments || {};
    const el = document.createElement('div');
    el.className = 'page comments-page';
    el.dataset.comments = '1';
    el.innerHTML = `
      <div class="page-content">
        <h1>${cm.title || '留言'}</h1>
        <p class="comments-intro">${cm.intro || ''}</p>
        <div class="giscus" id="giscusBox"></div>
        <p class="giscus-fallback" id="giscusFallback" hidden>
          留言區尚未啟用。請於 GitHub repo 開啟 Discussions 並安裝
          <a href="https://github.com/apps/giscus" target="_blank" rel="noopener">giscus app</a>。
        </p>
      </div>`;
    return el;
  },

  _loadGiscus() {
    if (this._giscusLoaded) return;
    this._giscusLoaded = true;
    const box = document.getElementById('giscusBox');
    if (!box) return;
    if (GISCUS.repoId.startsWith('__') || GISCUS.categoryId.startsWith('__')) {
      document.getElementById('giscusFallback').hidden = false;
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true; s.crossOrigin = 'anonymous';
    Object.assign(s.dataset, {
      repo: GISCUS.repo, repoId: GISCUS.repoId,
      category: GISCUS.category, categoryId: GISCUS.categoryId,
      mapping: GISCUS.mapping, term: GISCUS.term,
      strict: '0', reactionsEnabled: '1', emitMetadata: '0',
      inputPosition: 'top', theme: GISCUS.theme, lang: GISCUS.lang, loading: 'lazy'
    });
    box.appendChild(s);
  },

  /* ---------- 裝置模式 ---------- */
  _applyDeviceMode() {
    const w = window.innerWidth, h = window.innerHeight;
    const short = Math.min(w, h);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let mode;
    if (short < 600) mode = 'mobile';
    else if (coarse) mode = 'tablet';
    else mode = 'desktop';

    const appEl = document.getElementById('app');
    appEl.dataset.mode = mode;
    appEl.dataset.orient = w > h ? 'landscape' : 'portrait';

    const flipMode = (mode === 'mobile') ? 'slide' : 'flip';
    if (this.flip && this.flip.mode !== flipMode) this.flip.setMode(flipMode);
    else if (this.flip && !this.flip.book.classList.contains('mode-flip') && !this.flip.book.classList.contains('mode-slide')) {
      this.flip.setMode(flipMode);
    }
    this._deviceMode = mode;
  },

  /* ---------- 導覽 ---------- */
  _bindNav() {
    document.getElementById('btnPrev').addEventListener('click', () => this.flip.prev());
    document.getElementById('btnNext').addEventListener('click', () => this.flip.next());
  },

  _onPageChange(i, total) {
    document.getElementById('pageNum').textContent = i + 1;
    document.getElementById('pageTotal').textContent = total;
    document.getElementById('btnPrev').disabled = this.flip.atFirst;
    document.getElementById('btnNext').disabled = this.flip.atLast;
    // 翻到留言頁才載入 giscus
    const page = this.flip.pages[i];
    if (page && page.dataset.comments) this._loadGiscus();
  },

  _bindTocLinks(bookEl) {
    bookEl.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#page-"]');
      if (!a) return;
      e.preventDefault();
      const n = parseInt(a.getAttribute('href').replace('#page-', ''), 10);
      if (!isNaN(n)) this.flip.goTo(n);
    });
  },

  /* ---------- 引導動畫 ---------- */
  _setupGuide() {
    const guide = document.getElementById('guide');
    const txt = document.getElementById('guideText');
    const seen = localStorage.getItem('book_guide_seen');
    if (seen) return;

    const isMobile = this._deviceMode === 'mobile';
    guide.classList.add(isMobile ? 'swipe-v' : 'swipe-h');
    txt.textContent = isMobile ? '上下滑動翻頁' : '左右滑動（或滾動）翻頁';
    guide.hidden = false;

    const close = () => {
      guide.hidden = true;
      localStorage.setItem('book_guide_seen', '1');
    };
    document.getElementById('guideClose').addEventListener('click', close);
    setTimeout(close, 6000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
