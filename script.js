document.addEventListener('DOMContentLoaded', () => {
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;
    const currentSlideEl = document.getElementById('current-slide-num');
    const totalSlideEl = document.getElementById('total-slide-num');
    const progressBar = document.getElementById('progress-bar');

    let currentIdx = 0;

    // Write total count once (keeps HTML and JS in sync)
    if (totalSlideEl) {
        totalSlideEl.textContent = totalSlides.toString().padStart(2, '0');
    }

    // ── Mobile detection ──────────────────────────────────────────
    // On mobile (<=768px) we switch to a scrollable document model.
    // CSS makes all slides visible and stacked. JS then:
    //   1. Does not hide non-active slides (CSS handles via opacity:1)
    //   2. Uses scrollIntoView instead of opacity toggle for nav
    //   3. Disables horizontal swipe (vertical scroll is the paradigm)
    //   4. Triggers reveal-active via IntersectionObserver
    function isMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function init() {
        const hash = window.location.hash;
        if (hash) {
            const slideNum = parseInt(hash.replace('#', ''), 10);
            if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= totalSlides) {
                currentIdx = slideNum - 1;
            }
        }

        updatePresentation();
        attachEventListeners();
        setupIntersectionObserver();
    }

    function updateProgress() {
        if (!progressBar) return;
        const pct = totalSlides > 1
            ? (currentIdx / (totalSlides - 1)) * 100
            : 100;
        progressBar.style.width = pct + '%';
    }

    function updatePresentation() {
        const mobile = isMobile();

        if (mobile) {
            // On mobile: CSS forces all slides visible.
            // We still add 'active' to current slide for animation state.
            slides.forEach((slide, idx) => {
                if (idx === currentIdx) {
                    slide.classList.add('active');
                }
            });
        } else {
            slides.forEach((slide, idx) => {
                if (idx === currentIdx) {
                    slide.classList.add('active');
                    setTimeout(() => {
                        slide.classList.add('reveal-active');
                    }, 50);
                } else {
                    slide.classList.remove('active');
                    slide.classList.remove('reveal-active');
                }
            });
        }

        if (currentSlideEl) {
            currentSlideEl.textContent = (currentIdx + 1).toString().padStart(2, '0');
        }

        updateProgress();

        history.replaceState(null, '', '#' + (currentIdx + 1));
    }

    function goToSlide(idx) {
        currentIdx = Math.max(0, Math.min(totalSlides - 1, idx));
        if (isMobile()) {
            slides[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        updatePresentation();
    }

    function goToNextSlide() { goToSlide(currentIdx + 1); }
    function goToPrevSlide() { goToSlide(currentIdx - 1); }

    // ── IntersectionObserver for mobile reveal animations ─────────
    function setupIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            if (!isMobile()) return;
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const slide = entry.target;
                    slide.classList.add('active');
                    setTimeout(() => {
                        slide.classList.add('reveal-active');
                    }, 100);

                    const idx = Array.from(slides).indexOf(slide);
                    if (idx !== -1) {
                        currentIdx = idx;
                        if (currentSlideEl) {
                            currentSlideEl.textContent = (idx + 1).toString().padStart(2, '0');
                        }
                        updateProgress();
                    }
                }
            });
        }, { threshold: 0.4 });

        slides.forEach(slide => observer.observe(slide));
    }

    function attachEventListeners() {
        document.addEventListener('keydown', (e) => {
            const tag = document.activeElement && document.activeElement.tagName
                ? document.activeElement.tagName.toLowerCase()
                : '';
            const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select'
                || (document.activeElement && document.activeElement.isContentEditable);

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                goToNextSlide();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevSlide();
            } else if (e.key === 'Enter' && !isMobile() && !isEditable) {
                e.preventDefault();
                if (e.shiftKey) {
                    goToPrevSlide();
                } else {
                    goToNextSlide();
                }
            } else if (e.key === 'Home') {
                e.preventDefault();
                goToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                goToSlide(totalSlides - 1);
            } else if (e.key.toLowerCase() === 'f') {
                e.preventDefault();
                toggleFullScreen();
            }
        });

        window.addEventListener('hashchange', () => {
            const hash = window.location.hash;
            if (hash) {
                const slideNum = parseInt(hash.replace('#', ''), 10);
                if (!isNaN(slideNum) && slideNum >= 1 && slideNum <= totalSlides) {
                    if (currentIdx !== slideNum - 1) {
                        goToSlide(slideNum - 1);
                    }
                }
            }
        });

        // Touch Swipe — disabled on mobile portrait (scroll model)
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            if (!isMobile()) {
                handleSwipe();
            }
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 50;
            if (touchEndX < touchStartX - swipeThreshold) {
                goToNextSlide();
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                goToPrevSlide();
            }
        }

        // Optional on-screen navigation controls
        const nextBtn = document.getElementById('nav-next');
        const prevBtn = document.getElementById('nav-prev');
        const fsBtn = document.getElementById('nav-fullscreen');
        if (nextBtn) nextBtn.addEventListener('click', goToNextSlide);
        if (prevBtn) prevBtn.addEventListener('click', goToPrevSlide);
        if (fsBtn) fsBtn.addEventListener('click', toggleFullScreen);

        window.addEventListener('resize', () => {
            updatePresentation();
        });
    }

    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Fullscreen error: ${err.message} (${err.name})`);
            });
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    init();
});
