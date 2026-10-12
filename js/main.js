(() => {
  /* ===== Отправка заявок: AJAX POST на php/formProcessor.php (ответ «1»/«2» — успех) ===== */
  const LEADS_URL = 'php/formProcessor.php';

  /* UTM-метки запоминаем на время сессии, чтобы они доехали до заявки с любой страницы */
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const readUtm = () => {
    const out = {};
    let stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('utm') || '{}'); } catch (e) { stored = {}; }
    const params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach((k) => {
      if (params.get(k)) stored[k] = params.get(k);
      if (stored[k]) out[k] = stored[k];
    });
    try { sessionStorage.setItem('utm', JSON.stringify(stored)); } catch (e) { /* без хранилища */ }
    return out;
  };
  readUtm();

  /**
   * Отправляет заявку. fields — поля формы (phone, form_title, ...); служебные (page_url, utm_*, device_type) добавляются сами.
   * Возвращает true при успехе. Адрес можно переопределить атрибутом data-endpoint у формы.
   */
  const sendLead = async (fields, endpoint) => {
    const body = new URLSearchParams();
    Object.entries({
      ...fields,
      page_url: window.location.href,
      device_type: window.matchMedia('(max-width: 1023px)').matches ? 'mobile' : 'desktop',
      ...readUtm(),
    }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') body.append(k, v);
    });
    const res = await fetch(endpoint || LEADS_URL, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body,
    });
    const text = (await res.text()).trim();
    return res.ok && (text === '1' || text === '2');
  };

  /* Название формы для письма: заголовок рядом с формой или заголовок страницы */
  const formTitle = (form) => {
    const h = form.querySelector('h1, h2, .franchise-cta__title, .consult__form-title, .cta__title, .modal__title');
    const src = h ? (h.querySelector('.bb-d') || h) : null;
    return (src ? src.textContent : document.title).replace(/\s+/g, ' ').trim();
  };

  const header = document.querySelector('.header');
  const menu = document.querySelector('.menu');

  /* Шапка: после прокрутки становится светлой */
  const SCROLL_OFFSET = 10;
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > SCROLL_OFFSET || header.dataset.always === 'true');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Плавный скролл только для якорных ссылок (CSS scroll-behavior: smooth делает колёсико мыши рваным) */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    const id = link && link.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target || e.defaultPrevented) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    history.pushState(null, '', '#' + id);
  });

  /* Бургер-меню */
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('is-locked', open);
  };

  document.querySelectorAll('[data-menu-open]').forEach((btn) => btn.addEventListener('click', () => setMenu(true)));
  document.querySelectorAll('[data-menu-close]').forEach((el) => el.addEventListener('click', () => setMenu(false)));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

  /* Аккордеон в меню */
  menu.querySelectorAll('.menu__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const group = toggle.closest('.menu__group');
      const closed = group.classList.toggle('is-closed');
      toggle.setAttribute('aria-expanded', String(!closed));
    });
  });

  /* Плашка «+N» на проектах: N = все фото группы минус показанные; нет скрытых — плашка убирается */
  document.querySelectorAll('[data-more]').forEach((badge) => {
    const photos = badge.closest('.prj-photos');
    const group = badge.closest('a').dataset.fancybox;
    const total = photos.querySelectorAll(`[data-fancybox="${group}"]`).length;
    const shown = photos.querySelectorAll('.prj-photos__item').length;
    const rest = total - shown;
    if (rest > 0) badge.textContent = `+${rest}`;
    else badge.remove();
  });

  /* Отзывы: «Читать целиком» раскрывает текст карточки */
  document.querySelectorAll('.rv-card__more').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.closest('.rv-card').classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* Галерея: фото раскрываются по клику (Fancybox) */
  if (window.Fancybox) {
    Fancybox.bind('[data-fancybox]', {
      Hash: false,
      Thumbs: { type: 'classic' },
      l10n: {
        CLOSE: 'Закрыть',
        NEXT: 'Дальше',
        PREV: 'Назад',
        MODAL: 'Можно закрыть окно клавишей ESC',
        ERROR: 'Не удалось загрузить фото',
        IMAGE_ERROR: 'Изображение не найдено',
        ELEMENT_NOT_FOUND: 'HTML-элемент не найден',
        AJAX_NOT_FOUND: 'Ошибка загрузки',
        AJAX_FORBIDDEN: 'Ошибка загрузки',
        IFRAME_ERROR: 'Ошибка загрузки страницы',
        TOGGLE_ZOOM: 'Увеличить',
        TOGGLE_THUMBS: 'Миниатюры',
        TOGGLE_SLIDESHOW: 'Слайд-шоу',
        TOGGLE_FULLSCREEN: 'На весь экран',
        DOWNLOAD: 'Скачать',
      },
    });
  }

  /* Слайдер на главной */
  const heroSlider = document.querySelector('.hero-slider');
  if (heroSlider && window.Swiper) {
    new Swiper(heroSlider, {
      loop: true,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: 700,
      autoplay: { delay: 5000, disableOnInteraction: false },
      pagination: { el: '.hero-pagination', clickable: true },
      a11y: false,
    });
  }

  /* Слайдер проектов на внутренних страницах */
  if (window.Swiper) {
    document.querySelectorAll('.projects-slider').forEach((slider) => {
      new Swiper(slider, {
        slidesPerView: 'auto',
        spaceBetween: 20,
        grabCursor: true,
      });
    });
  }

  /* Галерея «Пример объекта»: большой слайдер + миниатюры */
  const exampleMain = document.querySelector('.example-main');
  const exampleThumbs = document.querySelector('.example-thumbs');
  if (exampleMain && exampleThumbs && window.Swiper) {
    const thumbsSwiper = new Swiper(exampleThumbs, {
      slidesPerView: 4,
      spaceBetween: 10,
      watchSlidesProgress: true,
      breakpoints: { 1024: { spaceBetween: 17 } },
    });

    new Swiper(exampleMain, {
      spaceBetween: 10,
      navigation: {
        prevEl: '.example-main__nav--prev',
        nextEl: '.example-main__nav--next',
      },
      thumbs: { swiper: thumbsSwiper },
    });
  }

  /* Подчёркивания заголовков: прочерчиваются при появлении в окне (один раз), работает для любого .section-title__line */
  const titleLines = document.querySelectorAll('.section-title__line');
  if (titleLines.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const lineObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        lineObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -15% 0px' });

    titleLines.forEach((line) => {
      line.classList.add('is-ready');
      lineObserver.observe(line);
    });
  }

  /* Жёлтые черты слева от блоков (.accent-bar): «вырастают» сверху вниз при появлении в окне (один раз) */
  const accentBars = document.querySelectorAll('.accent-bar');
  if (accentBars.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        barObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    accentBars.forEach((bar) => {
      bar.classList.add('is-ready');
      barObserver.observe(bar);
    });
  }

  /* Таймлайн: линии и этапы рисуются при появлении в окне (один раз) */
  const timeline = document.querySelector('.timeline__list');
  if (timeline && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if ('IntersectionObserver' in window) {
      timeline.classList.add('is-ready');
      const observer = new IntersectionObserver((entries, obs) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          timeline.classList.add('is-visible');
          obs.disconnect();
        }
      }, { threshold: 0.35 });
      observer.observe(timeline);
    }
  }

  /* Фильтр проектов: показываем карточки нужной категории */
  const filterButtons = document.querySelectorAll('.prj-filters .chip');
  if (filterButtons.length) {
    const cards = document.querySelectorAll('.prj-card');
    const empty = document.getElementById('prj-empty');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.filter;
        filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        let shown = 0;
        cards.forEach((card) => {
          const visible = type === 'all' || card.dataset.category === type;
          card.hidden = !visible;
          if (visible) shown += 1;
        });
        if (empty) empty.classList.toggle('is-shown', shown === 0);
      });
    });
  }

  /* Дополнительные опции: фильтр по типу бани и разделу, «Смотреть ещё» на мобильной */
  const optCols = document.querySelector('.opt-cols');
  if (optCols) {
    const optCards = [...optCols.querySelectorAll('.opt-card')];
    const typeBtns = [...document.querySelectorAll('[data-opt-type]')];
    const catBtns = [...document.querySelectorAll('[data-opt-cat]')];
    const optTitle = document.getElementById('opt-title');
    const optEmpty = document.getElementById('opt-empty');
    const state = { type: 'bochka', cat: 'outer' };

    const applyOpt = () => {
      let shown = 0;
      optCards.forEach((card) => {
        const okType = card.dataset.type.split(' ').includes(state.type);
        const okCat = state.cat === 'all' || card.dataset.cat === state.cat;
        card.hidden = !(okType && okCat);
        if (!card.hidden) shown += 1;
      });
      optEmpty.classList.toggle('is-shown', shown === 0);
    };

    typeBtns.forEach((btn) => btn.addEventListener('click', () => {
      state.type = btn.dataset.optType;
      typeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      applyOpt();
    }));
    catBtns.forEach((btn) => btn.addEventListener('click', () => {
      state.cat = btn.dataset.optCat;
      catBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      optTitle.textContent = btn.textContent;
      applyOpt();
    }));

    const optMore = document.querySelector('.opt-more');
    if (optMore) {
      optMore.addEventListener('click', () => {
        optCols.classList.add('is-expanded');
        optMore.hidden = true;
      });
    }
  }

  /* Контакты: «Показать ещё» открывает галерею группы во Fancybox */
  document.querySelectorAll('[data-gallery]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const first = document.querySelector(`[data-fancybox="${btn.dataset.gallery}"]`);
      if (first) first.click();
    });
  });

  /* Бани-бочки: квиз из 5 шагов. На каждом шаге нужно выбрать ответ; в конце всё уходит одной заявкой.
     Адрес приёма — data-endpoint у формы (POST, JSON); пока он не задан, заявка только выводится в консоль. */
  document.querySelectorAll('[data-quiz]').forEach((quiz) => {
    const panes = [...quiz.querySelectorAll('[data-pane]')];
    const total = panes.length;
    const num = quiz.querySelector('[data-quiz-num]');
    const left = quiz.querySelector('[data-quiz-left]');
    const back = quiz.querySelector('[data-quiz-back]');
    const next = quiz.querySelector('[data-quiz-next]');
    const error = quiz.querySelector('[data-quiz-error]');
    const thanks = quiz.querySelector('[data-quiz-thanks]');
    const phone = quiz.querySelector('input[type="tel"]');
    const words = { 1: 'вопрос', 2: 'вопроса', 3: 'вопроса', 4: 'вопроса', 5: 'вопросов' };
    let step = 1;

    const answered = () => {
      const pane = panes[step - 1];
      return !pane.querySelector('input[type="radio"]') || !!pane.querySelector('input[type="radio"]:checked');
    };

    const render = () => {
      quiz.dataset.step = String(step);
      panes.forEach((pane) => pane.classList.toggle('is-active', Number(pane.dataset.pane) === step));
      if (num) num.textContent = String(step);
      const rest = total - step + 1;
      if (left) left.innerHTML = `Осталось <b>${rest} ${words[rest]}</b>`;
      next.disabled = step < total && !answered();
    };

    quiz.addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"]')) {
        next.disabled = !answered();
        if (error) error.hidden = true;
      }
    });
    next.addEventListener('click', () => {
      if (step < total && answered()) { step += 1; render(); }
    });
    back.addEventListener('click', () => {
      if (step > 1) { step -= 1; render(); }
    });

    quiz.addEventListener('submit', async (e) => {
      e.preventDefault();
      const digits = phone ? phone.value.replace(/\D/g, '') : '';
      if (digits.length < 11) {
        error.textContent = 'Введите номер телефона полностью';
        error.hidden = false;
        phone.focus();
        return;
      }
      const data = new FormData(quiz);
      const button = quiz.querySelector('.bb-quiz__send');
      button.disabled = true;
      try {
        const ok = await sendLead({
          phone: phone.value,
          form_title: formTitle(quiz),
          form_button: button.textContent.trim(),
          quiz_people: data.get('people'),
          quiz_shape: data.get('shape'),
          quiz_rooms: data.get('rooms'),
          quiz_when: data.get('when'),
          quiz_via: data.get('via') === 'phone' ? 'Перезвонить' : 'Whatsapp',
        }, quiz.dataset.endpoint);
        if (!ok) throw new Error('send');
        quiz.dataset.step = 'done';
        panes.forEach((pane) => pane.classList.remove('is-active'));
        thanks.hidden = false;
      } catch (err) {
        error.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам';
        error.hidden = false;
        button.disabled = false;
      }
    });
    render();
  });

  /* Бани-бочки: переключение схемы комплектации (внешняя / внутренняя отделка) */
  const diagTabs = document.querySelectorAll('[data-diag-tab]');
  if (diagTabs.length) {
    const cards = document.querySelectorAll('[data-diag]');
    diagTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        diagTabs.forEach((t) => t.classList.toggle('is-active', t === tab));
        cards.forEach((card) => { card.hidden = card.dataset.diag !== tab.dataset.diagTab; });
      });
    });
  }

  /* Бани-бочки: частые вопросы (аккордеон — открыт один пункт, повторный клик закрывает) */
  document.querySelectorAll('.bb-faq__list').forEach((list) => {
    const items = [...list.querySelectorAll('.bb-faq__item')];
    items.forEach((item) => {
      const btn = item.querySelector('.bb-faq__q');
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((other) => {
          const isThis = other === item;
          other.classList.toggle('is-open', isThis && open);
          other.querySelector('.bb-faq__q').setAttribute('aria-expanded', String(isThis && open));
        });
      });
    });
  });

  /* Модальные окна: [data-modal-open="id"] открывает #modal-id, [data-modal-close] / Esc / клик по фону закрывают */
  const modals = [...document.querySelectorAll('.modal')];
  if (modals.length) {
    let lastFocus = null;
    const openModal = (name, trigger) => {
      const modal = document.getElementById(`modal-${name}`);
      if (!modal) return;
      const card = trigger && trigger.closest('.project-card, .bb-opt, .opt-card, .prj-card');
      const titleEl = card && card.querySelector('.project-card__title, .bb-opt__name, .opt-card__title, .prj-name');
      modal.dataset.source = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
      closeModals(true);
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('is-modal');
      void modal.offsetWidth;
      modal.classList.add('is-open');
      const box = modal.querySelector('.modal__box');
      const first = modal.querySelector('input[type="tel"]') || box;
      if (first === box) box.setAttribute('tabindex', '-1');
      first.focus({ preventScroll: true });
    };
    function closeModals(keepLock) {
      modals.forEach((modal) => {
        if (modal.hidden) return;
        modal.classList.remove('is-open');
        const hide = () => { modal.hidden = true; };
        if (keepLock) hide(); else setTimeout(hide, 250);
      });
      if (!keepLock) {
        document.body.classList.remove('is-modal');
        if (lastFocus) lastFocus.focus({ preventScroll: true });
      }
    }
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-modal-open]');
      if (opener) { e.preventDefault(); openModal(opener.dataset.modalOpen, opener); return; }
      if (e.target.closest('[data-modal-close]')) closeModals();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

    /* Форма консультации: проверка телефона и сообщение об отправке (адрес приёма — data-endpoint на форме) */
    modals.forEach((modal) => {
      const form = modal.querySelector('form');
      if (!form) return;
      const phone = form.querySelector('input[type="tel"]');
      const error = form.querySelector('[data-modal-error]');
      const done = form.querySelector('[data-modal-done]');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (phone.value.replace(/\D/g, '').length < 11) {
          phone.classList.add('is-error');
          error.textContent = 'Введите номер телефона полностью';
          error.hidden = false;
          phone.focus();
          return;
        }
        try {
          const opener = modal.dataset.source || '';
          const ok = await sendLead({
            phone: phone.value,
            form_title: formTitle(form),
            form_button: form.querySelector('[type="submit"]').textContent.trim(),
            product: opener,
          }, form.dataset.endpoint);
          if (!ok) throw new Error('send');
          done.hidden = false;
        } catch (err) {
          error.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз';
          error.hidden = false;
        }
      });
      phone.addEventListener('input', () => { phone.classList.remove('is-error'); error.hidden = true; });
    });
  }

  /* Детальная страница: вкладки / аккордеон комплектации и счётчик «+N» на фото */
  const acc = document.querySelector('[data-acc]');
  if (acc) {
    const cats = [...acc.querySelectorAll('.dt-cat')];
    cats.forEach((cat) => {
      cat.querySelector('.dt-cat__btn').addEventListener('click', () => {
        const mobile = window.matchMedia('(max-width: 1023px)').matches;
        const willOpen = mobile ? !cat.classList.contains('is-open') : true;
        cats.forEach((c) => {
          const on = c === cat && willOpen;
          c.classList.toggle('is-open', on);
          c.querySelector('.dt-cat__btn').setAttribute('aria-expanded', String(on));
        });
      });
    });
  }

  const dtPhotos = document.querySelector('.dt-photos');
  if (dtPhotos) {
    const total = dtPhotos.querySelectorAll('[data-fancybox]').length;
    const setCount = (sel, shown) => {
      const el = dtPhotos.querySelector(sel);
      if (!el) return;
      if (total - shown > 0) el.textContent = `+${total - shown}`; else el.remove();
    };
    setCount('[data-more-d]', 2);
    setCount('[data-more-m]', 3);
  }

  /* Видеоотзывы: по клику на постер подставляем YouTube-плеер (youtube-nocookie, автозапуск) */
  document.querySelectorAll('.review__video').forEach((box) => {
    box.addEventListener('click', () => {
      const id = box.dataset.youtube;
      if (!id || box.querySelector('iframe')) return;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      frame.title = box.dataset.title || 'Видеоотзыв';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      box.replaceChildren(frame);
    });
  });

  /* Обычные формы на страницах (только телефон): отправка без перезагрузки, сообщение под формой */
  document.querySelectorAll('form').forEach((form) => {
    if (form.matches('[data-quiz], .modal__box') || !form.querySelector('input[type="tel"]')) return;
    const phone = form.querySelector('input[type="tel"]');
    const submit = form.querySelector('[type="submit"]');
    const status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    form.append(status);
    const show = (text, isError) => {
      status.textContent = text;
      status.classList.toggle('form-status--error', !!isError);
      status.hidden = false;
    };
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (phone.value.replace(/\D/g, '').length < 11) {
        show('Введите номер телефона полностью', true);
        phone.focus();
        return;
      }
      submit.disabled = true;
      try {
        const ok = await sendLead({
          phone: phone.value,
          form_title: formTitle(form),
          form_button: submit.textContent.trim(),
        }, form.dataset.endpoint);
        if (!ok) throw new Error('send');
        form.reset();
        phone.dispatchEvent(new Event('input', { bubbles: true }));
        show('Спасибо! Заявка отправлена, менеджер перезвонит в течение 10 минут.');
      } catch (err) {
        show('Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам.', true);
      } finally {
        submit.disabled = false;
      }
    });
    phone.addEventListener('input', () => { status.hidden = true; });
  });

  /* Маска телефона */
  if (window.IMask) {
    document.querySelectorAll('input[type="tel"]').forEach((input) => {
      const mask = IMask(input, {
        mask: '+{7} (000) 000-00-00',
        // «8…» и «+7…» в начале (набор или вставка) не дублируем с кодом страны из маски
        prepare: (str, masked) => {
          const digits = str.replace(/\D/g, '');
          const hasCode = masked.unmaskedValue === '' || masked.unmaskedValue === '7';
          return hasCode && /^[78]/.test(digits) ? digits.slice(1) : str;
        },
      });

      input.addEventListener('focus', () => {
        if (!input.value) {
          mask.value = '+7';
          mask.updateControl();
        }
      });
      input.addEventListener('blur', () => {
        if (input.value === '+7' || input.value === '+7 (') {
          mask.value = '';
          mask.updateControl();
        }
      });

      /* Подсказка: «+7» белым, остальное серым (обычный placeholder так окрасить нельзя) */
      const hint = document.createElement('span');
      hint.className = 'phone-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = '<b>+7</b> (000) 000-00-00';
      input.removeAttribute('placeholder');
      input.after(hint);

      const place = () => {
        const cs = getComputedStyle(input);
        hint.style.left = `${input.offsetLeft + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)}px`;
        hint.style.top = `${input.offsetTop}px`;
        hint.style.height = `${input.offsetHeight}px`;
        hint.style.fontSize = cs.fontSize;
        hint.style.display = !input.value && document.activeElement !== input && input.offsetParent ? 'flex' : 'none';
      };
      ['focus', 'blur', 'input'].forEach((ev) => input.addEventListener(ev, place));
      window.addEventListener('resize', place);
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(input);
      place();
    });
  }
})();
