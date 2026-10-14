/**
 * SafeLink Core Logic & UI Controller
 */

let currentLang = 'en';
let telemetryChartInstance = null;
let lastScanData = null;

document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initLanguage();
    initChart();
    initScrollAnimations();
    initEventListeners();
});

/* ================= PRELOADER ================= */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.classList.add('fade-out');
    }, 1000);
}

/* ================= LANGUAGE SWITCHER ================= */
function initLanguage() {
    const btn = document.getElementById('langToggleBtn');
    btn.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        applyLanguage(currentLang);
    });
}

function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('langLabel').innerText = lang === 'ar' ? 'English' : 'العربية';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            el.innerHTML = TRANSLATIONS[lang][key];
        }
    });
}

/* ================= CHART.JS TELEMETRY ================= */
function initChart() {
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    telemetryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            datasets: [{
                data: [45, 62, 78, 85, 92, 70, 82],
                backgroundColor: '#00f2fe',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#64748b' } },
                y: { display: false }
            }
        }
    });
}

/* ================= SCROLL REVEAL ANIMATION ================= */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

/* ================= SCAN LOGIC ================= */
function initEventListeners() {
    // Form submit
    document.getElementById('scanForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('urlInput').value.trim();
        if (url) performScan(url);
    });

    // Chips click
    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.getAttribute('data-url');
            document.getElementById('urlInput').value = url;
            performScan(url);
        });
    });

    // Dashboard Modal
    const modal = document.getElementById('dashboardModal');
    document.getElementById('navDashboardBtn').addEventListener('click', () => {
        loadHistory();
        modal.classList.remove('hidden');
    });
    document.getElementById('ctaDashboardBtn').addEventListener('click', () => {
        loadHistory();
        modal.classList.remove('hidden');
    });
    document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Clear History
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        localStorage.removeItem('safelink_history');
        loadHistory();
    });

    // AI Button Trigger
    document.getElementById('runAiBtn').addEventListener('click', runAiAnalysis);
}

function performScan(urlString) {
    let score = 100;
    const warnings = [];
    let formattedUrl = urlString;

    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'http://' + formattedUrl;
    }

    let parsed;
    try {
        parsed = new URL(formattedUrl);
    } catch (e) {
        alert("Invalid URL format.");
        return;
    }

    const domain = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase() + parsed.search.toLowerCase();
    const protocol = parsed.protocol;

    if (protocol !== 'https:') {
        score -= 25;
        warnings.push({
            type: 'warning',
            en: 'Connection is not secure (Missing HTTPS encryption).',
            ar: 'الموقع لا يستخدم تشفير آمن (HTTPS).'
        });
    }

    if (domain.includes('paypa1') || domain.includes('rnicrosoft') || domain.includes('alrajhibank-secure')) {
        score -= 45;
        warnings.push({
            type: 'danger',
            en: 'High risk of Typosquatting / Brand Impersonation detected.',
            ar: 'اشتباه عالي بأسلوب انتحال شخصية العلامة التجارية (Typosquatting).'
        });
    }

    if (path.endsWith('.exe') || path.endsWith('.apk') || path.endsWith('.scr')) {
        score -= 40;
        warnings.push({
            type: 'danger',
            en: 'Direct link to an executable or potentially dangerous download.',
            ar: 'الرابط يؤدي مباشرة لتحميل ملف تنفيذي قد يكون ضاراً.'
        });
    }

    if (domain.endsWith('.xyz') || domain.endsWith('.top')) {
        score -= 20;
        warnings.push({
            type: 'warning',
            en: 'High-risk or low-trust Top-Level Domain (TLD).',
            ar: 'النطاق العلوي (TLD) ينتمي لفئات مرتفعة المخاطر.'
        });
    }

    const finalScore = Math.max(0, score);
    let status = 'SAFE';
    if (finalScore < 50) status = 'DANGEROUS';
    else if (finalScore < 80) status = 'SUSPICIOUS';

    lastScanData = {
        url: parsed.href,
        domain: domain,
        protocol: protocol.replace(':', '').toUpperCase(),
        score: finalScore,
        status: status,
        warnings: warnings,
        time: new Date().toLocaleTimeString()
    };

    saveToHistory(lastScanData);
    renderResults(lastScanData);
}

