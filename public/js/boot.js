// Runs before first paint: restores the language and decides whether to play the intro.
(function () {
  var d = document.documentElement;
  var lang = null;
  try {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ar') { lang = q; localStorage.setItem('mc_lang', JSON.stringify(q)); }
    else lang = JSON.parse(localStorage.getItem('mc_lang') || 'null');
  } catch (e) {}
  if (lang === 'en') { d.lang = 'en'; d.dir = 'ltr'; }

  var intro = true;
  try {
    if (sessionStorage.getItem('mc_intro')) intro = false;
    else sessionStorage.setItem('mc_intro', '1');
  } catch (e) {}
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) intro = false;
  if (location.hash && location.hash !== '#top') intro = false;
  if (/bot|lighthouse|crawl|spider/i.test(navigator.userAgent)) intro = false;
  if (intro) d.style.setProperty('--intro-delay', '1.75s');
  else d.classList.add('no-intro');
})();
