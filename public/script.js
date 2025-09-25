let isAuthenticated = false;
let currentUser = null;
const inputText = document.getElementById('inputText');
const wordCount = document.getElementById('wordCount');

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
});

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