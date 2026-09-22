
import os
import numpy as np
import joblib

from flask import Flask, render_template, request, jsonify
from PIL import Image
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input


# =========================================================
# 1. FLASK APP
# =========================================================

app = Flask(__name__)


# =========================================================
# 2. PATH MODEL
# =========================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "saved_models")


# =========================================================
# 3. LOAD MODEL
# =========================================================

knn = joblib.load(
    os.path.join(MODEL_DIR, "knn.pkl")
)

svm = joblib.load(
    os.path.join(MODEL_DIR, "svm.pkl")
)

scaler = joblib.load(
    os.path.join(MODEL_DIR, "scaler.pkl")
)

label_encoder = joblib.load(
    os.path.join(MODEL_DIR, "label_encoder.pkl")
)

lightgbm = joblib.load(
    os.path.join(MODEL_DIR, "lightgbm.pkl")
)


# =========================================================
# 4. LOAD RESNET50 FEATURE EXTRACTOR
# =========================================================

resnet = ResNet50(
    weights="imagenet",
    include_top=False,
    pooling="avg"
)

resnet.trainable = False


# =========================================================
# 5. IMAGE PREPROCESSING
# =========================================================

IMG_SIZE = (224, 224)


def preprocess_image(image):

    image = image.convert("RGB")

    image = image.resize(IMG_SIZE)

    image_array = np.array(
        image,
        dtype=np.float32
    )

    image_array = preprocess_input(image_array)

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    return image_array


# =========================================================
# 6. PREDICTION FUNCTION
# =========================================================

def predict_skin_lesion(image):

    # Preprocessing
    processed_image = preprocess_image(image)

    # ResNet50 feature extraction
    features = resnet.predict(
        processed_image,
        verbose=0
    )

    # Scaling
    features_scaled = scaler.transform(features)

    # Base classifier predictions
    knn_proba = knn.predict_proba(
        features_scaled
    )

    svm_proba = svm.predict_proba(
        features_scaled
    )

    # Meta features
    meta_features = np.hstack([
        features_scaled,
        knn_proba,
        svm_proba
    ])

    # LightGBM prediction
    final_proba = lightgbm.predict_proba(
        meta_features
    )[0]

    # Predicted class
    predicted_index = np.argmax(
        final_proba
    )

    predicted_class = label_encoder.inverse_transform(
        [predicted_index]
    )[0]

    # Confidence
    confidence = float(
        final_proba[predicted_index]
    )

    # Probability setiap kelas
    class_probabilities = {
        class_name: float(probability)
        for class_name, probability in zip(
            label_encoder.classes_,
            final_proba
        )
    }

    return (
        predicted_class,
        confidence,
        class_probabilities
    )


# =========================================================
# 7. HOME PAGE
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# 8. PREDICTION API
# =========================================================

@app.route(
    "/predict",
    methods=["POST"]
)
def predict():

    try:

        # Check uploaded image
        if "image" not in request.files:

            return jsonify({
                "error": "No image uploaded."
            }), 400


        file = request.files["image"]


        if file.filename == "":

            return jsonify({
                "error": "No image selected."
            }), 400


        # Open image directly in memory
        image = Image.open(
            file.stream
        )


        # Prediction
        predicted_class, confidence, probabilities = \
            predict_skin_lesion(image)


        # Return JSON
        return jsonify({

            "prediction": predicted_class,

            "confidence": confidence,

            "probabilities": probabilities

        })


    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# 9. LOCAL DEVELOPMENT
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
