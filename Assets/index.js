// ========================================
//  SAFETY PASSPORT
// ========================================

const CONFIG = {
    // change these in one place — the table reads from here
    contacts: {
        health:   "9632134667",
        security: "8050021589",
        ehs:      "7558126991"
    },
    // base URL encoded into the QR code
    verifyUrl: "https://safety-passport.example.com/verify"
};

const inputs        = document.querySelectorAll(".field input");
const [nameInput, contractInput, passportInput, validInput] = inputs;

// ===============================
//  Contact numbers
// ===============================

const numberCells = document.querySelectorAll(".row-number");
const numbers = [CONFIG.contacts.health, CONFIG.contacts.security, CONFIG.contacts.ehs];

numberCells.forEach((cell, i) => {
    if (numbers[i]) cell.textContent = numbers[i];
});

// ===============================
//  Uppercase formatting
// ===============================

[nameInput, contractInput, passportInput].forEach(input => {
    input.addEventListener("input", () => {
        const pos = input.selectionStart;
        input.value = input.value.toUpperCase();
        input.setSelectionRange(pos, pos);
    });
});

// ===============================
//  Date formatting (DD/MM/YYYY)
// ===============================

validInput.addEventListener("input", (e) => {

    let value = e.target.value.replace(/\D/g, "").substring(0, 8);

    if (value.length > 4) {
        value = value.substring(0, 2) + "/" + value.substring(2, 4) + "/" + value.substring(4);
    } else if (value.length > 2) {
        value = value.substring(0, 2) + "/" + value.substring(2);
    }

    e.target.value = value;
});

// ===============================
//  Enter → next field
// ===============================

inputs.forEach((input, index) => {
    input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (index < inputs.length - 1) inputs[index + 1].focus();
        else input.blur();
    });
});

// ===============================
//  Empty value highlight
// ===============================

inputs.forEach(input => {
    input.addEventListener("blur", () => {
        const empty = input.value.trim() === "";
        input.classList.toggle("is-empty", empty);
        input.classList.toggle("is-filled", !empty);
    });

    input.addEventListener("focus", () => {
        input.classList.remove("is-empty");
    });
});

// ===============================
//  QR code
// ===============================

const qrBox = document.getElementById("qr");
let qrInstance = null;

function buildQrText() {
    const id = passportInput.value.trim();
    return id ? `${CONFIG.verifyUrl}?id=${encodeURIComponent(id)}` : CONFIG.verifyUrl;
}

function renderQr() {
    if (typeof QRCode === "undefined") {
        qrBox.textContent = "QR unavailable";
        qrBox.style.cssText += "background:#000;color:#fff;font-size:14px;font-weight:700;";
        return;
    }

    if (qrInstance) {
        qrInstance.clear();
        qrInstance.makeCode(buildQrText());
        return;
    }

    qrInstance = new QRCode(qrBox, {
        text: buildQrText(),
        width: 196,
        height: 196,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

renderQr();

// regenerate whenever the passport number changes
let qrTimer;
passportInput.addEventListener("input", () => {
    clearTimeout(qrTimer);
    qrTimer = setTimeout(renderQr, 300);
});

// ===============================
//  Scan button
// ===============================

document.querySelector(".scan").addEventListener("click", () => {
    window.open(buildQrText(), "_blank", "noopener");
});

// ===============================
//  Load data (API hook)
// ===============================

function loadPassport(data = {}) {
    nameInput.value     = (data.name     || "").toUpperCase();
    contractInput.value = (data.contract || "").toUpperCase();
    passportInput.value = (data.passport || "").toUpperCase();
    validInput.value    = data.valid || "";
    renderQr();
}

// Example:
// loadPassport({ name:"John Doe", contract:"ABC Engineering", passport:"P1234567", valid:"18/10/2028" });

console.log("Safety Passport ready");