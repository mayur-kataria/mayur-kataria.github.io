/**
 * AegisCipher Cryptographic Core (Web Crypto API)
 * Zero dependencies, pure local client-side cryptographic functions.
 */

class AegisCrypto {
    /**
     * Convert Uint8Array to Base64
     */
    static arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Convert Base64 to Uint8Array
     */
    static base64ToUint8Array(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Convert Uint8Array to Hex String
     */
    static arrayBufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Convert Hex String to Uint8Array
     */
    static hexToUint8Array(hex) {
        if (hex.length % 2 !== 0) {
            throw new Error("Invalid hex string length");
        }
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return bytes;
    }

    /**
     * Generate secure random bytes (e.g. for salt or IV)
     */
    static generateRandomBytes(length) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Derive a cryptographic key from a passphrase using PBKDF2
     * @returns {Promise<CryptoKey>}
     */
    static async deriveKey(passphrase, salt, iterations, hashAlgo, targetAlgo = "AES-GCM") {
        const encoder = new TextEncoder();
        const rawPassphrase = encoder.encode(passphrase);

        // Import the passphrase as a raw key
        const baseKey = await window.crypto.subtle.importKey(
            "raw",
            rawPassphrase,
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        // Derive the actual AES-256 key
        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: iterations,
                hash: hashAlgo // "SHA-256" or "SHA-512"
            },
            baseKey,
            { name: targetAlgo, length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypt a plaintext password
     * @param {string} plaintext 
     * @param {string} passphrase 
     * @param {Object} options 
     * @returns {Promise<string>} Format: "[format_version]:[algo]:[hash]:[iterations]:[Base64 salt]:[Base64 IV]:[Base64 ciphertext]"
     */
    static async encrypt(plaintext, passphrase, options = {}) {
        const algo = options.algo || "AES-GCM"; // AES-GCM or AES-CBC
        const hashAlgo = options.hashAlgo || "SHA-256";
        const iterations = options.iterations || 100000;
        const customSaltStr = options.customSalt || "";
        const outputFormat = options.outputFormat || "base64"; // base64 or hex

        // 1. Get Salt (generate or use custom)
        let salt;
        if (customSaltStr) {
            salt = new TextEncoder().encode(customSaltStr);
        } else {
            salt = this.generateRandomBytes(16); // 128-bit random salt
        }

        // 2. Derive 256-bit Key
        const derivedKey = await this.deriveKey(passphrase, salt, iterations, hashAlgo, algo);

        // 3. Generate IV
        const ivSize = algo === "AES-GCM" ? 12 : 16;
        const iv = this.generateRandomBytes(ivSize);

        // 4. Encrypt
        const plaintextBytes = new TextEncoder().encode(plaintext);
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: algo,
                iv: iv,
                // GCM defaults to 128-bit auth tag, appended at the end of buffer
            },
            derivedKey,
            plaintextBytes
        );

        // 5. Package output
        const saltEncoded = this.arrayBufferToBase64(salt);
        const ivEncoded = this.arrayBufferToBase64(iv);
        let ciphertextEncoded;
        
        if (outputFormat === "hex") {
            ciphertextEncoded = this.arrayBufferToHex(encryptedBuffer);
        } else {
            ciphertextEncoded = this.arrayBufferToBase64(encryptedBuffer);
        }

        // Return unified payload
        // Format: AEGIS1:ALGO:HASH:ITERATIONS:SALT_B64:IV_B64:CIPHERTEXT
        return `AEGIS1:${algo}:${hashAlgo}:${iterations}:${saltEncoded}:${ivEncoded}:${ciphertextEncoded}`;
    }

    /**
     * Decrypt an AegisCipher payload
     * @param {string} payload 
     * @param {string} passphrase 
     */
    static async decrypt(payload, passphrase) {
        try {
            // Split package
            const parts = payload.trim().split(":");
            if (parts.length !== 7 || parts[0] !== "AEGIS1") {
                throw new Error("Invalid or corrupted cipher format. Ensure payload starts with 'AEGIS1:'");
            }

            const [_, algo, hashAlgo, iterationsStr, saltB64, ivB64, ciphertextPayload] = parts;
            const iterations = parseInt(iterationsStr, 10);

            if (algo !== "AES-GCM" && algo !== "AES-CBC") {
                throw new Error(`Unsupported encryption algorithm: ${algo}`);
            }

            // Decode components
            const salt = this.base64ToUint8Array(saltB64);
            const iv = this.base64ToUint8Array(ivB64);
            
            // Ciphertext could be Hex or Base64. Let's auto-detect.
            // If it contains non-hex characters or has a standard base64 structure, treat as base64.
            let ciphertext;
            if (/^[0-9a-fA-F]+$/.test(ciphertextPayload)) {
                ciphertext = this.hexToUint8Array(ciphertextPayload);
            } else {
                ciphertext = this.base64ToUint8Array(ciphertextPayload);
            }

            // Derive key
            const derivedKey = await this.deriveKey(passphrase, salt, iterations, hashAlgo, algo);

            // Decrypt
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: algo,
                    iv: iv
                },
                derivedKey,
                ciphertext
            );

            return new TextDecoder().decode(decryptedBuffer);
        } catch (err) {
            console.error("Cryptographic Decryption Error:", err);
            throw new Error("Decryption failed. Check your secret key/passphrase or ciphertext payload.");
        }
    }
}
