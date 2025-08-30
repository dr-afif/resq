// Set active class on current page
document.addEventListener('DOMContentLoaded', function() {
  const currentPage = window.location.pathname.split('/').pop();
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    const itemPage = item.getAttribute('href');
    if (itemPage === currentPage) {
      item.classList.add('active');
    }
  });
});

// Handle viewport height changes on mobile
function setVH() {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

setVH();
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', setVH);
