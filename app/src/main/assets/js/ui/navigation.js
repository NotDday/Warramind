window.Navigation = class Navigation {
    constructor() {
        this.tabs = ['home', 'add', 'warranties', 'me'];
        this.currentTabIndex = 0;
        
        // Navigation is instantiated in main.js inside a DOMContentLoaded 
        // block, so the DOM is already ready.
        this.initSwipe();
    }

    navigateTo(section, isSwipe = false) {
        const targetIndex = this.tabs.indexOf(section);
        
        // If navigating to something not in the bottom nav (e.g. details), don't break the current stack
        if (targetIndex === -1 && section !== 'details') return;

        let animationClass = '';
        if (isSwipe && targetIndex !== -1 && this.currentTabIndex !== -1) {
            // Determine direction
            if (targetIndex > this.currentTabIndex) {
                animationClass = 'slide-in-right'; // new tab comes from right
            } else if (targetIndex < this.currentTabIndex) {
                animationClass = 'slide-in-left'; // new tab comes from left
            }
        }

        document.querySelectorAll(".content-section").forEach(sec => {
            sec.classList.add("hidden");
            sec.classList.remove("slide-in-right", "slide-in-left");
        });

        const target = document.getElementById(section + "Section");
        if (target) {
            target.classList.remove("hidden");
            if (animationClass) {
                // Force an immediate reflow so the animation restarts
                void target.offsetWidth; 
                target.classList.add(animationClass);
            }
        }

        const header = document.querySelector('.header');
        if (header) {
            if (section === 'home') {
                header.classList.add('home-active');
            } else {
                header.classList.remove('home-active');
            }
        }

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.toggle("active", item.dataset.section === section);
        });

        if (targetIndex !== -1) {
            this.currentTabIndex = targetIndex;
        }
    }

    initSwipe() {
        let touchstartX = 0;
        let touchstartY = 0;
        let touchendX = 0;
        let touchendY = 0;

        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.addEventListener('touchstart', (e) => {
            touchstartX = e.changedTouches[0].screenX;
            touchstartY = e.changedTouches[0].screenY;
        }, { passive: true });

        mainContent.addEventListener('touchend', (e) => {
            touchendX = e.changedTouches[0].screenX;
            touchendY = e.changedTouches[0].screenY;
            this.handleSwipe(touchstartX, touchstartY, touchendX, touchendY);
        }, { passive: true });
    }

    handleSwipe(startX, startY, endX, endY) {
        // If we're on the "details" page, don't allow swipe to change tabs
        const currentSection = document.querySelector('.content-section:not(.hidden)');
        if (currentSection && currentSection.id === 'detailsSection') {
            return;
        }

        const threshold = 60; // minimum distance to be considered a swipe
        const restraint = 100; // maximum perpendicular distance allowed

        const diffX = endX - startX;
        const diffY = endY - startY;

        if (Math.abs(diffX) > threshold && Math.abs(diffY) < restraint) {
            if (diffX < 0) {
                // Swiped left -> Go to next tab
                if (this.currentTabIndex < this.tabs.length - 1) {
                    this.navigateTo(this.tabs[this.currentTabIndex + 1], true);
                }
            } else {
                // Swiped right -> Go to prev tab
                if (this.currentTabIndex > 0) {
                    this.navigateTo(this.tabs[this.currentTabIndex - 1], true);
                }
            }
        }
    }
}
