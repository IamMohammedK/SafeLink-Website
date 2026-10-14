/**
 * SafeLink Core Logic with 3D Canvas, Loading Animations & 6-Group Heuristic Engine
 */

let currentLang = 'en';
let telemetryChartInstance = null;
let lastScanData = null;

document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    init3DBackground();
    initLanguage();
    initChart();
    initScrollAnimations();
    initEventListeners();
});

/* PRELOADER WITH REALTIME 5-SECOND PROGRESS CONTROL */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('loaderProgress');

    // تشغيل شريط التقدم ليصل إلى 100% خلال 5 ثوانٍ
    requestAnimationFrame(() => {
        if (progressBar) {
            progressBar.style.width = '100%';
        }
    });

    // إخفاء شاشة التحميل بعد انقضاء الـ 5 ثوانٍ تماماً
    setTimeout(() => {
        if (preloader) {
            preloader.classList.add('fade-out');
        }
    }, 5000);
}

/* 3D ANIMATED PARTICLES MATRIX BACKGROUND */
function init3DBackground() {
    const canvas = document.getElementById('bg3dCanvas');
    if (!canvas || !window.THREE) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Particles Grid
    const particlesCount = 700;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 15;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.035,
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.6
    });

    const particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    camera.position.z = 3;

    // Mouse Parallax Effect
    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
        mouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    function animate() {
        requestAnimationFrame(animate);
        particlesMesh.rotation.y += 0.0015;
        particlesMesh.rotation.x += 0.0008;

        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.05;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/* LANGUAGE SWITCHER */
function initLanguage() {
    const btn = document.getElementById('langToggleBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'ar' : 'en';
            applyLanguage(currentLang);
        });
    }
}

function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const langLabel = document.getElementById('langLabel');
    if (langLabel) langLabel.innerText = lang === 'ar' ? 'English' : 'العربية';

    if (lastScanData) {
        renderResults(lastScanData);
    }
}

/* CHART.JS TELEMETRY */
function initChart() {
    const chartEl = document.getElementById('telemetryChart');
    if (!chartEl || !window.Chart) return;
    const ctx = chartEl.getContext('2d');
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

/* SCROLL REVEAL ANIMATION */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

/* SCAN LOGIC WITH LOADING ANIMATION STATE */
function initEventListeners() {
    const scanForm = document.getElementById('scanForm');
    if (scanForm) {
        scanForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const urlInput = document.getElementById('urlInput');
            const url = urlInput ? urlInput.value.trim() : '';
            if (url) triggerScanWithLoading(url);
        });
    }

    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.getAttribute('data-url');
            const urlInput = document.getElementById('urlInput');
            if (urlInput) urlInput.value = url;
            triggerScanWithLoading(url);
        });
    });

    // Dashboard Modal Controls
    const modal = document.getElementById('dashboardModal');
    const navDashBtn = document.getElementById('navDashboardBtn');
    const ctaDashBtn = document.getElementById('ctaDashboardBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const historyFilterSelect = document.getElementById('historyFilterSelect');

    if (navDashBtn) navDashBtn.addEventListener('click', () => { loadHistory(); modal.classList.remove('hidden'); });
    if (ctaDashBtn) ctaDashBtn.addEventListener('click', () => { loadHistory(); modal.classList.remove('hidden'); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { modal.classList.add('hidden'); });

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem('safelink_history');
            loadHistory();
        });
    }

    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportHistoryCsv);
    if (historyFilterSelect) historyFilterSelect.addEventListener('change', loadHistory);
}

function triggerScanWithLoading(url) {
    const placeholder = document.getElementById('defaultResultPlaceholder');
    const scanArea = document.getElementById('scanResultArea');
    const loaderCard = document.getElementById('scanningLoaderCard');

    if (placeholder) placeholder.classList.add('hidden');
    if (scanArea) scanArea.classList.add('hidden');
    if (loaderCard) loaderCard.classList.remove('hidden');

    setTimeout(() => {
        if (loaderCard) loaderCard.classList.add('hidden');
        performScan(url);
    }, 4000);
}

