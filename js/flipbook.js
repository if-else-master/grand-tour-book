/* ============================================================
   FlipBook — 翻頁引擎（支援三種版面）
     'slide'  縱向滑動（手機）           — 單頁
     'flip'   橫向翻書（直式平板 / 窄視窗）— 單頁
     'spread' 攤開雙頁（電腦 / 橫式平板） — 左右兩頁，封面單頁置中
   ============================================================ */
class FlipBook {
  constructor({ bookEl, stageEl, onChange }) {
    this.book = bookEl;
    this.stage = stageEl;
    this.app = document.getElementById('app');
    this.onChange = onChange || (() => {});
    this.pages = [];          // 所有 .page 元素（含封面、留言頁）
    this.index = 0;           // 單頁模式：目前頁碼
    this.view = 0;            // 雙頁模式：目前「視圖」(0=封面, 1=P1/P2, ...)
    this.layout = 'flip';
    this.animating = false;
    this.threshold = 55;
    this._bindGestures();
    this._bindKeys();
  }

  setPages(pageEls) {
    this.pages = pageEls;
    this.index = 0;
    this.view = 0;
    this._mount();
  }

  get total() { return this.pages.length; }
  /* 雙頁模式的視圖總數：封面 1 個 + 內文每 2 頁 1 個 */
  get totalViews() { return this.total <= 1 ? 1 : Math.ceil((this.total - 1) / 2) + 1; }

  get atFirst() { return this.layout === 'spread' ? this.view <= 0 : this.index <= 0; }
  get atLast()  { return this.layout === 'spread' ? this.view >= this.totalViews - 1 : this.index >= this.total - 1; }

  /* ---------- 版面切換 ---------- */
  setLayout(layout) {
    if (layout === this.layout && this._mounted) return;
    // 轉換位置，讓使用者大致停在同一頁
    if (layout === 'spread' && this.layout !== 'spread') {
      this.view = this.index <= 0 ? 0 : Math.ceil(this.index / 2);
    } else if (layout !== 'spread' && this.layout === 'spread') {
      this.index = this.view === 0 ? 0 : Math.min(2 * this.view - 1, this.total - 1);
    }
    this.layout = layout;
    this._mount();
  }

  _mount() {
    this.animating = false;
    this._mounted = true;
    this.book.className = 'book';
    this.app.dataset.layout = this.layout;
    if (this.layout === 'spread') this._mountSpread();
    else this._mountSingle();
  }

  /* ============================================================
     單頁版面（slide / flip）
     ============================================================ */
  _mountSingle() {
    this.book.classList.add(this.layout === 'slide' ? 'mode-slide' : 'mode-flip');
    this.book.replaceChildren(...this.pages);
    this.pages.forEach(p => { p.style.transform = ''; p.classList.remove('in-slot'); });
    this._renderSingle();
  }

  _renderSingle() {
    this.pages.forEach((el, i) => {
      el.classList.remove('is-active', 'is-prev', 'is-next', 'is-flipping', 'flip-forward', 'flip-back');
      if (i === this.index) el.classList.add('is-active');
      else if (i === this.index - 1) el.classList.add('is-prev');
      else if (i === this.index + 1) el.classList.add('is-next');
    });
    this._emitChange();
  }

  _goSingle(dir) {
    const target = this.index + dir;
    if (target < 0 || target >= this.total) return;
    this.animating = true;
    const cur = this.pages[this.index];
    const nextPage = this.pages[target];

    if (this.layout === 'flip') {
      if (dir > 0) {
        nextPage.classList.add('is-next');
        cur.classList.add('is-flipping', 'flip-forward');
      } else {
        nextPage.classList.add('is-prev');
        void nextPage.offsetWidth;
        nextPage.classList.add('is-flipping', 'flip-back');
      }
    } else {
      nextPage.classList.add(dir > 0 ? 'is-next' : 'is-prev');
      void nextPage.offsetWidth;
      cur.classList.add('is-flipping');
      cur.style.transform = dir > 0 ? 'translateY(-100%)' : 'translateY(100%)';
      nextPage.classList.add('is-flipping');
      nextPage.style.transform = 'translateY(0)';
    }

    const animEl = (this.layout === 'flip' && dir < 0) ? nextPage : cur;
    const done = () => {
      this.index = target;
      this.pages.forEach(p => { p.style.transform = ''; });
      this._renderSingle();
      this.animating = false;
    };
    this._once(animEl, done, 800);
  }

