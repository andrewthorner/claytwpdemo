/* ==========================================================================
   CLAYTON TOWNSHIP - MASTER JAVASCRIPT
   WCAG 2.1 AA Compliant Router & Dynamic Components
   Clean HTML5 URLs (No Hash) & Session-Aware Notice Modals

   TABLE OF CONTENTS:
   1. CORE SPA ROUTER & NAVIGATION
   2. HOME PAGE: ANNOUNCEMENTS (CAROUSEL & SCROLL FEED)
   3. HOME PAGE: INTERACTIVE CALENDAR ENGINE
   4. MINUTES PAGE: TABS & YEAR FILTER CONTROLS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. CORE SPA ROUTER & NAVIGATION
  // ==========================================================================
  const mainContent = document.getElementById('app-content');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('nav');

  // Mobile Hamburger Menu Toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('is-active');
    });
  }

  // --- Dynamic Content Loader ---
  async function loadPage(pageName, pushToHistory = true) {
    try {
      let cleanName = pageName.replace('/claytwpdemo', '').replace(/^\/+|\/+$/g, '');
      if (!cleanName || cleanName === 'index.html') {
        cleanName = 'home';
      }

      const response = await fetch(`pages/${cleanName}.html`);
      if (!response.ok) throw new Error(`Page not found (${response.status})`);

      const html = await response.text();
      if (!mainContent) return;

      mainContent.innerHTML = html;

      // Trigger home dynamic widgets ONLY on homepage
      if (cleanName === 'home') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            loadAnnouncements(true);
            initCalendar();
          }, 50);
        });
      } else {
        closeModalOverlay();
      }

      // Keep clean URLs without '#' hash
      if (pushToHistory) {
        const repoPath = window.location.pathname.includes('/claytwpdemo') ? '/claytwpdemo' : '';
        const cleanPath = cleanName === 'home' ? `${repoPath}/` : `${repoPath}/${cleanName}`;
        history.pushState({ page: cleanName }, '', cleanPath);
      }

      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus({ preventScroll: true });

      if (navMenu && navMenu.classList.contains('is-active')) {
        navMenu.classList.remove('is-active');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }

    } catch (error) {
      if (mainContent) {
        mainContent.innerHTML = `
          <section class="error-msg" style="padding: 2.5rem 1rem; text-align: center;">
            <h2>Page Load Error</h2>
            <p>Sorry, the requested page could not be loaded.</p>
            <a href="/" data-link style="font-weight: bold; text-decoration: underline;">&larr; Return Home</a>
          </section>
        `;
      }
      console.error('SPA Router Error:', error);
    }
  }

// --- Navigation Link Event Delegation ---
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-page], [data-link], a');
    
    if (link) {
      const href = link.getAttribute('href');
      const dataPage = link.getAttribute('data-page');

      // IGNORE: External links, mailto, tel, anchor hashes, OR PDF files
      if (!href || 
          href.startsWith('http') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:') || 
          href.startsWith('#') || 
          href.toLowerCase().endsWith('.pdf') || 
          href.toLowerCase().includes('.pdf')) {
        return; // Allows normal browser handling (opens PDF)
      }

      e.preventDefault();
      let targetRoute = dataPage || href.replace('/claytwpdemo', '').replace(/^\/+|\/+$/g, '') || 'home';
      loadPage(targetRoute);
    }
  });

  // --- Browser History Navigation ---
  window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
      loadPage(e.state.page, false);
    } else {
      const path = window.location.pathname.replace('/claytwpdemo', '').replace(/^\/+|\/+$/g, '') || 'home';
      loadPage(path, false);
    }
  });

  // --- Initial SPA Router Execution with 404 Redirect Detection ---
  (function initRoute() {
    const redirectPath = sessionStorage.getItem('redirect_path');
    if (redirectPath) {
      sessionStorage.removeItem('redirect_path');
      loadPage(redirectPath, true);
    } else {
      const initialPath = window.location.pathname.replace('/claytwpdemo', '').replace(/^\/+|\/+$/g, '') || 'home';
      loadPage(initialPath, false);
    }
  })();


  // ==========================================================================
  // 2. HOME PAGE: ANNOUNCEMENTS CAROUSEL & SESSION MODALS
  // ==========================================================================
  let carouselInterval = null;
  let currentSlideIndex = 0;

  async function loadAnnouncements(isHomePage = false) {
    const container = document.getElementById('announcements-container');
    if (!container) return;

    try {
      const response = await fetch('resources/announcements-notices.json');
      if (!response.ok) throw new Error('Could not load announcements data.');

      const announcements = await response.json();

      if (!announcements || announcements.length === 0) {
        container.innerHTML = '<p>No active public notices at this time.</p>';
        return;
      }

      // Check popup modals ONLY if on home page and NOT already seen in this session
      if (isHomePage && !sessionStorage.getItem('hasSeenNoticeModal')) {
        checkAndTriggerModals(announcements);
      }

      const pinnedItems = announcements.filter(item => item.pinned === true).slice(0, 3);
      const standardItems = announcements.filter(item => !item.pinned);

      let htmlOutput = '<div class="announcements-flex-container">';

      if (pinnedItems.length > 0) {
        htmlOutput += `
          <div class="pinned-carousel-wrapper" id="pinned-carousel" aria-roledescription="carousel" aria-label="Important Township Notices">
            <div class="pinned-slides-container">
              ${pinnedItems.map((item, index) => `
                <article class="pinned-slide ${index === 0 ? 'active' : ''}" data-index="${index}" role="group" aria-roledescription="slide" aria-label="Notice ${index + 1} of ${pinnedItems.length}: ${item.title}">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <span class="pinned-badge">&#128204; Priority Notice</span>
                      <time style="font-size: 0.8rem; color: #78350f; font-weight: bold;">${item.date}</time>
                    </div>
                    <h3 style="margin: 0.5rem 0; color: #78350f; font-size: 1.15rem;">${item.title}</h3>
                    <p style="color: #451a03; font-size: 0.92rem; margin-bottom: 0.75rem; line-height: 1.4;">${item.summary}</p>
                  </div>
                  <a href="${item.link}" data-link style="color: #b45309; font-weight: bold; text-decoration: underline; font-size: 0.88rem;">${item.linkText} &rarr;</a>
                </article>
              `).join('')}
            </div>

            ${pinnedItems.length > 1 ? `
              <div class="carousel-dots-container" role="tablist" aria-label="Notice Slide Controls">
                ${pinnedItems.map((_, index) => `
                  <button class="carousel-dot ${index === 0 ? 'active' : ''}" data-slide="${index}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" aria-label="Go to notice slide ${index + 1}"></button>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }

      if (standardItems.length > 0) {
        htmlOutput += `
          <div class="announcements-scroll-box" tabindex="0" aria-label="Scrollable Township Public Notices">
            ${standardItems.map(item => `
              <article class="card" style="border-top: 3px solid var(--primary-navy, #1b365d);">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.75rem; font-weight: bold; background: #e2e8f0; color: var(--primary-navy, #1b365d); padding: 2px 6px; border-radius: 4px;">${item.category}</span>
                  <time style="font-size: 0.8rem; color: var(--text-muted, #4b5563); font-weight: 600;">${item.date}</time>
                </div>
                <h3>${item.title}</h3>
                <p>${item.summary}</p>
                <a href="${item.link}" data-link style="font-size: 0.85rem;">${item.linkText} &rarr;</a>
              </article>
            `).join('')}
          </div>
        `;
      }

      htmlOutput += '</div>';
      container.innerHTML = htmlOutput;

      if (pinnedItems.length > 1) {
        initCarouselEngine(pinnedItems.length);
      }

    } catch (error) {
      console.error('Error fetching announcements:', error);
      container.innerHTML = '<p>Unable to load public notices at this time.</p>';
    }
  }

  // --- Carousel Engine Controls ---
  function initCarouselEngine(totalSlides) {
    const carouselWrapper = document.getElementById('pinned-carousel');
    const dots = document.querySelectorAll('.carousel-dot');
    const slides = document.querySelectorAll('.pinned-slide');
    if (!carouselWrapper) return;

    currentSlideIndex = 0;

    function goToSlide(index) {
      currentSlideIndex = index;
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
      });
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
        dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    dots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        const slideIdx = parseInt(e.target.getAttribute('data-slide'));
        goToSlide(slideIdx);
        resetAutoRotation();
      });
    });

    function startAutoRotation() {
      carouselInterval = setInterval(() => {
        const nextIndex = (currentSlideIndex + 1) % totalSlides;
        goToSlide(nextIndex);
      }, 6000);
    }

    function resetAutoRotation() {
      clearInterval(carouselInterval);
      startAutoRotation();
    }

    carouselWrapper.addEventListener('mouseenter', () => clearInterval(carouselInterval));
    carouselWrapper.addEventListener('mouseleave', startAutoRotation);
    carouselWrapper.addEventListener('focusin', () => clearInterval(carouselInterval));
    carouselWrapper.addEventListener('focusout', startAutoRotation);

    startAutoRotation();
  }

  // --- Modal Popup Controls ---
  function checkAndTriggerModals(announcements) {
    const popups = announcements.filter(item => item.popup === true);
    if (popups.length > 0) {
      sessionStorage.setItem('hasSeenNoticeModal', 'true');
      displayNextModal(popups);
    }
  }

  function displayNextModal(queue) {
    if (queue.length === 0) {
      closeModalOverlay();
      return;
    }

    const currentNotice = queue[0];
    const backdrop = document.getElementById('modal-backdrop');
    const title = document.getElementById('modal-title');
    const date = document.getElementById('modal-date');
    const summary = document.getElementById('modal-summary');
    const link = document.getElementById('modal-link');
    const closeBtn = document.getElementById('modal-close-btn');

    if (!backdrop) return;

    if (title) title.textContent = currentNotice.title;
    if (date) date.textContent = `Posted on ${currentNotice.date}`;
    if (summary) summary.textContent = currentNotice.summary;
    if (link) {
      link.href = currentNotice.link;
      link.setAttribute('data-link', 'true');
      link.textContent = `${currentNotice.linkText} \u2192`;
    }

    backdrop.classList.remove('hidden');

    if (closeBtn) {
      closeBtn.focus();
      closeBtn.onclick = () => {
        queue.shift();
        displayNextModal(queue);
      };
    }

    document.onkeydown = (e) => {
      if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) {
        queue.shift();
        displayNextModal(queue);
      }
    };
  }

  function closeModalOverlay() {
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
    document.onkeydown = null;
  }


  // ==========================================================================
  // 3. HOME PAGE: INTERACTIVE CALENDAR ENGINE
  // ==========================================================================
  let currentCalDate = new Date();
  let calendarData = null;

  async function initCalendar() {
    const container = document.getElementById('calendar-grid-container');
    if (!container) return;

    if (!calendarData) {
      try {
        const response = await fetch('resources/calendar.json');
        if (!response.ok) throw new Error('Could not fetch calendar.json');
        calendarData = await response.json();
      } catch (e) {
        console.error('Failed loading calendar.json:', e);
        container.innerHTML = '<p>Unable to load calendar events.</p>';
        return;
      }
    }

    setupCalendarControls();
    renderCalendar(currentCalDate.getFullYear(), currentCalDate.getMonth());
  }

  function setupCalendarControls() {
    const monthSelect = document.getElementById('cal-month-select');
    const yearSelect = document.getElementById('cal-year-select');
    const goBtn = document.getElementById('cal-go-btn');
    const prevBtn = document.getElementById('cal-prev-btn');
    const nextBtn = document.getElementById('cal-next-btn');
    const todayBtn = document.getElementById('cal-today-btn');

    if (!monthSelect || !yearSelect) return;

    monthSelect.value = currentCalDate.getMonth();
    yearSelect.value = currentCalDate.getFullYear();

    if (goBtn) {
      goBtn.onclick = () => {
        currentCalDate = new Date(parseInt(yearSelect.value), parseInt(monthSelect.value), 1);
        renderCalendar(currentCalDate.getFullYear(), currentCalDate.getMonth());
      };
    }

    if (prevBtn) {
      prevBtn.onclick = () => {
        currentCalDate.setMonth(currentCalDate.getMonth() - 1);
        syncAndRender();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        currentCalDate.setMonth(currentCalDate.getMonth() + 1);
        syncAndRender();
      };
    }

    if (todayBtn) {
      todayBtn.onclick = () => {
        currentCalDate = new Date();
        syncAndRender();
      };
    }

    function syncAndRender() {
      monthSelect.value = currentCalDate.getMonth();
      yearSelect.value = currentCalDate.getFullYear();
      renderCalendar(currentCalDate.getFullYear(), currentCalDate.getMonth());
    }
  }

  function getNthWeekday(year, month, dayOfWeek, n) {
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      if (d.getDay() === dayOfWeek) {
        count++;
        if (count === n) return day;
      }
    }
    return null;
  }

  function renderCalendar(year, month) {
    const container = document.getElementById('calendar-grid-container');
    const title = document.getElementById('calendar-month-year-title');
    if (!container) return;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (title) {
      title.textContent = `Events in ${monthNames[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const secondMonday = getNthWeekday(year, month, 1, 2);
    const firstThursday = getNthWeekday(year, month, 4, 1);

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let gridHtml = '<div class="cal-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">';

    dayHeaders.forEach(dh => {
      gridHtml += `<div class="cal-day-header" style="font-weight: bold; text-align: center; padding: 4px; background: #e2e8f0;">${dh}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
      gridHtml += '<div class="cal-day-cell empty" style="background: #f8fafc; min-height: 60px;"></div>';
    }

    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day);
      let eventsHtml = '';

      if (day === secondMonday) {
        eventsHtml += `<div class="cal-event" style="font-size: 0.75rem; background: #dbeafe; color: #1e40af; padding: 2px; border-radius: 3px; margin-top: 2px;"><strong>7:00 pm:</strong> Board Mtg</div>`;
      }

      const pcMonths = [1, 2, 3, 4, 5, 7, 9, 10];
      if (day === firstThursday && pcMonths.includes(month)) {
        eventsHtml += `<div class="cal-event" style="font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 2px; border-radius: 3px; margin-top: 2px;"><strong>7:00 pm:</strong> Planning Comm.</div>`;
      }

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (calendarData && calendarData.customEvents) {
        calendarData.customEvents.filter(ce => ce.date === dateStr).forEach(ce => {
          eventsHtml += `<div class="cal-event" style="font-size: 0.75rem; background: #fef3c7; color: #92400e; padding: 2px; border-radius: 3px; margin-top: 2px;"><strong>${ce.time}:</strong> ${ce.title}</div>`;
        });
      }

      gridHtml += `
        <div class="cal-day-cell ${isToday ? 'is-today' : ''}" style="border: 1px solid #cbd5e1; padding: 4px; min-height: 60px; ${isToday ? 'background: #eff6ff; border-color: #3b82f6;' : ''}">
          <span class="cal-day-number" style="font-weight: bold; font-size: 0.85rem;">${day}</span>
          ${eventsHtml}
        </div>
      `;
    }

    gridHtml += '</div>';
    container.innerHTML = gridHtml;
  }


  // ==========================================================================
  // 4. MINUTES PAGE: TABS & YEAR FILTER CONTROLS
  // ==========================================================================
  document.addEventListener('click', (e) => {
    const selectedTab = e.target.closest('[role="tab"]');
    if (!selectedTab) return;

    const tabList = selectedTab.closest('[role="tablist"]');
    if (!tabList) return;

    const tabs = tabList.querySelectorAll('[role="tab"]');
    const panels = document.querySelectorAll('[role="tabpanel"]');

    tabs.forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });

    panels.forEach(panel => {
      panel.classList.add('hidden');
    });

    selectedTab.classList.add('active');
    selectedTab.setAttribute('aria-selected', 'true');

    const targetPanelId = selectedTab.getAttribute('aria-controls');
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) {
      targetPanel.classList.remove('hidden');
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('year-filter')) {
      const selectedYear = e.target.value;
      const targetContainerId = e.target.getAttribute('data-target');
      const targetContainer = document.getElementById(targetContainerId);

      if (targetContainer) {
        targetContainer.innerHTML = `
          <h4 style="margin-top: 0;">${selectedYear} Meeting Minutes</h4>
          <ul style="line-height: 1.8;">
            <li><a href="resources/pdf/minutes-${selectedYear}-01.pdf" target="_blank" aria-label="Download January ${selectedYear} Meeting Minutes PDF">January ${selectedYear} Minutes (PDF)</a></li>
            <li><a href="resources/pdf/minutes-${selectedYear}-02.pdf" target="_blank" aria-label="Download February ${selectedYear} Meeting Minutes PDF">February ${selectedYear} Minutes (PDF)</a></li>
            <li><a href="resources/pdf/minutes-${selectedYear}-03.pdf" target="_blank" aria-label="Download March ${selectedYear} Meeting Minutes PDF">March ${selectedYear} Minutes (PDF)</a></li>
          </ul>
        `;
      }
    }
  });

});
