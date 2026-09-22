
const dropzone = document.getElementById("dropzone");
const imageInput = document.getElementById("imageInput");
const browseButton = document.getElementById("browseButton");

const previewContainer = document.getElementById("previewContainer");
const previewImage = document.getElementById("previewImage");
const fileName = document.getElementById("fileName");

const removeButton = document.getElementById("removeButton");
const analyzeButton = document.getElementById("analyzeButton");

const resultCard = document.getElementById("resultCard");

let selectedFile = null;


/* =========================================================
   OPEN FILE SELECTOR
   ========================================================= */

browseButton.addEventListener("click", function(event) {
    event.stopPropagation();
    imageInput.click();
});


dropzone.addEventListener("click", function(event) {
    if (event.target === browseButton) {
        return;
    }

    imageInput.click();
});


/* =========================================================
   FILE SELECTED
   ========================================================= */

imageInput.addEventListener("change", function() {

    if (this.files.length > 0) {
        handleFile(this.files[0]);
    }

});


/* =========================================================
   DRAG & DROP
   ========================================================= */

dropzone.addEventListener("dragover", function(event) {

    event.preventDefault();

    dropzone.classList.add("dragover");

});


dropzone.addEventListener("dragleave", function() {

    dropzone.classList.remove("dragover");

});


dropzone.addEventListener("drop", function(event) {

    event.preventDefault();

    dropzone.classList.remove("dragover");

    const files = event.dataTransfer.files;

    if (files.length > 0) {
        handleFile(files[0]);
    }

});


/* =========================================================
   HANDLE FILE
   ========================================================= */

function handleFile(file) {

    // Check file type
    if (!file.type.match("image/jpeg") &&
        !file.type.match("image/png")) {

        alert("Please upload a JPG, JPEG, or PNG image.");

        return;
    }


    selectedFile = file;


    // Display filename
    fileName.textContent = file.name;


    // Create preview
    const reader = new FileReader();


    reader.onload = function(event) {

        previewImage.src = event.target.result;

        // Hide upload area
        dropzone.classList.add("hidden");

        // Show preview
        previewContainer.classList.remove("hidden");

        // Hide old result
        resultCard.classList.add("hidden");

    };


    reader.readAsDataURL(file);
}


/* =========================================================
   REMOVE IMAGE
   ========================================================= */

removeButton.addEventListener("click", function() {

    selectedFile = null;

    imageInput.value = "";

    previewImage.src = "";

    previewContainer.classList.add("hidden");

    resultCard.classList.add("hidden");

    dropzone.classList.remove("hidden");

});


/* =========================================================
   ANALYZE IMAGE
   ========================================================= */

analyzeButton.addEventListener("click", async function() {

    if (!selectedFile) {

        alert("Please select an image first.");

        return;
    }


    // Loading state
    analyzeButton.classList.add("loading");

    analyzeButton.disabled = true;

    analyzeButton.querySelector("span:first-child").textContent =
        "Analyzing...";


    /*
     * Backend connection will be added
     * in the next step.
     *
     * The selected image will be sent
     * to Flask using FormData.
     */

    const formData = new FormData();

    formData.append("image", selectedFile);


    try {

        const response = await fetch("/predict", {
            method: "POST",
            body: formData
        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Prediction failed."
            );

        }


        // Display prediction
        displayResult(data);


    } catch (error) {

        console.error(error);

        alert(
            "Unable to analyze the image. " +
            "Please try again."
        );

    }


    // Reset button
    analyzeButton.classList.remove("loading");

    analyzeButton.disabled = false;

    analyzeButton.querySelector("span:first-child").textContent =
        "Analyze Image";

});


/* =========================================================
   DISPLAY RESULT
   ========================================================= */

function displayResult(data) {

    resultCard.classList.remove("hidden");


    // Prediction
    document.getElementById("predictionResult").textContent =
        data.prediction;


    // Confidence
    document.getElementById("confidenceValue").textContent =
        data.confidence.toFixed(2) + "%";


    // Probabilities
    updateProbability(
        "ak",
        data.probabilities["Actinic Keratosis"]
    );

    updateProbability(
        "bcc",
        data.probabilities["Basal Cell Carcinoma"]
    );

    updateProbability(
        "melanoma",
        data.probabilities["Melanoma"]
    );

    updateProbability(
        "scc",
        data.probabilities["Squamous Cell Carcinoma"]
    );


    // Scroll smoothly to result
    resultCard.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

}


/* =========================================================
   UPDATE PROBABILITY
   ========================================================= */

function updateProbability(id, value) {

    const percentage = Number(value);

    document.getElementById(
        "prob-" + id
    ).textContent =
        percentage.toFixed(2) + "%";


    document.getElementById(
        "bar-" + id
    ).style.width =
        percentage + "%";

}