  /* ============================================================
     雙頁版面（spread）
     視圖 t：左頁 = P[2t-1]，右頁 = P[2t]（t=0：左空、右=封面）
     ============================================================ */
  _mountSpread() {
    this.book.classList.add('layout-spread');
    this.slotLeft  = document.createElement('div');
    this.slotRight = document.createElement('div');
    this.slotLeft.className  = 'spread-slot slot-left';
    this.slotRight.className = 'spread-slot slot-right';
    this.book.replaceChildren(this.slotLeft, this.slotRight);
    this.pages.forEach(p => { p.style.transform = ''; p.classList.add('in-slot'); });
    this._renderSpread();
  }

  _page(i) { return (i >= 0 && i < this.total) ? this.pages[i] : null; }

  _renderSpread() {
    const t = this.view;
    this.slotLeft.replaceChildren();
    this.slotRight.replaceChildren();
    const isCover = (t === 0);
    this.book.classList.toggle('cover-view', isCover);
    this.app.classList.toggle('at-cover', isCover);

    const lp = this._page(2 * t - 1);
    const rp = this._page(2 * t);
    if (lp) this.slotLeft.appendChild(lp);
    if (rp) this.slotRight.appendChild(rp);
    this._emitChange();
  }

  _goSpread(dir) {
    const t = this.view;
    const target = t + dir;
    if (target < 0 || target >= this.totalViews) return;
    this.animating = true;

    // 建立翻動的「書葉」(兩面)
    const leaf = document.createElement('div');
    leaf.className = 'flip-leaf flipping';
    const front = document.createElement('div');
    const back  = document.createElement('div');
    front.className = 'flip-face face-front';
    back.className  = 'flip-face face-back';
    leaf.append(front, back);

    let frontPage, backPage, revealLeft, revealRight, finalAddCover;

    if (dir > 0) {
      // 向前翻：目前右頁翻向左，露出下一個視圖
      frontPage  = this._page(2 * t);       // 目前右頁（封面時為封面）
      backPage   = this._page(2 * t + 1);   // 翻完後的新左頁
      revealRight = this._page(2 * t + 2);  // 翻動時露出的新右頁
      // 離開封面：書本滑回置中
      this.book.classList.remove('cover-view');
      this.app.classList.remove('at-cover');
      if (frontPage) front.appendChild(frontPage);
      if (backPage)  back.appendChild(backPage);
      this.slotRight.replaceChildren();
      if (revealRight) this.slotRight.appendChild(revealRight);
      // slotLeft 保留目前左頁（會被書葉背面蓋住）
      this.book.appendChild(leaf);
      void leaf.offsetWidth;
      leaf.classList.add('to-left');     // rotateY(0) → -180
    } else {
      // 向後翻：上一個視圖的右頁翻回來
      frontPage  = this._page(2 * target);     // 目標右頁
      backPage   = this._page(2 * t - 1);       // 目前左頁（書葉背面）
      revealLeft = this._page(2 * target - 1);  // 露出的目標左頁
      finalAddCover = (target === 0);
      if (frontPage) front.appendChild(frontPage);
      if (backPage)  back.appendChild(backPage);
      this.slotLeft.replaceChildren();
      if (revealLeft) this.slotLeft.appendChild(revealLeft);
      this.book.appendChild(leaf);
      leaf.classList.add('to-left');     // 先放到左邊 (-180)
      void leaf.offsetWidth;
      leaf.classList.remove('to-left');  // -180 → 0
    }

    const done = () => {
      this.view = target;
      leaf.remove();
      this._renderSpread();              // 重新依視圖擺好左右頁
      this.animating = false;
    };
    this._once(leaf, done, 900);
  }

  /* ---------- 導覽入口 ---------- */
  next() { if (!this.animating) (this.layout === 'spread' ? this._goSpread(1) : this._goSingle(1)); }
  prev() { if (!this.animating) (this.layout === 'spread' ? this._goSpread(-1) : this._goSingle(-1)); }

