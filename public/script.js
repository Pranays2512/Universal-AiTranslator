let isAuthenticated = false;
let currentUser = null;
const inputText = document.getElementById('inputText');
const wordCount = document.getElementById('wordCount');

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    setupThemeToggle();
});

function setupThemeToggle() {
    // Check for saved theme preference or prefer-color-scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // Set up the toggle button
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Add a nice animation effect
        document.body.style.transition = 'background-color 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    });
}

function setupEventListeners() {
    inputText.addEventListener('input', () => {
        const count = inputText.value.length;
        wordCount.textContent = `${count} / 5000`;
        wordCount.style.color = count > 4500 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
    });

    inputText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            translateText();
        }
    });

    const focusableElements = document.querySelectorAll('input, select, textarea, button');
    focusableElements.forEach(element => {
        element.addEventListener('focus', () => element.style.transform = 'scale(1.01)');
        element.addEventListener('blur', () => element.style.transform = 'scale(1)');
    });

    document.getElementById('authOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closeWindow();
        }
    });
    
    // Add event listener for microphone button
    document.getElementById('micBtn').addEventListener('click', toggleSpeechRecognition);
    
    // Update speech recognition language when input language changes
    document.getElementById('inputLang').addEventListener('change', function() {
        if (recognition && this.value !== 'auto') {
            recognition.lang = this.value;
        }
    });
}

function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
     
        const userData = getCurrentUser(); 
        if (userData) {
            isAuthenticated = true;
            currentUser = userData;
            showUserInfo();
        } else {
          
            isAuthenticated = false;
            localStorage.removeItem('token'); 
            hideUserInfo();
        }
    } else {
        isAuthenticated = false;
        hideUserInfo();
    }
}

function getCurrentUser() {
    
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return currentUser;
}

function showUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        userName.textContent = currentUser.name;
        userInfo.classList.add('active');
    }
}

function hideUserInfo() {
    document.getElementById('userInfo').classList.remove('active');
}

function showWindow() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeWindow() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchWindow(tab) {
    const signinTab = document.getElementById('signinTab');
    const signupTab = document.getElementById('signupTab');
    const nameGroup = document.getElementById('nameGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    
    const isSignin = tab === 'signin';
    
    signinTab.classList.toggle('active', isSignin);
    signupTab.classList.toggle('active', !isSignin);
    
    document.getElementById('authTitle').textContent = isSignin ? 'Welcome Back' : 'Create Account';
    document.getElementById('authSubtitle').textContent = isSignin ? 'Sign in to access the translator' : 'Sign up to start translating';
    document.getElementById('authSubmitBtn').textContent = isSignin ? 'Sign In' : 'Sign Up';
    
    nameGroup.style.display = isSignin ? 'none' : 'block';
    confirmPasswordGroup.style.display = isSignin ? 'none' : 'block';
    document.getElementById('forgotLink').style.display = isSignin ? 'block' : 'none';
    
    document.getElementById('nameInput').required = !isSignin;
    document.getElementById('confirmPasswordInput').required = !isSignin;
}

async function signUpAndSignIn(event) {
    event.preventDefault();

    const isSignUp = document.getElementById('signupTab').classList.contains('active');
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordInput').value.trim();
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!email || !password || (isSignUp && (!name || !confirmPassword))) {
        alert('Please fill all required fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    if (isSignUp && password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    submitBtn.textContent = isSignUp ? 'Creating Account...' : 'Signing In...';
    submitBtn.disabled = true;

    try {
        const body = isSignUp
            ? { name, email, password, confirmPassword }
            : { email, password };

        const endpoint = isSignUp ? '/signup' : '/sign-in';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            const token = data.token;
            localStorage.setItem('token', token); 
            localStorage.setItem('currentUser', JSON.stringify(data.user)); 
            currentUser = data.user;
            isAuthenticated = true;
            showUserInfo();
            closeWindow();
            clearAuthForm();
        } else {
            alert(data.message || 'Authentication failed');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    }

    submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    submitBtn.disabled = false;
}

function clearAuthForm() {
    document.getElementById('authForm').reset();
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        isAuthenticated = false;
        currentUser = null;
        localStorage.removeItem('token'); 
        localStorage.removeItem('currentUser'); 
        hideUserInfo();
        clearText();
    }
}

function showForgotPassword() {
    alert('Password reset functionality would be implemented in a real app.');
}

async function translateText() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }

    const input = inputText.value.trim();
    const output = document.getElementById('outputText');
    const btn = document.getElementById('translateBtn');
  
    const targetLanguage = document.getElementById('outputLang')?.value || 'en';

    if (!input) {
        output.value = '';
        return;
    }

    btn.textContent = 'Translating...';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    output.classList.add('loading');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showWindow();
            return;
        }

        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
          
            body: JSON.stringify({ text: input, targetLang: targetLanguage }) 
        });

        const data = await response.json();

        if (response.ok) {
            output.value = data.translatedText; 
        } else {
            output.value = '';
            if (response.status === 401) {
               
                logout();
                showWindow();
            } else {
                alert(data.message || 'Translation failed');
            }
        }
    } catch (err) {
        output.value = '';
        alert('Error connecting to server');
        console.error(err);
    }

    btn.textContent = 'Translate';
    btn.disabled = false;
    btn.style.opacity = '1';
    output.classList.remove('loading');

    output.style.transform = 'scale(1.01)';
    setTimeout(() => { output.style.transform = 'scale(1)'; }, 300);
}

function clearText() {
    inputText.value = '';
    document.getElementById('outputText').value = '';
    wordCount.textContent = '0 / 5000';
    wordCount.style.color = 'rgba(255, 255, 255, 0.4)';
}

function copyTranslation() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }
    
    const output = document.getElementById('outputText');
    const copyBtn = document.getElementById('copyBtn');
    
    if (output.value) {
        navigator.clipboard.writeText(output.value).then(() => {
            copyBtn.textContent = 'Copied';
            copyBtn.style.background = 'rgba(255, 255, 255, 0.15)';
            copyBtn.style.color = '#ffffff';
            
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.style.background = 'rgba(255, 255, 255, 0.06)';
                copyBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            }, 2000);
        });
    }
}

// Speech recognition variables
let recognition = null;
let isListening = false;

// Check if browser supports speech recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Default language
        
        recognition.onstart = () => {
            isListening = true;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.add('listening');
            micBtn.title = 'Stop listening';
        };
        
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
                
            inputText.value = transcript;
            // Trigger the input event to update word count
            inputText.dispatchEvent(new Event('input'));
        };
        
        recognition.onend = () => {
            isListening = false;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.remove('listening');
            micBtn.title = 'Speech to text';
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            isListening = false;
            const micBtn = document.getElementById('micBtn');
            micBtn.classList.remove('listening');
            micBtn.title = 'Speech to text';
            
            if (event.error === 'not-allowed') {
                alert('Microphone permission denied. Please allow microphone access to use speech recognition.');
            }
        };
        
        return true;
    } else {
        console.log('Speech recognition not supported');
        return false;
    }
}

function toggleSpeechRecognition() {
    if (!isAuthenticated) {
        showWindow();
        return;
    }
    
    if (!recognition && !initSpeechRecognition()) {
        alert('Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.');
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        // Update recognition language based on input language selection
        const inputLang = document.getElementById('inputLang').value;
        if (inputLang !== 'auto') {
            recognition.lang = inputLang;
        }
        
        try {
            recognition.start();
        } catch (error) {
            console.error('Speech recognition error', error);
        }
    }
}