const fs = require('fs');
const path = require('path');

const FACE_DATA_DIR = path.join(__dirname, '..', '..', 'face_data');

function ensureDataDir() {
  if (!fs.existsSync(FACE_DATA_DIR)) fs.mkdirSync(FACE_DATA_DIR, { recursive: true });
}

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

const faceController = {
  enroll: async (req, res) => {
    try {
      const { employee_id, name, descriptors } = req.body;
      if (!employee_id || !Array.isArray(descriptors) || !descriptors.length) {
        return res.status(400).json({ status: false, message: 'employee_id and descriptors are required' });
      }
      ensureDataDir();
      const filePath = path.join(FACE_DATA_DIR, `${employee_id}.json`);
      const payload = { employee_id, name: name || null, descriptors };
      // compute mean descriptor for stability
      if (Array.isArray(descriptors) && descriptors.length) {
        const len = descriptors[0].length;
        const mean = new Array(len).fill(0);
        for (const d of descriptors) {
          for (let i = 0; i < len; i++) {
            mean[i] += Number(d[i] || 0);
          }
        }
        for (let i = 0; i < len; i++) mean[i] = mean[i] / descriptors.length;
        payload.mean_descriptor = mean;
      }
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
      return res.status(201).json({ status: true, message: 'Enrolled face data saved', data: payload });
    } catch (err) {
      console.error('face enroll error', err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },

  recognize: async (req, res) => {
    try {
      const { descriptor } = req.body;
      if (!Array.isArray(descriptor) || !descriptor.length) {
        return res.status(400).json({ status: false, message: 'descriptor array is required' });
      }
      ensureDataDir();
      const files = fs.readdirSync(FACE_DATA_DIR).filter((f) => f.endsWith('.json'));
      if (!files.length) return res.status(200).json({ status: true, matched: false, message: 'No enrolled faces' });

      let best = { employee_id: null, name: null, distance: Infinity };
      for (const f of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(FACE_DATA_DIR, f), 'utf8'));
          // Prefer mean_descriptor if available
          if (Array.isArray(data.mean_descriptor) && data.mean_descriptor.length) {
            const dist = euclideanDistance(data.mean_descriptor, descriptor);
            if (dist < best.distance) {
              best = { employee_id: data.employee_id, name: data.name, distance: dist };
            }
          } else if (Array.isArray(data.descriptors) && data.descriptors.length) {
            // fallback: compute minimal distance between provided descriptor and stored descriptors
            for (const d of data.descriptors) {
              const dist = euclideanDistance(d, descriptor);
              if (dist < best.distance) {
                best = { employee_id: data.employee_id, name: data.name, distance: dist };
              }
            }
          }
        } catch (e) {
          // ignore malformed file
          console.warn('skipping face file', f, e.message);
        }
      }

      // threshold: 0.6 is a commonly used threshold for face-api descriptors (euclidean)
      const threshold = 0.6;
      if (best.distance <= threshold) {
        return res.status(200).json({ status: true, matched: true, employee_id: best.employee_id, name: best.name, distance: best.distance });
      }
      return res.status(200).json({ status: true, matched: false, distance: best.distance });
    } catch (err) {
      console.error('face recognize error', err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },

  list: async (req, res) => {
    try {
      ensureDataDir();
      const files = fs.readdirSync(FACE_DATA_DIR).filter((f) => f.endsWith('.json'));
      const out = [];
      for (const f of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(FACE_DATA_DIR, f), 'utf8'));
          out.push({ employee_id: data.employee_id, name: data.name });
        } catch (e) {
          // ignore
        }
      }
      return res.status(200).json({ status: true, data: out });
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message });
    }
  },
};

module.exports = faceController;
