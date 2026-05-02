const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));

document.getElementById('back-top').addEventListener('mouseover', function() { this.style.color = 'var(--text)'; });
document.getElementById('back-top').addEventListener('mouseout',  function() { this.style.color = 'var(--muted)'; });