/**
 * AegisCipher UI Controller
 * Orchestrates event listeners, toast animations, security functions, and connects UI with the cryptographic core.
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const tabEncrypt = document.getElementById("tab-encrypt");
    const tabDecrypt = document.getElementById("tab-decrypt");
    const tabVault = document.getElementById("tab-vault");
    const panelEncrypt = document.getElementById("panel-encrypt");
    const panelDecrypt = document.getElementById("panel-decrypt");
    const panelVault = document.getElementById("panel-vault");

    const encryptInput = document.getElementById("encrypt-input");
    const encryptKey = document.getElementById("encrypt-key");
    const decryptInput = document.getElementById("decrypt-input");
    const decryptKey = document.getElementById("decrypt-key");

    const btnEncrypt = document.getElementById("btn-encrypt");
    const btnDecrypt = document.getElementById("btn-decrypt");
    const btnGeneratePassword = document.getElementById("btn-generate-password");
    const btnPasteCipher = document.getElementById("btn-paste-cipher");
    
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

    // --- Vault DOM Elements ---
    const vaultLockedView = document.getElementById("vault-locked-view");
    const vaultUnlockedView = document.getElementById("vault-unlocked-view");
    const vaultDropzone = document.getElementById("vault-dropzone");
    const vaultFileInput = document.getElementById("vault-file-input");
    const vaultFileStatus = document.getElementById("vault-file-status");
    const vaultFileName = document.getElementById("vault-file-name");
    const btnRemoveVaultFile = document.getElementById("btn-remove-vault-file");
    const vaultMasterKeyInput = document.getElementById("vault-master-key");
    
    const btnUnlockVault = document.getElementById("btn-unlock-vault");
    const btnCreateVault = document.getElementById("btn-create-vault");
    const vaultSearch = document.getElementById("vault-search");
    const vaultAccountsContainer = document.getElementById("vault-accounts-container");
    const vaultEmptyState = document.getElementById("vault-empty-state");
    const vaultTimer = document.getElementById("vault-timer");

    const vaultAddAccount = document.getElementById("vault-add-account");
    const vaultAddPassword = document.getElementById("vault-add-password");
    const btnVaultGenerate = document.getElementById("btn-vault-generate");
    const btnVaultAdd = document.getElementById("btn-vault-add");
    const btnVaultDownload = document.getElementById("btn-vault-download");
    const btnVaultLock = document.getElementById("btn-vault-lock");

    // --- State Variables ---
    let clipboardClearTimeout = null;
    let loadedVaultString = "";
    let vaultMasterKey = "";
    let vaultMemoryMap = {}; // Purely in-memory RAM dictionary
    let isVaultUnlocked = false;
    let autoLockInterval = null;
    let autoLockSecondsLeft = 300; // 5 minutes count

    // --- Tab Switching Logic ---
    const switchTab = (activeTab, showPanel, inactiveTabs, hidePanels) => {
        activeTab.classList.add("active");
        activeTab.setAttribute("aria-selected", "true");
        inactiveTabs.forEach(t => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
        });
        showPanel.style.display = "block";
        hidePanels.forEach(p => {
            p.style.display = "none";
        });
        hideResultBox();
    };

    tabEncrypt.addEventListener("click", () => {
        switchTab(tabEncrypt, panelEncrypt, [tabDecrypt, tabVault], [panelDecrypt, panelVault]);
    });

    tabDecrypt.addEventListener("click", () => {
        switchTab(tabDecrypt, panelDecrypt, [tabEncrypt, tabVault], [panelEncrypt, panelVault]);
    });

    tabVault.addEventListener("click", () => {
        switchTab(tabVault, panelVault, [tabEncrypt, tabDecrypt], [panelEncrypt, panelDecrypt]);
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

    // --- Paste Cipher Event ---
    btnPasteCipher.addEventListener("click", async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                decryptInput.value = text.trim();
                showToast("Ciphertext pasted successfully!", false);
                
                // Trigger auto-resize
                decryptInput.style.height = "auto";
                decryptInput.style.height = `${decryptInput.scrollHeight}px`;
            } else {
                showToast("Clipboard is empty.", true);
            }
        } catch (err) {
            showToast("Clipboard read permission denied. Please paste manually.", true);
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

    // ==============================================================================
    // Vault Dashboard Controller
    // ==============================================================================

    // --- File Drag-and-Drop / Selector Hooks ---
    vaultDropzone.addEventListener("click", () => {
        vaultFileInput.click();
    });

    vaultFileInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
            readVaultFile(e.target.files[0]);
        }
    });

    vaultDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        vaultDropzone.classList.add("hover");
    });

    vaultDropzone.addEventListener("dragleave", () => {
        vaultDropzone.classList.remove("hover");
    });

    vaultDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        vaultDropzone.classList.remove("hover");
        if (e.dataTransfer.files.length > 0) {
            readVaultFile(e.dataTransfer.files[0]);
        }
    });

    const readVaultFile = (file) => {
        const reader = new FileReader();
        reader.onload = () => {
            loadedVaultString = reader.result.trim();
            vaultFileName.textContent = file.name;
            vaultDropzone.style.display = "none";
            vaultFileStatus.style.display = "flex";
            showToast("Vault file loaded successfully!", false);
        };
        reader.onerror = () => {
            showToast("Error reading vault file.", true);
        };
        reader.readAsText(file);
    };

    btnRemoveVaultFile.addEventListener("click", () => {
        loadedVaultString = "";
        vaultFileInput.value = "";
        vaultFileStatus.style.display = "none";
        vaultDropzone.style.display = "flex";
        showToast("Vault file removed.", false);
    });

    // --- Unlock & Create Empty Vault ---
    btnUnlockVault.addEventListener("click", async () => {
        if (!loadedVaultString) {
            showToast("Please drag & drop your vault.aegis file first.", true);
            return;
        }
        const masterKey = vaultMasterKeyInput.value;
        if (!masterKey) {
            showToast("Please enter your Master Passphrase.", true);
            return;
        }

        try {
            btnUnlockVault.disabled = true;
            btnUnlockVault.textContent = "Decrypting Vault...";

            const decryptedJson = await AegisCrypto.decrypt(loadedVaultString, masterKey);
            vaultMemoryMap = JSON.parse(decryptedJson);
            
            // Set session states
            vaultMasterKey = masterKey;
            isVaultUnlocked = true;
            vaultMasterKeyInput.value = ""; // Purge from raw input element immediately

            // Toggle locked views
            vaultLockedView.style.display = "none";
            vaultUnlockedView.style.display = "block";

            renderVaultGrid();
            startAutoLockTimer();
            showToast("Vault unlocked successfully!", false);
        } catch (err) {
            showToast("Invalid Master Passphrase or corrupted file.", true);
        } finally {
            btnUnlockVault.disabled = false;
            btnUnlockVault.innerHTML = `<svg width="18" height="18"><use href="#icon-unlock"/></svg> Unlock Vault`;
        }
    });

    btnCreateVault.addEventListener("click", () => {
        const masterKey = vaultMasterKeyInput.value;
        if (!masterKey) {
            showToast("Please enter a Master Passphrase in the box first.", true);
            return;
        }

        // Initialize brand new empty vault in RAM
        vaultMemoryMap = {};
        vaultMasterKey = masterKey;
        isVaultUnlocked = true;
        vaultMasterKeyInput.value = "";

        vaultLockedView.style.display = "none";
        vaultUnlockedView.style.display = "block";

        renderVaultGrid();
        startAutoLockTimer();
        showToast("New volatile vault created successfully!", false);
    });

    // --- Render Vault Grid ---
    const renderVaultGrid = () => {
        vaultAccountsContainer.innerHTML = "";
        const query = vaultSearch.value.trim().toLowerCase();
        
        // Filter account names
        const accounts = Object.keys(vaultMemoryMap).filter(acc => 
            acc.toLowerCase().includes(query)
        ).sort();

        if (accounts.length === 0) {
            vaultEmptyState.style.display = "flex";
            vaultAccountsContainer.style.display = "none";
            return;
        }

        vaultEmptyState.style.display = "none";
        vaultAccountsContainer.style.display = "flex";

        accounts.forEach(acc => {
            const card = document.createElement("div");
            card.className = "vault-account-card";

            // Details
            const info = document.createElement("div");
            info.className = "vault-card-info";
            
            const nameSpan = document.createElement("span");
            nameSpan.className = "vault-account-name";
            nameSpan.textContent = acc;

            const passSpan = document.createElement("span");
            passSpan.className = "vault-account-password";
            passSpan.textContent = "••••••••••••";

            info.appendChild(nameSpan);
            info.appendChild(passSpan);

            // Actions Container
            const actions = document.createElement("div");
            actions.className = "vault-card-actions";

            // Reveal button
            const btnReveal = document.createElement("button");
            btnReveal.className = "icon-btn";
            btnReveal.innerHTML = `<svg width="16" height="16"><use href="#icon-eye"/></svg>`;
            btnReveal.title = "Reveal Password";
            let isPasswordRevealed = false;

            btnReveal.addEventListener("click", async () => {
                try {
                    const useElement = btnReveal.querySelector("use");
                    if (!isPasswordRevealed) {
                        btnReveal.disabled = true;
                        // Decrypt on-demand from RAM
                        const plain = await AegisCrypto.decrypt(vaultMemoryMap[acc], vaultMasterKey);
                        passSpan.textContent = plain;
                        passSpan.classList.add("revealed");
                        useElement.setAttribute("href", "#icon-eye-off");
                        isPasswordRevealed = true;
                    } else {
                        passSpan.textContent = "••••••••••••";
                        passSpan.classList.remove("revealed");
                        useElement.setAttribute("href", "#icon-eye");
                        isPasswordRevealed = false;
                    }
                } catch (err) {
                    showToast("Decryption error on this card.", true);
                } finally {
                    btnReveal.disabled = false;
                }
            });

            // Copy button
            const btnCopy = document.createElement("button");
            btnCopy.className = "icon-btn";
            btnCopy.innerHTML = `<svg width="16" height="16"><use href="#icon-copy"/></svg>`;
            btnCopy.title = "Copy Password";

            btnCopy.addEventListener("click", async () => {
                try {
                    btnCopy.disabled = true;
                    const plain = await AegisCrypto.decrypt(vaultMemoryMap[acc], vaultMasterKey);
                    
                    navigator.clipboard.writeText(plain).then(() => {
                        showToast(`Copied ${acc} password!`, false);

                        if (clipboardClearTimeout) {
                            clearTimeout(clipboardClearTimeout);
                        }

                        clipboardClearTimeout = setTimeout(() => {
                            navigator.clipboard.readText().then(curr => {
                                if (curr === plain) {
                                    navigator.clipboard.writeText("").then(() => {
                                        showToast("Clipboard cleared.", false);
                                    });
                                }
                            }).catch(() => {
                                navigator.clipboard.writeText("");
                            });
                        }, 30000);
                    });
                } catch (err) {
                    showToast("Error decrypting password for copy.", true);
                } finally {
                    btnCopy.disabled = false;
                }
            });

            // Delete button
            const btnDelete = document.createElement("button");
            btnDelete.className = "icon-btn";
            btnDelete.innerHTML = `<svg width="16" height="16"><use href="#icon-trash"/></svg>`;
            btnDelete.title = "Delete Credential";
            btnDelete.style.color = "var(--color-error)";

            btnDelete.addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete ${acc} from this vault session? (Remember to export to save changes!)`)) {
                    delete vaultMemoryMap[acc];
                    renderVaultGrid();
                    showToast(`${acc} removed from session map.`, false);
                }
            });

            actions.appendChild(btnReveal);
            actions.appendChild(btnCopy);
            actions.appendChild(btnDelete);

            card.appendChild(info);
            card.appendChild(actions);

            vaultAccountsContainer.appendChild(card);
        });
    };

    // Live search filter
    vaultSearch.addEventListener("input", renderVaultGrid);

    // --- Generate & Add Credential ---
    btnVaultGenerate.addEventListener("click", () => {
        vaultAddPassword.value = generateSecurePassword();
        showToast("Secure password generated for vault form!", false);
    });

    btnVaultAdd.addEventListener("click", async () => {
        const account = vaultAddAccount.value.trim();
        const password = vaultAddPassword.value.trim();

        if (!account) {
            showToast("Please enter an Account/Service name.", true);
            return;
        }
        if (!password) {
            showToast("Please enter or generate a password.", true);
            return;
        }
        if (vaultMemoryMap[account]) {
            showToast(`Account "${account}" already exists in vault.`, true);
            return;
        }

        try {
            btnVaultAdd.disabled = true;
            btnVaultAdd.textContent = "Encrypting and Adding...";

            // Double envelope: Encrypt credential individually
            const cipher = await AegisCrypto.encrypt(password, vaultMasterKey);
            
            // Inject to RAM map
            vaultMemoryMap[account] = cipher;
            
            // Clear inputs
            vaultAddAccount.value = "";
            vaultAddPassword.value = "";

            renderVaultGrid();
            showToast(`"${account}" added to memory map!`, false);
        } catch (err) {
            showToast("Failed to encrypt and add credential.", true);
        } finally {
            btnVaultAdd.disabled = false;
            btnVaultAdd.textContent = "Add to Memory Map";
        }
    });

    // --- Export Vault & Lock Session ---
    btnVaultDownload.addEventListener("click", async () => {
        if (Object.keys(vaultMemoryMap).length === 0) {
            showToast("Vault is empty. Add credentials before exporting.", true);
            return;
        }

        try {
            btnVaultDownload.disabled = true;
            btnVaultDownload.textContent = "Exporting Vault...";

            const serialized = JSON.stringify(vaultMemoryMap);
            const masterCipher = await AegisCrypto.encrypt(serialized, vaultMasterKey);

            // Blob trigger download
            const blob = new Blob([masterCipher], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "vault.aegis";
            link.click();
            URL.revokeObjectURL(url);

            showToast("Encrypted vault.aegis downloaded successfully!", false);
        } catch (err) {
            showToast("Failed to export encrypted vault.", true);
        } finally {
            btnVaultDownload.disabled = false;
            btnVaultDownload.innerHTML = `<svg width="16" height="16"><use href="#icon-copy"/></svg> <span>Export vault.aegis</span>`;
        }
    });

    const lockVaultSession = () => {
        // Complete memory purge
        vaultMemoryMap = {};
        vaultMasterKey = "";
        loadedVaultString = "";
        isVaultUnlocked = false;

        // Clear timer interval
        if (autoLockInterval) {
            clearInterval(autoLockInterval);
            autoLockInterval = null;
        }

        // Reset inputs
        vaultMasterKeyInput.value = "";
        vaultFileInput.value = "";
        vaultSearch.value = "";
        vaultAddAccount.value = "";
        vaultAddPassword.value = "";

        // Reset views
        vaultFileStatus.style.display = "none";
        vaultDropzone.style.display = "flex";
        vaultLockedView.style.display = "block";
        vaultUnlockedView.style.display = "none";

        showToast("Vault locked & session purged from RAM.", false);
    };

    btnVaultLock.addEventListener("click", lockVaultSession);

    // --- Inactivity Auto-Lock Inactivity Timer ---
    const startAutoLockTimer = () => {
        if (autoLockInterval) {
            clearInterval(autoLockInterval);
        }

        autoLockSecondsLeft = 300; // Reset to 5 minutes
        
        autoLockInterval = setInterval(() => {
            if (!isVaultUnlocked) {
                clearInterval(autoLockInterval);
                return;
            }

            autoLockSecondsLeft--;
            const mins = Math.floor(autoLockSecondsLeft / 60);
            const secs = autoLockSecondsLeft % 60;
            vaultTimer.textContent = `Auto-locks in ${mins}:${secs.toString().padStart(2, "0")}`;

            if (autoLockSecondsLeft <= 0) {
                lockVaultSession();
                showToast("Vault automatically locked due to 5-minute inactivity.", true);
            }
        }, 1000);
    };

    // User activity monitor to reset timer
    const resetActivityTimer = () => {
        if (isVaultUnlocked) {
            autoLockSecondsLeft = 300;
        }
    };

    const activityEvents = ["mousemove", "mousedown", "keypress", "touchstart", "scroll"];
    activityEvents.forEach(evt => {
        window.addEventListener(evt, resetActivityTimer, { passive: true });
    });
});
