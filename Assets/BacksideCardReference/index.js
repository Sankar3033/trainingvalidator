// ========================================
//  TRAININGS PROVIDED
// ========================================

const trainingBoxes  = document.querySelectorAll("[data-training]");
const violationBoxes = document.querySelectorAll("[data-violation]");

// ===============================
//  Read the sheet
// ===============================

function getTrainingData() {

    const trainings = {};
    trainingBoxes.forEach(box => {
        trainings[box.dataset.training] = box.checked;
    });

    return {
        trainings,
        completed:  Object.values(trainings).filter(Boolean).length,
        total:      trainingBoxes.length,
        violations: [...violationBoxes].filter(box => box.checked).length
    };
}

// ===============================
//  Write to the sheet
// ===============================

function loadTrainingData(data = {}) {

    const trainings = data.trainings || {};

    trainingBoxes.forEach(box => {
        box.checked = Boolean(trainings[box.dataset.training]);
    });

    const marked = Number(data.violations) || 0;
    violationBoxes.forEach((box, i) => {
        box.checked = i < marked;
    });
}

function clearSheet() {
    [...trainingBoxes, ...violationBoxes].forEach(box => {
        box.checked = false;
    });
}

// ===============================
//  Change events
// ===============================

[...trainingBoxes, ...violationBoxes].forEach(box => {
    box.addEventListener("change", () => {
        document.dispatchEvent(new CustomEvent("sheet:change", {
            detail: getTrainingData()
        }));
    });
});

// Hook for your backend — replace the body with a fetch() call.
document.addEventListener("sheet:change", (e) => {
    console.log("Sheet updated:", e.detail);
});

// ===============================
//  Violation boxes fill in order
//  Ticking the 3rd marks 1 and 2 as well; unticking the 1st
//  clears the ones after it. Keeps the count unambiguous.
// ===============================

violationBoxes.forEach((box, index) => {
    box.addEventListener("change", () => {
        violationBoxes.forEach((other, i) => {
            if (box.checked && i < index)  other.checked = true;
            if (!box.checked && i > index) other.checked = false;
        });
    });
});

// ===============================
//  Keyboard shortcuts
// ===============================

document.addEventListener("keydown", (e) => {

    if (e.target.matches("input")) return;

    // Alt+P — print
    if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.print();
    }

    // Alt+C — clear
    if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        clearSheet();
    }
});

// ===============================
//  Example
// ===============================

/*
loadTrainingData({
    trainings: {
        "electrical-works": true,
        "height-work": true,
        "fire-fighting": true,
        "first-aid": true
    },
    violations: 1
});
*/

console.log("Trainings sheet ready —", trainingBoxes.length, "trainings,", violationBoxes.length, "violation slots");