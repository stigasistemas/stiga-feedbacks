// ================================================================
// STIGA FINANCE — TUTORIAIS
// ================================================================

const firebaseConfig = {
    apiKey: "AIzaSyA3sqLG4T5UkRviauT8A4xo5SN59uWvrAs",
    authDomain: "stiga-finance-72dbf.firebaseapp.com",
    projectId: "stiga-finance-72dbf",
    storageBucket: "stiga-finance-72dbf.firebasestorage.app",
    messagingSenderId: "148799450086",
    appId: "1:148799450086:web:743faed370d44b146ac427"
};

let auth = null;
let db   = null;
let currentUser = null;
let selectedStar = 0;
let authReady = false;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', function () {
    if (typeof firebase === 'undefined') {
        showToast('Erro ao carregar Firebase', 'error');
        resetLoginBtn();
        return;
    }

    try {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db   = firebase.firestore();
    } catch (e) {
        console.error('Firebase init error:', e);
        showToast('Erro ao inicializar Firebase', 'error');
        resetLoginBtn();
        return;
    }

    // Garante que a sessão persista localmente (não expira ao fechar/reabrir aba)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => {
        console.warn('Persistence warning:', e);
    });

    auth.onAuthStateChanged(user => {
        authReady = true;
        if (user) {
            currentUser = user;
            showScreen('home');
            setUserName(user);
            checkAlreadyFeedback(user.uid);

            // Renova o token a cada 50 minutos para evitar expiração silenciosa
            if (window._tokenRefreshInterval) clearInterval(window._tokenRefreshInterval);
            window._tokenRefreshInterval = setInterval(async () => {
                try {
                    if (auth.currentUser) {
                        await auth.currentUser.getIdToken(true);
                        console.log('Token renovado com sucesso');
                    }
                } catch (err) {
                    console.error('Erro ao renovar token:', err);
                }
            }, 50 * 60 * 1000); // 50 minutos

        } else {
            currentUser = null;
            if (window._tokenRefreshInterval) {
                clearInterval(window._tokenRefreshInterval);
                window._tokenRefreshInterval = null;
            }
            showScreen('login');
        }
    }, err => {
        console.error('Auth state error:', err);
        authReady = true;
        showScreen('login');
    });

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    initParticles();
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideo(); });
});

// ================================================================
// SCREENS
// ================================================================
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
}

function setUserName(user) {
    const name = user.displayName || user.email.split('@')[0];
    const el = document.getElementById('hdrUser');
    if (el) el.textContent = 'Olá, ' + name;
}

function openModule(mod) { showScreen(mod); }
function goHome() { showScreen('home'); }

// ================================================================
// LOGIN
// ================================================================
const BTN_LOGIN_HTML = '<span>Acessar Tutoriais</span>' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<line x1="5" y1="12" x2="19" y2="12"/>' +
    '<polyline points="12 5 19 12 12 19"/></svg>';

function resetLoginBtn() {
    const btn = document.getElementById('btnLogin');
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML = BTN_LOGIN_HTML;
}

async function handleLogin(e) {
    e.preventDefault();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn      = document.getElementById('btnLogin');

    if (!email || !password) {
        showToast('❌ Preencha email e senha', 'error');
        return;
    }

    if (!auth) {
        showToast('❌ Firebase não inicializado. Recarregue a página.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span>Entrando...</span>';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged cuida do redirect
    } catch (err) {
        console.error('Login error code:', err.code, 'message:', err.message);

        const msgs = {
            'auth/invalid-email':          '❌ Email inválido',
            'auth/user-not-found':         '❌ Usuário não encontrado',
            'auth/wrong-password':         '🔑 Senha incorreta',
            'auth/user-disabled':          '🚫 Conta desabilitada',
            'auth/too-many-requests':      '⏰ Muitas tentativas. Aguarde e tente novamente.',
            'auth/network-request-failed': '🌐 Sem internet. Verifique sua conexão.',
            'auth/invalid-credential':     '🔑 Email ou senha incorretos',
            'auth/operation-not-allowed':  '🚫 Login não permitido',
        };

        const msg = msgs[err.code] || ('🔑 Erro: ' + (err.code || 'desconhecido'));
        showToast(msg, 'error');
        resetLoginBtn();
    }
}

function logout() {
    if (auth) auth.signOut();
}

// ================================================================
// TOGGLE SENHA
// ================================================================
function togglePw() {
    const input = document.getElementById('loginPassword');
    const icon  = document.getElementById('eyeIco');
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

// ================================================================
// VÍDEO
// ================================================================
function openVideo(videoId, title) {
    if (!videoId || videoId.startsWith('COLE_')) {
        showToast('🎬 Vídeo ainda não configurado', 'info');
        return;
    }
    document.getElementById('vmodalTitle').textContent = title;
    document.getElementById('videoFrame').src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0';
    document.getElementById('videoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeVideo() {
    document.getElementById('videoModal').classList.remove('active');
    document.getElementById('videoFrame').src = '';
    document.body.style.overflow = '';
}

function handleModalClick(e) {
    if (e.target === document.getElementById('videoModal')) closeVideo();
}

// ================================================================
// STARS — FEEDBACK
// ================================================================
const starLabels = ['', 'Ruim 😞', 'Regular 😐', 'Bom 😊', 'Ótimo 😄', 'Incrível! 🤩'];

function hoverStar(val) {
    document.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('hovered', i < val);
    });
}

function unhoverStar() {
    document.querySelectorAll('.star').forEach((s, i) => {
        s.classList.remove('hovered');
        s.classList.toggle('active', i < selectedStar);
    });
}

function setStar(val) {
    selectedStar = val;
    document.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('active', i < val);
    });
    document.getElementById('starLabel').textContent = starLabels[val];
    document.getElementById('btnFeedback').disabled = false;
}

