function toggleMute(btn) {
  const video = btn.closest('.video-showcase').querySelector('video');
  video.muted = !video.muted;
  btn.querySelector('.icon-muted').style.display = video.muted ? '' : 'none';
  btn.querySelector('.icon-unmuted').style.display = video.muted ? 'none' : '';
}
function openLightbox(btn) {
  const video = btn.closest('.video-showcase').querySelector('video');
  // lazy videos may not have src yet — fall back to their data-src
  const src = video.currentSrc || video.src || video.getAttribute('data-src');
  const lightbox = document.getElementById('video-lightbox');
  const lv = document.getElementById('lightbox-video');
  lv.src = src;
  lv.play();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('video-lightbox');
  const lv = document.getElementById('lightbox-video');
  lightbox.classList.remove('active');
  lv.pause();
  lv.src = '';
  document.body.style.overflow = '';
}

// Close on backdrop click
document.getElementById('video-lightbox').addEventListener('click', function(e) {
  if (e.target === this) closeLightbox();
});

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// Lazy autoplay: showcase videos are below the fold, so they only start
// downloading near the viewport instead of competing with the hero on a
// cold first load. (#about-orbit is excluded — animations.js owns it.)
(function () {
  const vids = document.querySelectorAll('video[data-src]:not(#about-orbit)');
  function start(v) {
    if (v.src) return;
    v.src = v.getAttribute('data-src');
    const p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (!('IntersectionObserver' in window)) {
    vids.forEach(start);
    return;
  }
  const obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      obs.unobserve(e.target);
      start(e.target);
    });
  }, { rootMargin: '600px 0px' });
  vids.forEach(function (v) { obs.observe(v); });
})();