function toggleMute(btn) {
  const video = btn.closest('.video-showcase').querySelector('video');
  video.muted = !video.muted;
  btn.querySelector('.icon-muted').style.display = video.muted ? '' : 'none';
  btn.querySelector('.icon-unmuted').style.display = video.muted ? 'none' : '';
}
function openLightbox(btn) {
  const src = btn.closest('.video-showcase').querySelector('video').src;
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