// ================================================================
// SUBMIT FEEDBACK
// ================================================================
async function submitFeedback() {
    if (!selectedStar) return;

    // Usuário precisa estar autenticado
    if (!currentUser) {
        showToast('❌ Você precisa estar logado para avaliar.', 'error');
        return;
    }

    // Validações no cliente
    const stars = parseInt(selectedStar, 10);
    if (stars < 1 || stars > 5) {
        showToast('❌ Avaliação inválida.', 'error');
        return;
    }

    const rawText = document.getElementById('fbText').value;
    const text    = rawText.trim().substring(0, 500); // limita a 500 chars

    const btn = document.getElementById('btnFeedback');
    btn.disabled = true;
    btn.innerHTML = '<span>Enviando...</span>';

    try {
        // 🔒 doc(uid) garante 1 feedback por usuário (validado também nas regras do Firestore)
        await db.collection('feedbacks').doc(currentUser.uid).set({
            uid:       currentUser.uid,
            email:     currentUser.email,
            stars:     stars,
            comment:   text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('fbStep1').style.display = 'none';
        document.getElementById('fbStep2').style.display = 'block';
        document.getElementById('fbStarsShow').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);

        localStorage.setItem('fb_done_' + currentUser.uid, '1');
        showToast('✅ Avaliação enviada! Obrigado!', 'success');

    } catch (err) {
        console.error('Erro ao salvar feedback:', err);
        btn.disabled = false;
        btn.innerHTML = '<span>Enviar Avaliação</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
        showToast('Erro ao enviar. Tente novamente.', 'error');
    }
}

function checkAlreadyFeedback(uid) {
    // Verifica localStorage primeiro (rápido)
    if (localStorage.getItem('fb_done_' + uid)) {
        _showFeedbackDone();
        return;
    }
    // Verifica no Firestore (fonte verdadeira — doc com ID = uid)
    db.collection('feedbacks').doc(uid).get().then(doc => {
        if (doc.exists) {
            localStorage.setItem('fb_done_' + uid, '1');
            _showFeedbackDone();
        }
    }).catch(() => {}); // silencia erro — não bloqueia o usuário
}

function _showFeedbackDone() {
    const step1 = document.getElementById('fbStep1');
    const step2 = document.getElementById('fbStep2');
    if (!step1 || !step2) return;
    step1.style.display = 'none';
    step2.style.display = 'block';
    document.getElementById('fbStarsShow').textContent = '★★★★★';
    const txt = step2.querySelector('.fb-success-text');
    if (txt) txt.textContent = 'Você já enviou sua avaliação. Muito obrigado pelo feedback!';
}

// ================================================================
// TOAST
// ================================================================
function showToast(msg, type) {
    type = type || 'info';
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(function() { el.classList.remove('show'); }, 4000);
}

// ================================================================
// PARTICLES
// ================================================================
function initParticles() {
    if (typeof particlesJS === 'undefined') return;
    particlesJS('particles-js', {
        particles: {
            number: { value: 55, density: { enable: true, value_area: 900 } },
            color: { value: '#D4AF37' },
            shape: { type: 'circle' },
            opacity: { value: 0.22, random: true, anim: { enable: true, speed: 1, opacity_min: 0.05 } },
            size:    { value: 2.5, random: true, anim: { enable: true, speed: 2, size_min: 0.1 } },
            line_linked: { enable: true, distance: 140, color: '#D4AF37', opacity: 0.13, width: 1 },
            move: { enable: true, speed: 1.4, direction: 'none', out_mode: 'out' }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { enable: true, mode: 'grab' },
                onclick: { enable: true, mode: 'push' },
                resize: true
            },
            modes: {
                grab: { distance: 130, line_linked: { opacity: 0.35 } },
                push: { particles_nb: 3 }
            }
        },
        retina_detect: true
    });
}

console.log('Stiga Finance Tutoriais carregado');
