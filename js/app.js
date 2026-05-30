/**
 * AegisCipher UI Controller
 * Orchestrates event listeners, toast animations, security functions, and connects UI with the cryptographic core.
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const tabEncrypt = document.getElementById("tab-encrypt");
    const tabDecrypt = document.getElementById("tab-decrypt");
    const panelEncrypt = document.getElementById("panel-encrypt");
    const panelDecrypt = document.getElementById("panel-decrypt");

    const encryptInput = document.getElementById("encrypt-input");
    const encryptKey = document.getElementById("encrypt-key");
    const decryptInput = document.getElementById("decrypt-input");
    const decryptKey = document.getElementById("decrypt-key");

    const btnEncrypt = document.getElementById("btn-encrypt");
    const btnDecrypt = document.getElementById("btn-decrypt");
    const btnGeneratePassword = document.getElementById("btn-generate-password");
    
    const advTriggerEncrypt = document.getElementById("adv-trigger-encrypt");
    const advContentEncrypt = document.getElementById("adv-content-encrypt");
    const encryptAlgo = document.getElementById("encrypt-algo");
    const encryptHash = document.getElementById("encrypt-hash");
    const encryptIterations = document.getElementById("encrypt-iterations");
    const valEncryptIterations = document.getElementById("val-encrypt-iterations");
    const encryptSalt = document.getElementById("encrypt-salt");

    const resultBox = document.getElementById("result-box");
    const resultTitle = document.getElementById("result-title");
    const resultContent = document.getElementById("result-content");
    const btnCopyResult = document.getElementById("btn-copy-result");
    const btnClearResult = document.getElementById("btn-clear-result");

    const strengthIndicator = document.getElementById("strength-indicator");
    const strengthBar = document.getElementById("strength-bar");
    const strengthText = document.getElementById("strength-text");

    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");
    const toastIconCheck = document.getElementById("toast-icon-check");
    const toastIconError = document.getElementById("toast-icon-error");

    let clipboardClearTimeout = null;

    // --- Tab Switching Logic ---
    const switchTab = (activeTab, inactiveTab, showPanel, hidePanel) => {
        activeTab.classList.add("active");
        activeTab.setAttribute("aria-selected", "true");
        inactiveTab.classList.remove("active");
        inactiveTab.setAttribute("aria-selected", "false");
        showPanel.style.display = "block";
        hidePanel.style.display = "none";
        hideResultBox();
    };

    tabEncrypt.addEventListener("click", () => {
        switchTab(tabEncrypt, tabDecrypt, panelEncrypt, panelDecrypt);
    });

    tabDecrypt.addEventListener("click", () => {
        switchTab(tabDecrypt, tabEncrypt, panelDecrypt, panelEncrypt);
    });

    // --- Password Visibility Toggle ---
    document.querySelectorAll(".toggle-password-visibility").forEach(button => {
        button.addEventListener("click", () => {
            const targetId = button.getAttribute("data-target");
            const targetInput = document.getElementById(targetId);
            const useElement = button.querySelector("use");

            if (targetInput.type === "password") {
                targetInput.type = "text";
                useElement.setAttribute("href", "#icon-eye-off");
            } else {
                targetInput.type = "password";
                useElement.setAttribute("href", "#icon-eye");
            }
        });
    });

    // --- Advanced Cryptography Toggle ---
    advTriggerEncrypt.addEventListener("click", () => {
        advTriggerEncrypt.classList.toggle("expanded");
        advContentEncrypt.classList.toggle("show");
    });

    encryptIterations.addEventListener("input", () => {
        const val = parseInt(encryptIterations.value, 10);
        valEncryptIterations.textContent = val >= 1000 ? `${val / 1000}k` : val;
    });

    // --- Password Strength Meter ---
    encryptKey.addEventListener("input", () => {
        const value = encryptKey.value;
        if (!value) {
            strengthIndicator.style.display = "none";
            strengthText.style.display = "none";
            return;
        }

        strengthIndicator.style.display = "block";
        strengthText.style.display = "block";

        let score = 0;
        if (value.length >= 8) score++;
        if (value.length >= 14) score++;
        if (/[A-Z]/.test(value)) score++;
        if (/[0-9]/.test(value)) score++;
        if (/[^A-Za-z0-9]/.test(value)) score++;

        let color = "var(--color-error)";
        let text = "Weak";
        let width = "25%";

        if (score >= 4) {
            color = "var(--color-success)";
            text = "Strong (Excellent)";
            width = "100%";
        } else if (score >= 2) {
            color = "var(--color-accent)";
            text = "Medium";
            width = "60%";
        }

        strengthBar.style.width = width;
        strengthBar.style.backgroundColor = color;
        strengthText.textContent = `Strength: ${text}`;
        strengthText.style.color = color;
    });

    // --- Password Generator ---
    btnGeneratePassword.addEventListener("click", () => {
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        const allChars = uppercase + lowercase + numbers + symbols;

        let password = "";
        
        // Ensure at least one character from each set
        password += uppercase[Math.floor(window.crypto.getRandomValues(new Uint32Array(1))[0] % uppercase.length)];
        password += lowercase[Math.floor(window.crypto.getRandomValues(new Uint32Array(1))[0] % lowercase.length)];
        password += numbers[Math.floor(window.crypto.getRandomValues(new Uint32Array(1))[0] % numbers.length)];
        password += symbols[Math.floor(window.crypto.getRandomValues(new Uint32Array(1))[0] % symbols.length)];

        // Generate the rest of the 16-character password securely
        const randomValues = new Uint32Array(12);
        window.crypto.getRandomValues(randomValues);
        for (let i = 0; i < 12; i++) {
            password += allChars[randomValues[i] % allChars.length];
        }

        // Shuffle characters
        password = password.split('').sort(() => window.crypto.getRandomValues(new Uint32Array(1))[0] % 2 - 0.5).join('');

        encryptInput.value = password;
        showToast("Secure 16-char password generated!", false);
        
        // Trigger resize event
        encryptInput.style.height = 'auto';
        encryptInput.style.height = `${encryptInput.scrollHeight}px`;
    });

    // --- Toast Notifications ---
    const showToast = (message, isError = false) => {
        toastMessage.textContent = message;
        if (isError) {
            toast.classList.add("error");
            toastIconCheck.style.display = "none";
            toastIconError.style.display = "block";
        } else {
            toast.classList.remove("error");
            toastIconCheck.style.display = "block";
            toastIconError.style.display = "none";
        }
        
        toast.classList.add("show");
        
        // Haptic feedback (Vibration)
        if (navigator.vibrate) {
            navigator.vibrate(isError ? [100, 50, 100] : 50);
        }

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    };

    // --- Handle Result Actions ---
    const showResultBox = (title, content, type = "success") => {
        resultTitle.textContent = title;
        resultTitle.style.color = type === "success" ? "var(--color-success)" : "var(--color-accent)";
        resultContent.textContent = content;
        resultBox.classList.add("show");
    };

    const hideResultBox = () => {
        resultBox.classList.remove("show");
        resultContent.textContent = "";
    };

    btnCopyResult.addEventListener("click", () => {
        const textToCopy = resultContent.textContent;
        if (!textToCopy) return;

        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("Copied to clipboard!", false);

            // Auto-clear clipboard security feature
            if (clipboardClearTimeout) {
                clearTimeout(clipboardClearTimeout);
            }

            clipboardClearTimeout = setTimeout(() => {
                // Read current clipboard to check if it's still our text, then clear
                navigator.clipboard.readText().then(currentText => {
                    if (currentText === textToCopy) {
                        navigator.clipboard.writeText("").then(() => {
                            showToast("Clipboard cleared for safety.", false);
                        });
                    }
                }).catch(() => {
                    // Fallback to absolute clear if reading is blocked
                    navigator.clipboard.writeText("");
                });
            }, 30000); // 30 seconds clear timer
        }).catch(() => {
            showToast("Clipboard write permission denied.", true);
        });
    });

    btnClearResult.addEventListener("click", () => {
        // Clear secret values in-memory
        encryptInput.value = "";
        encryptKey.value = "";
        decryptInput.value = "";
        decryptKey.value = "";
        
        // Trigger visual wipes
        strengthIndicator.style.display = "none";
        strengthText.style.display = "none";
        hideResultBox();

        // Clear clipboard immediately
        navigator.clipboard.writeText("").then(() => {
            showToast("Session wiped & clipboard cleared!", false);
        });
        
        if (clipboardClearTimeout) {
            clearTimeout(clipboardClearTimeout);
            clipboardClearTimeout = null;
        }
    });

    // --- Encryption Trigger ---
    btnEncrypt.addEventListener("click", async () => {
        const text = encryptInput.value.trim();
        const key = encryptKey.value;

        if (!text) {
            showToast("Please enter text to encrypt.", true);
            return;
        }
        if (!key) {
            showToast("Please enter a secret key.", true);
            return;
        }

        try {
            btnEncrypt.disabled = true;
            btnEncrypt.textContent = "Encrypting...";

            const encrypted = await AegisCrypto.encrypt(text, key, {
                algo: encryptAlgo.value,
                hashAlgo: encryptHash.value,
                iterations: parseInt(encryptIterations.value, 10),
                customSalt: encryptSalt.value.trim()
            });

            showResultBox("Encrypted Cipher Payload", encrypted, "success");
            showToast("Encryption successful!", false);
        } catch (err) {
            showToast(err.message || "Encryption failed.", true);
        } finally {
            btnEncrypt.disabled = false;
            btnEncrypt.innerHTML = `<svg><use href="#icon-lock"/></svg> Encrypt Locally`;
        }
    });

    // --- Decryption Trigger ---
    btnDecrypt.addEventListener("click", async () => {
        const payload = decryptInput.value.trim();
        const key = decryptKey.value;

        if (!payload) {
            showToast("Please enter ciphertext payload.", true);
            return;
        }
        if (!key) {
            showToast("Please enter secret passphrase.", true);
            return;
        }

        try {
            btnDecrypt.disabled = true;
            btnDecrypt.textContent = "Decrypting...";

            const decrypted = await AegisCrypto.decrypt(payload, key);

            showResultBox("Decrypted Plaintext", decrypted, "decrypt");
            showToast("Decryption successful!", false);
        } catch (err) {
            showToast(err.message || "Decryption failed.", true);
        } finally {
            btnDecrypt.disabled = false;
            btnDecrypt.innerHTML = `<svg><use href="#icon-unlock"/></svg> Decrypt Locally`;
        }
    });
});