/* COMPREHENSIVE 6-GROUP SCAN ENGINE */
function performScan(urlString) {
    let score = 100;
    const warnings = [];
    let formattedUrl = urlString.trim();

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
    const pathname = parsed.pathname;
    const search = parsed.search;
    const fullPath = (pathname + search).toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const port = parsed.port;
    const username = parsed.username;

    // --- المجموعة 1: بروتوكول الاتصال (HTTPS) ---
    if (protocol !== 'https:') {
        score -= 25;
        warnings.push({
            type: 'warning',
            en: 'Connection is not secure (Missing HTTPS encryption).',
            ar: 'الموقع لا يستخدم تشفير آمن (HTTPS).'
        });
    }

    // --- المجموعة 2: المضيف والمنفذ (IP & Port) ---
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hexOctalIpRegex = /^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+)){3}$/i;
    if (ipv4Regex.test(domain) || hexOctalIpRegex.test(domain) || domain.startsWith('[')) {
        score -= 35;
        warnings.push({
            type: 'danger',
            en: 'Direct IP address or disguised numeric format used instead of a domain name.',
            ar: 'استخدام عنوان IP مباشر أو صيغة رقمية متخفية بدلاً من اسم نطاق رسمياً.'
        });
    }

    if (port && port !== '80' && port !== '443') {
        score -= 15;
        warnings.push({
            type: 'warning',
            en: `Unusual port connection detected (Port: ${port}).`,
            ar: `اتصال عبر منفذ غير معتاد (Port: ${port}).`
        });
    }

    // --- المجموعة 3: اسم النطاق (Typosquatting, Subdomains, Punycode, TLDs) ---
    const brandPatterns = [/paypa[1l]/i, /alrajhi.*bank/i, /rnicrosoft/i, /goog[1l]e/i, /app[1l]e/i, /binance-verify/i];
    const isImpersonating = brandPatterns.some(p => p.test(domain) && !domain.endsWith('paypal.com') && !domain.endsWith('alrajhibank.com.sa') && !domain.endsWith('microsoft.com') && !domain.endsWith('google.com'));

    if (isImpersonating) {
        score -= 45;
        warnings.push({
            type: 'danger',
            en: 'High risk of Typosquatting / Brand Impersonation detected.',
            ar: 'اشتباه عالي بأسلوب انتحال شخصية العلامة التجارية (Typosquatting).'
        });
    }

    const domainParts = domain.split('.');
    if (domainParts.length > 3) {
        score -= 15;
        warnings.push({
            type: 'warning',
            en: 'Excessive number of subdomains detected.',
            ar: 'وجود كثرة غير معتادة من النطاقات الفرعية (Subdomains).'
        });
    }

    if (domain.startsWith('xn--')) {
        score -= 25;
        warnings.push({
            type: 'warning',
            en: 'Domain uses Punycode encoding (Potential deceptive internationalized domain).',
            ar: 'النطاق يستخدم ترميز Punycode (قد يُخفي حروفاً متشابهة خدّاعة).'
        });
    }

    if (domain.endsWith('.xyz') || domain.endsWith('.top') || domain.endsWith('.zip') || domain.endsWith('.kim')) {
        score -= 20;
        warnings.push({
            type: 'warning',
            en: 'High-risk or low-trust Top-Level Domain (TLD).',
            ar: 'النطاق العلوي (TLD) ينتمي لفئات مرتفعة المخاطر.'
        });
    }

    if ((domain.match(/-/g) || []).length >= 3) {
        score -= 10;
        warnings.push({
            type: 'warning',
            en: 'Excessive hyphens (-) used within the domain name.',
            ar: 'استخدام مفرط للشرطات (-) داخل اسم النطاق.'
        });
    }

    // --- المجموعة 4: الأحرف والرموز غير المعتادة ---
    if (/[\\\{\}\|<>]/.test(urlString)) {
        score -= 15;
        warnings.push({
            type: 'warning',
            en: 'URL contains unusual special characters (e.g. { } | \\).',
            ar: 'الرابط يحتوي على رموز خاصة غير معتادة (مثل { } | \\).'
        });
    }

    if (urlString.includes('%25') || (urlString.match(/%/g) || []).length > 4) {
        score -= 15;
        warnings.push({
            type: 'warning',
            en: 'Double URL encoding or excessive encoding detected.',
            ar: 'اكتشاف ترميز مكرر أو مفرط للرموز (Double URL Encoding).'
        });
    }

    if (urlString.length > 85) {
        score -= 10;
        warnings.push({
            type: 'warning',
            en: 'Suspiciously long URL structure detected.',
            ar: 'طول الرابط طويل جداً بشكل غير طبيعي (Suspicious URL Length).'
        });
    }

    // --- المجموعة 5: المسار ونوع الملف (Executable Download & Traversal) ---
    const executableExtensions = /\.(exe|apk|bat|scr|vbs|cmd|msi|ps1)$/i;
    if (executableExtensions.test(pathname)) {
        score -= 40;
        warnings.push({
            type: 'danger',
            en: 'Direct link to an executable or potentially dangerous download.',
            ar: 'الرابط يؤدي مباشرة لتحميل ملف تنفيذي قد يكون ضاراً.'
        });
    }

    if (pathname.includes('../') || pathname.includes('..\\')) {
        score -= 30;
        warnings.push({
            type: 'danger',
            en: 'Directory traversal sequence detected in URL path.',
            ar: 'اكتشاف محاولة تراجع بين المجلدات في المسار (Directory Traversal).'
        });
    }

    // --- المجموعة 6: محتوى ومؤشرات الرابط (User Info, Shorteners, Phishing Words) ---
    if (username || urlString.includes('@')) {
        score -= 35;
        warnings.push({
            type: 'danger',
            en: 'URL contains "@" symbol, often used to mislead destination authority.',
            ar: 'احتواء الرابط على رمز (@) للتضليل وإخفاء الوجهة الحقيقية.'
        });
    }

    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'buff.ly', 'ow.ly'];
    if (shorteners.some(s => domain.endsWith(s))) {
        score -= 15;
        warnings.push({
            type: 'warning',
            en: 'URL Shortener service used; hides true final destination.',
            ar: 'رابط مختصر يربك معرفة الوجهة النهائية الحقيقية بدون فحص التوجيه.'
        });
    }

    const phishingKeywords = ['login', 'verify', 'update', 'account', 'secure', 'banking', 'confirm', 'free-gift'];
    const foundKeywords = phishingKeywords.filter(kw => fullPath.includes(kw));
    if (foundKeywords.length >= 2) {
        score -= 20;
        warnings.push({
            type: 'warning',
            en: `Multiple suspicious phishing keywords in URL path (${foundKeywords.join(', ')}).`,
            ar: `استخدام كلمات استدراج شائعة في مسار الرابط (${foundKeywords.join(', ')}).`
        });
    }

    // الحساب النهائي والتصنيف
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
    const resultArea = document.getElementById('scanResultArea');
    if (resultArea) resultArea.classList.remove('hidden');

    const scoreNum = document.getElementById('scoreNum');
    const resTargetUrl = document.getElementById('resTargetUrl');
    const resDomainText = document.getElementById('resDomainText');
    const resProtocolText = document.getElementById('resProtocolText');

    if (scoreNum) scoreNum.innerText = data.score;
    if (resTargetUrl) resTargetUrl.innerText = data.url;
    if (resDomainText) resDomainText.innerText = data.domain;
    if (resProtocolText) resProtocolText.innerText = data.protocol;

    const ring = document.getElementById('scoreProgressCircle');
    if (ring) {
        const offset = 326 - (326 * data.score) / 100;
        ring.style.strokeDashoffset = offset;
    }

    const badge = document.getElementById('resultStatusBadge');
    if (badge) {
        badge.className = 'status-badge';

        if (data.status === 'SAFE') {
            badge.classList.add('status-safe');
            badge.innerText = currentLang === 'ar' ? 'آمن' : 'Safe';
            if (ring) ring.style.stroke = '#10b981';
        } else if (data.status === 'SUSPICIOUS') {
            badge.classList.add('status-suspicious');
            badge.innerText = currentLang === 'ar' ? 'مشبوه' : 'Suspicious';
            if (ring) ring.style.stroke = '#f59e0b';
        } else {
            badge.classList.add('status-dangerous');
            badge.innerText = currentLang === 'ar' ? 'خطير' : 'Dangerous';
            if (ring) ring.style.stroke = '#ef4444';
        }
    }

    const wContainer = document.getElementById('warningsList');
    if (wContainer) {
        wContainer.innerHTML = '';

        if (data.warnings.length === 0) {
            wContainer.innerHTML = `<div class="warning-item warning-success"><i class="fa-solid fa-circle-check"></i> ${currentLang === 'ar' ? 'لم يتم رصد أي أنماط مشبوهة في هذا الرابط.' : 'No suspicious patterns or threats detected in this link.'}</div>`;
        } else {
            data.warnings.forEach(w => {
                const classs = w.type === 'danger' ? 'warning-danger' : 'warning-warning';
                wContainer.innerHTML += `<div class="warning-item ${classs}"><i class="fa-solid fa-triangle-exclamation"></i> ${w[currentLang]}</div>`;
            });
        }
    }
}

