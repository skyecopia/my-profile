/* =========================================================
   script.js — 순수 JavaScript (라이브러리 없음)
   index.html 맨 아래가 아니라 <head>에서 defer로 불러오므로,
   HTML을 다 읽은 뒤에 실행됩니다.
   ========================================================= */

(function () {
  'use strict';

  // 자주 쓰는 요소를 미리 찾아 둡니다.
  var root = document.documentElement;
  var menuBtn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');
  var themeBtn = document.getElementById('theme-toggle');

  // 사용자가 '동작 줄이기'를 켰는지 확인 (true면 애니메이션 끔)
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. 햄버거 메뉴 열고 닫기 (aria-expanded 갱신)
     --------------------------------------------------------- */
  // 메뉴를 열거나 닫는 함수. open이 true면 열기, false면 닫기
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  }

  // 햄버거 버튼을 누르면 현재 상태의 반대로 바꿈
  menuBtn.addEventListener('click', function () {
    setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
  });

  // Esc 키를 누르면 메뉴 닫고, 버튼으로 포커스를 돌려줌
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  /* ---------------------------------------------------------
     2. 메뉴 클릭 시 해당 섹션으로 부드럽게 스크롤 + 메뉴 닫기
        (CSS의 scroll-behavior: smooth와 함께 동작)
     --------------------------------------------------------- */
  document.querySelectorAll('a[data-nav]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', link.getAttribute('href')); // 주소창 #도 갱신
      setMenu(false); // 모바일 메뉴 자동 닫힘
    });
  });

  /* ---------------------------------------------------------
     3. 스크롤할 때 섹션 페이드인 (Intersection Observer)
     --------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    // 동작 줄이기이거나 오래된 브라우저면 효과 없이 바로 보여줌
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible'); // 화면에 들어오면 보이게
          observer.unobserve(entry.target);         // 한 번만 실행
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------------
     4. 다크모드 토글 (선택값은 localStorage에 저장)
        처음 값은 index.html <head>의 짧은 코드가 이미 정해 둠
     --------------------------------------------------------- */
  // 버튼의 안내 문구를 현재 테마에 맞게 바꿈
  function updateThemeLabel() {
    var isDark = root.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
  }
  updateThemeLabel();

  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {} // 저장이 막힌 환경 대비
    updateThemeLabel();
  });

  /* ---------------------------------------------------------
     5. 이메일 복사 버튼 (복사 완료 문구 2초 표시)
     --------------------------------------------------------- */
  var copyBtn = document.getElementById('copy-email');
  var copyStatus = document.getElementById('copy-status');
  var statusTimer;

  // 안내 문구를 보여주고 2초 뒤에 지움
  function showStatus(message) {
    copyStatus.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { copyStatus.textContent = ''; }, 2000);
  }

  // navigator.clipboard를 못 쓰는 환경을 위한 대체 복사 방법
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  copyBtn.addEventListener('click', function () {
    var email = document.getElementById('email-text').textContent.trim();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(email).then(
        function () { showStatus('이메일 주소가 복사되었습니다 ✓'); },
        function () { showStatus(fallbackCopy(email) ? '이메일 주소가 복사되었습니다 ✓' : '복사에 실패했습니다. 직접 선택해 복사해 주세요.'); }
      );
    } else {
      showStatus(fallbackCopy(email) ? '이메일 주소가 복사되었습니다 ✓' : '복사에 실패했습니다. 직접 선택해 복사해 주세요.');
    }
  });

  /* ---------------------------------------------------------
     6. 맨 위로 이동 버튼 (일정 높이 이상 스크롤하면 표시)
     --------------------------------------------------------- */
  var toTop = document.getElementById('to-top');
  var toTopFooter = document.getElementById('to-top-footer');
  var SHOW_AFTER = 400; // 이 값(px)보다 내려가면 버튼 표시

  // 맨 위로 부드럽게 이동
  function goTop() {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  toTop.addEventListener('click', goTop);
  toTopFooter.addEventListener('click', goTop);

  // 스크롤 위치에 따라 버튼 보이기/숨기기 (passive: 스크롤 성능 향상)
  function onScroll() {
    toTop.hidden = window.scrollY < SHOW_AFTER;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     7. Footer 연도 자동 표시
     --------------------------------------------------------- */
  document.getElementById('year').textContent = new Date().getFullYear();
})();