  goTo(pageIndex) {
    if (this.animating || pageIndex < 0 || pageIndex >= this.total) return;
    if (this.layout === 'spread') {
      this.view = pageIndex <= 0 ? 0 : Math.ceil(pageIndex / 2);
      this._renderSpread();
    } else {
      this.index = pageIndex;
      this._renderSingle();
    }
  }

  /* ---------- 通知外層 ---------- */
  _emitChange() {
    let label, visible;
    if (this.layout === 'spread') {
      if (this.view === 0) { label = '封面'; visible = [0]; }
      else {
        visible = [2 * this.view - 1, 2 * this.view].filter(i => i >= 0 && i < this.total);
        label = visible.map(i => i + 1).join('–') + ' / ' + this.total;
      }
    } else {
      visible = [this.index];
      label = (this.index + 1) + ' / ' + this.total;
    }
    this.onChange({ atFirst: this.atFirst, atLast: this.atLast, label, visible });
  }

  /* ---------- 動畫結束處理（含保險 timeout）---------- */
  _once(el, cb, fallback) {
    let fired = false;
    const handler = () => { if (fired) return; fired = true; el.removeEventListener('transitionend', handler); cb(); };
    el.addEventListener('transitionend', handler, { once: true });
    setTimeout(() => { if (this.animating) handler(); }, fallback);
  }

  /* ---------- 手勢 ----------
     用 Touch Events 偵測觸控滑動（Android 上比 Pointer Events 可靠：
     瀏覽器把觸控判定為捲動時會送出 pointercancel 中斷追蹤，touchend 則照常觸發）。
     滑鼠 / 觸控筆走 Pointer Events。 */
  _bindGestures() {
    let sx = 0, sy = 0, tracking = false, startTop = true, startBottom = true;

    const begin = (x, y) => {
      sx = x; sy = y; tracking = true;
      this._touches = (this._touches || 0) + 1;
      this._dbg = `觸控開始 #${this._touches}`;
      // 在「開始」時記錄內容是否已捲到頂／底（決定該翻頁還是讓它捲動）
      const c = this.layout === 'slide' ? this.pages[this.index]?.querySelector('.page-content') : null;
      startTop = !c || c.scrollTop <= 2;
      startBottom = !c || (c.scrollTop + c.clientHeight >= c.scrollHeight - 2);
    };

    const finish = (x, y) => {
      if (!tracking) return;
      tracking = false;
      const dx = x - sx, dy = y - sy;
      this._dbg = `滑動 dx=${Math.round(dx)} dy=${Math.round(dy)} 頂=${startTop} 底=${startBottom}`;
      if (this.layout === 'slide') {
        if (Math.abs(dy) > this.threshold && Math.abs(dy) > Math.abs(dx)) {
          if (dy < 0 && startBottom) this.next();        // 已在底部往上滑 → 下一頁
          else if (dy > 0 && startTop) this.prev();       // 已在頂部往下滑 → 上一頁
        }
      } else {
        if (Math.abs(dx) > this.threshold && Math.abs(dx) > Math.abs(dy)) {
          dx < 0 ? this.next() : this.prev();
        }
      }
    };

    // 觸控（手機 / 平板）
    this.stage.addEventListener('touchstart', e => {
      const t = e.touches[0]; if (t) begin(t.clientX, t.clientY);
    }, { passive: true });
    this.stage.addEventListener('touchend', e => {
      const t = e.changedTouches[0]; if (t) finish(t.clientX, t.clientY);
    }, { passive: true });
    this.stage.addEventListener('touchcancel', () => { tracking = false; });

    // 滑鼠 / 觸控筆（觸控已由上面處理，避免重複）
    this.stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') begin(e.clientX, e.clientY); });
    this.stage.addEventListener('pointerup',   e => { if (e.pointerType !== 'touch') finish(e.clientX, e.clientY); });

    // 滑鼠橫向滾輪翻頁
    let wheelLock = false;
    this.stage.addEventListener('wheel', e => {
      if (this.layout === 'slide') return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
        if (wheelLock) return;
        wheelLock = true;
        e.deltaX > 0 ? this.next() : this.prev();
        setTimeout(() => wheelLock = false, 800);
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
