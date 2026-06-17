/* ============================================================
   FlipBook — 翻頁引擎
   模式：
     'flip'  橫向翻書（電腦 / 平板）
     'slide' 縱向滑動（手機）
   ============================================================ */
class FlipBook {
  constructor({ bookEl, stageEl, onChange }) {
    this.book = bookEl;
    this.stage = stageEl;
    this.onChange = onChange || (() => {});
    this.pages = [];          // DOM .page 元素
    this.index = 0;
    this.mode = 'flip';
    this.animating = false;
    this.threshold = 55;      // 觸發翻頁的滑動距離 (px)
    this._bindGestures();
    this._bindKeys();
  }

  /* 設定模式：'flip' | 'slide' */
  setMode(mode) {
    this.mode = mode;
    this.book.classList.toggle('mode-flip', mode === 'flip');
    this.book.classList.toggle('mode-slide', mode === 'slide');
    this.render(true);
  }

  /* 載入頁面（傳入 DOM 元素陣列） */
  setPages(pageEls) {
    this.book.innerHTML = '';
    this.pages = pageEls;
    pageEls.forEach(el => this.book.appendChild(el));
    this.index = 0;
    this.render(true);
  }

  get total() { return this.pages.length; }
  get atFirst() { return this.index <= 0; }
  get atLast()  { return this.index >= this.total - 1; }

  /* 根據目前 index 設定每頁的狀態 class */
  render(immediate = false) {
    this.pages.forEach((el, i) => {
      el.classList.remove('is-active', 'is-prev', 'is-next', 'is-flipping', 'flip-forward', 'flip-back', 'dragging');
      if (i === this.index) el.classList.add('is-active');
      else if (i === this.index - 1) el.classList.add('is-prev');
      else if (i === this.index + 1) el.classList.add('is-next');
    });
    this.onChange(this.index, this.total);
  }

  next() { this._go(1); }
  prev() { this._go(-1); }

  goTo(i) {
    if (i < 0 || i >= this.total || i === this.index || this.animating) return;
    this.index = i;
    this.render(true);
  }

  _go(dir) {
    if (this.animating) return;
    const target = this.index + dir;
    if (target < 0 || target >= this.total) return;

    this.animating = true;
    const cur = this.pages[this.index];
    const nextPage = this.pages[target];

    if (this.mode === 'flip') {
      if (dir > 0) {
        // 向前：目前頁向左翻走，露出下一頁
        nextPage.classList.add('is-next');
        cur.classList.add('is-flipping', 'flip-forward');
      } else {
        // 向後：上一頁翻回來蓋住目前頁
        nextPage.classList.add('is-prev');
        // 強制 reflow 後再切換，確保從 -180deg 開始動畫
        void nextPage.offsetWidth;
        nextPage.classList.add('is-flipping', 'flip-back');
      }
    } else {
      // slide 模式
      nextPage.classList.add(dir > 0 ? 'is-next' : 'is-prev');
      void nextPage.offsetWidth;
      cur.classList.add('is-flipping');
      // 用 transform 直接位移
      cur.style.transform = dir > 0 ? 'translateY(-100%)' : 'translateY(100%)';
      nextPage.classList.add('is-flipping');
      nextPage.style.transform = 'translateY(0)';
    }

    const animEl = (this.mode === 'flip' && dir < 0) ? nextPage : cur;
    const done = () => {
      animEl.removeEventListener('transitionend', done);
      this.index = target;
      // 清除 inline transform（slide 模式用）
      this.pages.forEach(p => { p.style.transform = ''; });
      this.render(true);
      this.animating = false;
    };
    animEl.addEventListener('transitionend', done, { once: true });
    // 保險：動畫若沒觸發 transitionend
    setTimeout(() => { if (this.animating) done(); }, 750);
  }

  /* ---------- 手勢 ---------- */
  _bindGestures() {
    let sx = 0, sy = 0, tracking = false, decided = null;

    const start = (x, y) => { sx = x; sy = y; tracking = true; decided = null; };

    const end = (x, y) => {
      if (!tracking) return;
      tracking = false;
      const dx = x - sx, dy = y - sy;

      if (this.mode === 'flip') {
        if (Math.abs(dx) > this.threshold && Math.abs(dx) > Math.abs(dy)) {
          dx < 0 ? this.next() : this.prev();
        }
      } else {
        // slide：只有在內容捲到邊界時才翻頁
        if (Math.abs(dy) > this.threshold && Math.abs(dy) > Math.abs(dx)) {
          const content = this.pages[this.index]?.querySelector('.page-content');
          const atTop = !content || content.scrollTop <= 2;
          const atBottom = !content || (content.scrollTop + content.clientHeight >= content.scrollHeight - 2);
          if (dy < 0 && atBottom) this.next();
          else if (dy > 0 && atTop) this.prev();
        }
      }
    };

    // Pointer events（涵蓋滑鼠 + 觸控 + 觸控筆）
    this.stage.addEventListener('pointerdown', e => start(e.clientX, e.clientY));
    this.stage.addEventListener('pointerup',   e => end(e.clientX, e.clientY));
    this.stage.addEventListener('pointercancel', () => { tracking = false; });

    // 滑鼠滾輪（電腦）翻頁
    let wheelLock = false;
    this.stage.addEventListener('wheel', e => {
      if (this.mode !== 'flip') return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
        if (wheelLock) return;
        wheelLock = true;
        e.deltaX > 0 ? this.next() : this.prev();
        setTimeout(() => wheelLock = false, 700);
      }
    }, { passive: true });
  }

  _bindKeys() {
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') this.next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp'   || e.key === 'PageUp')   this.prev();
    });
  }
}

window.FlipBook = FlipBook;
