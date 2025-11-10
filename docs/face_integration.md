# Face recognition integration (overview)

This project uses client-side face descriptor extraction (face-api.js + TensorFlow.js) and server-side storage of descriptors for simple recognition by comparing Euclidean distance.

Quick steps to get started:

1. Install client deps in `client/`:

	npm install
	# or, if you only want face libs:
	npm install @tensorflow/tfjs face-api.js

2. Download face-api models and place them in `client/public/models`:
	- face_recognition_model-weights_manifest.json
	- face_landmark_68_model-weights_manifest.json
	- tiny_face_detector_model-weights_manifest.json

	(You can get these from the face-api.js model repo or use a CDN.)

3. Enrollment flow:
	- Use the `FaceEnroll` component (mounted in dashboard/profile) to capture 10-15 images.
	- The component computes descriptors and posts them to `/api/face/enroll`.

4. Recognition flow:
	- `FaceCapture` captures a single descriptor and calls `/api/face/recognize`.
	- Server compares descriptor to stored descriptors (Euclidean distance) and returns best match if below threshold (0.6).

5. Integration with attendance:
	- On Sign In, the app should run recognition to verify the logged-in employee's face matches the captured face, then call the normal attendance sign-in endpoint.

Notes and next steps:
 - This is a minimal, prototype implementation. For production you may want to:
	- Use secure, authenticated endpoints for enroll and restrict who can enroll.
	- Persist embeddings in a database instead of JSON files.
	- Consider server-side descriptor extraction using tfjs-node if you prefer not to run face-api in browser.
	- Tune thresholds and do additional liveness checks to prevent spoofing.