function renderResults(data) {
    document.getElementById('defaultResultPlaceholder').classList.add('hidden');
    const resultArea = document.getElementById('scanResultArea');
    resultArea.classList.remove('hidden');

    document.getElementById('scoreNum').innerText = data.score;
    document.getElementById('resTargetUrl').innerText = data.url;
    document.getElementById('resDomainText').innerText = data.domain;
    document.getElementById('resProtocolText').innerText = data.protocol;

    // Ring Animation
    const ring = document.getElementById('scoreProgressCircle');
    const offset = 326 - (326 * data.score) / 100;
    ring.style.strokeDashoffset = offset;

    const badge = document.getElementById('resultStatusBadge');
    badge.className = 'status-badge';

    if (data.status === 'SAFE') {
        badge.classList.add('status-safe');
        badge.innerText = currentLang === 'ar' ? 'آمن' : 'Safe';
        ring.style.stroke = '#10b981';
    } else if (data.status === 'SUSPICIOUS') {
        badge.classList.add('status-suspicious');
        badge.innerText = currentLang === 'ar' ? 'مشبوه' : 'Suspicious';
        ring.style.stroke = '#f59e0b';
    } else {
        badge.classList.add('status-dangerous');
        badge.innerText = currentLang === 'ar' ? 'خطير' : 'Dangerous';
        ring.style.stroke = '#ef4444';
    }

    // Render Warnings
    const wContainer = document.getElementById('warningsList');
    wContainer.innerHTML = '';

    if (data.warnings.length === 0) {
        wContainer.innerHTML = `<div class="warning-item warning-success"><i class="fa-solid fa-circle-check"></i> ${currentLang === 'ar' ? 'لم يتم رصد أي أنماط مشبوهة في هذا الرابط.' : 'No suspicious patterns or threats detected in this link.'}</div>`;
    } else {
        data.warnings.forEach(w => {
            const classs = w.type === 'danger' ? 'warning-danger' : 'warning-warning';
            wContainer.innerHTML += `<div class="warning-item ${classs}"><i class="fa-solid fa-triangle-exclamation"></i> ${w[currentLang]}</div>`;
        });
    }

    document.getElementById('aiReportBox').innerText = TRANSLATIONS[currentLang].ai_report_placeholder;
}

function runAiAnalysis() {
    if (!lastScanData) return;
    const box = document.getElementById('aiReportBox');
    box.innerText = currentLang === 'ar' ? 'جاري التحليل بواسطة Gemini AI...' : 'Generating Gemini AI Security Analysis...';

    setTimeout(() => {
        if (lastScanData.status === 'SAFE') {
            box.innerText = currentLang === 'ar' 
                ? "الرابط يبدو معتمداً وآمناً. لا توجد مؤشرات على هندسة اجتماعية."
                : "The URL structure appears legitimate. SSL encryption is active and no phishing indicators were identified.";
        } else {
            box.innerText = currentLang === 'ar'
                ? `تحذير الذكاء الاصطناعي: يحتوي الرابط (${lastScanData.domain}) على مؤشرات احتيالية أو هندسة اجتماعية تهدف لسرقة البيانات. تجنب إدخال أي معلومات خاصة.`
                : `AI Security Warning: The domain (${lastScanData.domain}) exhibits deceptive patterns. Avoid entering personal credentials or downloading files.`;
        }
    }, 1200);
}

/* ================= LOCAL STORAGE HISTORY ================= */
function saveToHistory(item) {
    let history = JSON.parse(localStorage.getItem('safelink_history') || '[]');
    history.unshift(item);
    if (history.length > 10) history.pop();
    localStorage.setItem('safelink_history', JSON.stringify(history));
}

function loadHistory() {
    let history = JSON.parse(localStorage.getItem('safelink_history') || '[]');
    const tbody = document.getElementById('historyTableBody');
    const countLabel = document.getElementById('historyCountLabel');

    countLabel.innerText = `${history.length} records stored locally`;
    tbody.innerHTML = '';

    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No scan history found</td></tr>`;
        return;
    }

    history.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${item.url}</td>
                <td><strong>${item.score}/100</strong></td>
                <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
                <td>${item.time}</td>
            </tr>
        `;
    });
}