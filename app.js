/**
 * SafeLink Core Logic with 3D Canvas & Loading Animations
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

/* PRELOADER */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    setTimeout(() => { preloader.classList.add('fade-out'); }, 1000);
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

/* CHART.JS TELEMETRY */
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
    document.getElementById('scanForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const url = document.getElementById('urlInput').value.trim();
        if (url) triggerScanWithLoading(url);
    });

    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const url = chip.getAttribute('data-url');
            document.getElementById('urlInput').value = url;
            triggerScanWithLoading(url);
        });
    });

    // Dashboard Modal Controls
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

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        localStorage.removeItem('safelink_history');
        loadHistory();
    });

    // CSV Export
    document.getElementById('exportCsvBtn').addEventListener('click', exportHistoryCsv);
    document.getElementById('historyFilterSelect').addEventListener('change', loadHistory);

}

function triggerScanWithLoading(url) {
    const placeholder = document.getElementById('defaultResultPlaceholder');
    const scanArea = document.getElementById('scanResultArea');
    const loaderCard = document.getElementById('scanningLoaderCard');

    placeholder.classList.add('hidden');
    scanArea.classList.add('hidden');
    loaderCard.classList.remove('hidden');

    // Simulate Realistic Scanner Delay
    setTimeout(() => {
        loaderCard.classList.add('hidden');
        performScan(url);
    }, 1200);
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
    const resultArea = document.getElementById('scanResultArea');
    resultArea.classList.remove('hidden');

    document.getElementById('scoreNum').innerText = data.score;
    document.getElementById('resTargetUrl').innerText = data.url;
    document.getElementById('resDomainText').innerText = data.domain;
    document.getElementById('resProtocolText').innerText = data.protocol;

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
    const filter = document.getElementById('historyFilterSelect').value;

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    // Calculate Analytics Stats
    const total = history.length;
    const safeCount = history.filter(h => h.status === 'SAFE').length;
    const dangerCount = history.filter(h => h.status === 'DANGEROUS' || h.status === 'SUSPICIOUS').length;

    document.getElementById('dashTotalCount').innerText = total;
    document.getElementById('dashSafeCount').innerText = safeCount;
    document.getElementById('dashDangerCount').innerText = dangerCount;

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