/* HISTORY & DASHBOARD ADVANCED WIDGETS */
function saveToHistory(item) {
    let history = JSON.parse(localStorage.getItem('safelink_history') || '[]');
    history.unshift(item);
    if (history.length > 15) history.pop();
    localStorage.setItem('safelink_history', JSON.stringify(history));
}

function loadHistory() {
    let history = JSON.parse(localStorage.getItem('safelink_history') || '[]');
    const filterEl = document.getElementById('historyFilterSelect');
    const filter = filterEl ? filterEl.value : 'ALL';

    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Calculate Analytics Stats
    const total = history.length;
    const safeCount = history.filter(h => h.status === 'SAFE').length;
    const dangerCount = history.filter(h => h.status === 'DANGEROUS' || h.status === 'SUSPICIOUS').length;

    const dashTotal = document.getElementById('dashTotalCount');
    const dashSafe = document.getElementById('dashSafeCount');
    const dashDanger = document.getElementById('dashDangerCount');

    if (dashTotal) dashTotal.innerText = total;
    if (dashSafe) dashSafe.innerText = safeCount;
    if (dashDanger) dashDanger.innerText = dangerCount;

    let filtered = history;
    if (filter === 'SAFE') filtered = history.filter(h => h.status === 'SAFE');
    if (filter === 'DANGEROUS') filtered = history.filter(h => h.status !== 'SAFE');

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748b;">No scan history found</td></tr>`;
        return;
    }

    filtered.forEach(item => {
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

function exportHistoryCsv() {
    let history = JSON.parse(localStorage.getItem('safelink_history') || '[]');
    if (history.length === 0) {
        alert("No scan data available to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,URL,Score,Status,Time\n";
    history.forEach(row => {
        csvContent += `"${row.url}",${row.score},${row.status},"${row.time}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "safelink_threat_telemetry.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
