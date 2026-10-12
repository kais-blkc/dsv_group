/* Десктопный макет нарисован под 1920px. На экранах ≤1400px он слишком крупный (текст 20px, большие блоки),
   поэтому масштабируем всю вёрстку целиком через CSS zoom — как если бы дизайнер сделал отдельный макет:
   - до 1400px включительно: масштаб 0.8 (текст 20px → 16px, 16px → 12.8px и т.д.);
   - если при таком масштабе контейнер (1360px) не помещается в окно — масштаб уменьшается ровно настолько, чтобы поместился;
   - ≤1023px — мобильная вёрстка (css), масштабирование выключено; ≥1401px — обычный макет.
   --vw — «логическая» ширина окна для элементов на всю ширину (в zoom-режиме 100vw даёт неверное значение). */
(() => {
  const MIN = 1024;
  const MAX = 1400;
  const SCALE = 0.8;
  const CONTAINER = 1360;
  const GUTTER = 48;
  const root = document.documentElement;

  const apply = () => {
    const w = window.innerWidth;
    if (w < MIN || w > MAX) {
      root.classList.remove('is-scaled');
      root.style.zoom = '';
      root.style.removeProperty('--vw');
      return;
    }
    const zoom = Math.min(SCALE, (w - GUTTER) / CONTAINER);
    root.classList.add('is-scaled');
    root.style.zoom = String(zoom);
    root.style.setProperty('--vw', `${w / zoom}px`);
  };

  apply();
  window.addEventListener('resize', apply);
})();
