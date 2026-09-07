document.addEventListener('DOMContentLoaded', () => {

    // --- 1. NAVIGATION SYSTEM ---
    const navButtons = document.querySelectorAll('.premium-nav-btn');
    const panels = document.querySelectorAll('.panel');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active-panel'));

            btn.classList.add('active');
            const targetPanel = document.getElementById(target);
            if (targetPanel) targetPanel.classList.add('active-panel');
        });
    });

    // --- 2. DOM REFERENCES ---
    const articleInput = document.getElementById('articleInput');
    const wordCount = document.getElementById('wordCount');
    const charCount = document.getElementById('charCount');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const sampleBtn = document.getElementById('sampleBtn');
    const copyResultBtn = document.getElementById('copyResultBtn');

    const hudProgressRing = document.getElementById('hudProgressRing');
    const scorePercentage = document.getElementById('scorePercentage');
    const scoreLabelText = document.getElementById('scoreLabelText');
    const hudSummaryBox = document.getElementById('hudSummaryBox');
    const hudSummaryTitle = document.getElementById('hudSummaryTitle');
    const scoreSummaryText = document.getElementById('scoreSummaryText');
    const reliablePatternBar = document.getElementById('reliablePatternBar');
    const reliablePatternValue = document.getElementById('reliablePatternValue');
    const misleadingPatternBar = document.getElementById('misleadingPatternBar');
    const misleadingPatternValue = document.getElementById('misleadingPatternValue');
    const reliableSubtext = document.getElementById('reliableSubtext');
    const misleadingSubtext = document.getElementById('misleadingSubtext');
    const signalList = document.getElementById('signalList');

    const historyList = document.getElementById('historyList');
    const historyCount = document.getElementById('historyCount');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    const latencyMetric = document.getElementById('latencyMetric');

    // Samples Dataset
    const samples = {
        factual: [
            "Hey Naveen, are we still meeting for lunch at 1 PM today? Let me know if you want to pick up coffee on the way.",
            "Hi team, please review the revised schedule attached to the project repository.",
            "Your appointment with Dr. Sharma is confirmed for tomorrow at 10:30 AM."
        ],
        phishing: [
            "URGENT: Your account has been temporarily blocked due to unauthorized login attempts. Click http://bit.ly/secure-auth to verify.",
            "Security Alert: Your password expires in 2 hours. Update your credentials at http://verify-credentials.com now."
        ],
        scam: [
            "Congratulations! Your phone number won $1,000,000 in our international drawing. Call +1-800-555-0199 to claim your cash reward!",
            "Claim your free $500 gift card today by completing a short survey at http://claim-gift.org."
        ]
    };

    const allSamples = [...samples.factual, ...samples.phishing, ...samples.scam];

    // --- 3. DEBOUNCED INPUT COUNTER ---
    let debounceTimer;
    function updateCounters() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const text = articleInput.value;
            charCount.textContent = text.length;
            wordCount.textContent = text.trim() ? text.trim().split(/\s+/).length : 0;
        }, 50);
    }

    if (articleInput) {
        articleInput.addEventListener('input', updateCounters);
    }

    // --- 4. HUD RESET LOGIC ---
    const CIRCUMFERENCE = 578.05;

    function resetResults() {
        if (hudProgressRing) {
            hudProgressRing.style.strokeDasharray = `0 ${CIRCUMFERENCE}`;
            hudProgressRing.style.stroke = 'url(#hudGradientReliable)';
        }

        if (scorePercentage) scorePercentage.textContent = '0%';
        if (scoreLabelText) {
            scoreLabelText.textContent = 'READY';
            scoreLabelText.style.color = 'var(--text-muted, #808ea3)';
        }

        if (hudSummaryBox) hudSummaryBox.classList.remove('danger');
        if (hudSummaryTitle) hudSummaryTitle.textContent = 'AWAITING INPUT';
        if (scoreSummaryText) scoreSummaryText.textContent = 'Enter text above and click "Analyze Content" to generate an authenticity report.';

        if (reliablePatternBar) reliablePatternBar.style.width = '0%';
        if (reliablePatternValue) reliablePatternValue.textContent = '0%';
        if (misleadingPatternBar) misleadingPatternBar.style.width = '0%';
        if (misleadingPatternValue) misleadingPatternValue.textContent = '0%';
        if (reliableSubtext) reliableSubtext.textContent = '—';
        if (misleadingSubtext) misleadingSubtext.textContent = '—';

        if (signalList) signalList.innerHTML = '';
        if (latencyMetric) latencyMetric.textContent = '';
    }

    // --- 5. QUICK ACTIONS ---
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (articleInput) articleInput.value = '';
            updateCounters();
            resetResults();
        });
    }

    if (sampleBtn) {
        sampleBtn.addEventListener('click', () => {
            articleInput.value = allSamples[Math.floor(Math.random() * allSamples.length)];
            updateCounters();
        });
    }

    document.querySelectorAll('.sample-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const type = pill.dataset.type;
            if (samples[type]) {
                articleInput.value = samples[type][Math.floor(Math.random() * samples[type].length)];
                updateCounters();
            }
        });
    });

    if (copyResultBtn) {
        copyResultBtn.addEventListener('click', () => {
            if (scoreSummaryText && scoreSummaryText.textContent) {
                navigator.clipboard.writeText(scoreSummaryText.textContent);
                alert('Analysis report copied to clipboard.');
            }
        });
    }

    // --- 6. AUDIT HISTORY & EXPORT ---
    let auditLog = JSON.parse(localStorage.getItem('authentiq_history') || '[]');

    function saveToHistory(text, isSpam, score) {
        const entry = {
            id: Date.now(),
            text: text.length > 50 ? text.substring(0, 50) + '...' : text,
            isSpam,
            score,
            timestamp: new Date().toLocaleTimeString()
        };
        auditLog.unshift(entry);
        if (auditLog.length > 15) auditLog.pop();
        localStorage.setItem('authentiq_history', JSON.stringify(auditLog));
        renderHistory();
    }

    function renderHistory() {
        if (!historyList) return;
        if (historyCount) historyCount.textContent = auditLog.length;

        if (auditLog.length === 0) {
            historyList.innerHTML = `<div style="font-size:12px; color:var(--text-muted); padding:12px;">No historical analyses recorded.</div>`;
            return;
        }

        historyList.innerHTML = auditLog.map(item => `
            <div class="signal-card-item">
                <div class="signal-info">
                    <h5>${item.text}</h5>
                    <p>Time: ${item.timestamp} — Score: ${item.score}%</p>
                </div>
                <span class="signal-pill-tag ${item.isSpam ? 'pill-danger' : 'pill-clean'}">${item.isSpam ? 'SPAM' : 'CLEAN'}</span>
            </div>
        `).join('');
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            auditLog = [];
            localStorage.removeItem('authentiq_history');
            renderHistory();
        });
    }

    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `authentiq_history_${Date.now()}.json`;
            a.click();
        });
    }

    renderHistory();

    // --- 7. API INFERENCE ENGINE ---
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const text = articleInput.value.trim();
            if (!text) return alert('Please enter or select text to analyze.');

            resetResults();
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';

            try {
                const res = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });

                if (res.ok) {
                    const data = await res.json();
                    renderResults(data, text);
                } else {
                    alert('Server error processing request.');
                }
            } catch (err) {
                console.error('API Error:', err);
                alert('Connection error. Ensure backend is running.');
            } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze Content';
            }
        });
    }

    function animateCountUp(targetEl, finalVal) {
        let current = 0;
        const duration = 500;
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = finalVal / steps;

        const timer = setInterval(() => {
            current += increment;
            if (current >= finalVal) {
                targetEl.textContent = `${finalVal}%`;
                clearInterval(timer);
            } else {
                targetEl.textContent = `${Math.round(current)}%`;
            }
        }, stepTime);
    }

    function renderResults(data, inputText) {
        const isSpam = data.is_spam;
        const spamProb = data.spam_probability;
        const nonSpamProb = data.non_spam_probability;
        const signals = data.signals || {};

        if (latencyMetric && data.execution_time_ms) {
            latencyMetric.textContent = `● ${data.execution_time_ms}ms`;
        }

        const primaryScore = isSpam ? spamProb : nonSpamProb;
        const fillLength = (primaryScore / 100) * CIRCUMFERENCE;

        if (hudProgressRing) {
            hudProgressRing.style.strokeDasharray = `${fillLength} ${CIRCUMFERENCE - fillLength}`;
        }

        if (isSpam) {
            if (hudProgressRing) hudProgressRing.style.stroke = 'url(#hudGradientMisleading)';
            if (scorePercentage) animateCountUp(scorePercentage, spamProb);
            if (scoreLabelText) {
                scoreLabelText.textContent = 'SPAM RISK';
                scoreLabelText.style.color = '#ff4757';
            }

            if (hudSummaryBox) hudSummaryBox.classList.add('danger');
            if (hudSummaryTitle) hudSummaryTitle.textContent = 'HIGH RISK DECEPTIVE TEXT';
            if (scoreSummaryText) {
                scoreSummaryText.textContent = `Warning: Flagged as Spam (${spamProb}% confidence). Unsolicited structure detected with suspicious markers.`;
            }

            if (reliableSubtext) reliableSubtext.textContent = 'Low Authenticity';
            if (misleadingSubtext) misleadingSubtext.textContent = 'Critical Risk';
        } else {
            if (hudProgressRing) hudProgressRing.style.stroke = 'url(#hudGradientReliable)';
            if (scorePercentage) animateCountUp(scorePercentage, nonSpamProb);
            if (scoreLabelText) {
                scoreLabelText.textContent = 'AUTHENTIC';
                scoreLabelText.style.color = '#00f2fe';
            }

            if (hudSummaryBox) hudSummaryBox.classList.remove('danger');
            if (hudSummaryTitle) hudSummaryTitle.textContent = 'VERIFIED CLEAN CONTENT';
            if (scoreSummaryText) {
                scoreSummaryText.textContent = `Verified as Non-Spam (${nonSpamProb}% confidence). Standard conversational structure with reliable linguistic patterns.`;
            }

            if (reliableSubtext) reliableSubtext.textContent = 'Authentic Text';
            if (misleadingSubtext) misleadingSubtext.textContent = 'Minimal Risk';
        }

        if (reliablePatternBar) reliablePatternBar.style.width = `${nonSpamProb}%`;
        if (reliablePatternValue) reliablePatternValue.textContent = `${nonSpamProb}%`;
        if (misleadingPatternBar) misleadingPatternBar.style.width = `${spamProb}%`;
        if (misleadingPatternValue) misleadingPatternValue.textContent = `${spamProb}%`;

        if (signalList) {
            signalList.innerHTML = `
                <div class="signal-card-item">
                    <div class="signal-info">
                        <h5>Spam Classifier</h5>
                        <p>${isSpam ? 'Matches known spam or phishing structures.' : 'Classified as clean communication.'}</p>
                    </div>
                    <span class="signal-pill-tag ${isSpam ? 'pill-danger' : 'pill-clean'}">${isSpam ? 'Spam' : 'Non-Spam'}</span>
                </div>
                <div class="signal-card-item">
                    <div class="signal-info">
                        <h5>Urgency Language</h5>
                        <p>${signals.has_urgency ? 'Contains urgent demands or pressure phrases.' : 'Normal urgency levels detected.'}</p>
                    </div>
                    <span class="signal-pill-tag ${signals.has_urgency ? 'pill-warning' : 'pill-clean'}">${signals.has_urgency ? 'High Urgency' : 'Normal'}</span>
                </div>
                <div class="signal-card-item">
                    <div class="signal-info">
                        <h5>Financial Triggers</h5>
                        <p>${signals.has_financial_triggers ? 'Contains financial claims or reward hooks.' : 'No monetary triggers detected.'}</p>
                    </div>
                    <span class="signal-pill-tag ${signals.has_financial_triggers ? 'pill-danger' : 'pill-clean'}">${signals.has_financial_triggers ? 'Reward Hook' : 'Clean'}</span>
                </div>
            `;
        }

        saveToHistory(inputText, isSpam, primaryScore);
    }
});