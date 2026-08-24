// Simulates the "Farmer-Friendly Advisory Generation Model (LLM-Based)" from the
// use case: it converts the numeric AI model output into a short, plain-language,
// multilingual sentence a farmer can act on immediately. Swap generate() for a
// real LLM API call later without touching any calling code.

const TEMPLATES = {
  en: {
    irrigateToday: (d) =>
      `Irrigate today for ${d.irrigationDurationHours} hours. Soil moisture is at ${d.soilMoisturePct}%, below the safe level for this stage.`,
    irrigateFuture: (d) =>
      `Irrigate on ${d.nextIrrigationDate} for about ${d.irrigationDurationHours} hours. No action needed before then.`,
    rainDelay: (d) => `Rain is expected soon — irrigation has been shifted to ${d.nextIrrigationDate} to avoid waterlogging.`,
  },
  hi: {
    irrigateToday: (d) =>
      `आज ${d.irrigationDurationHours} घंटे सिंचाई करें। मिट्टी की नमी ${d.soilMoisturePct}% है, जो इस अवस्था के लिए कम है।`,
    irrigateFuture: (d) =>
      `${d.nextIrrigationDate} को लगभग ${d.irrigationDurationHours} घंटे सिंचाई करें। तब तक किसी कार्रवाई की आवश्यकता नहीं है।`,
    rainDelay: (d) => `जल्द ही बारिश की संभावना है — जलभराव से बचने के लिए सिंचाई ${d.nextIrrigationDate} तक टाल दी गई है।`,
  },
  kn: {
    irrigateToday: (d) =>
      `ಇಂದು ${d.irrigationDurationHours} ಗಂಟೆಗಳ ಕಾಲ ನೀರಾವರಿ ಮಾಡಿ. ಮಣ್ಣಿನ ತೇವಾಂಶ ${d.soilMoisturePct}% ಇದೆ, ಇದು ಈ ಹಂತಕ್ಕೆ ಕಡಿಮೆ.`,
    irrigateFuture: (d) =>
      `${d.nextIrrigationDate} ರಂದು ಸುಮಾರು ${d.irrigationDurationHours} ಗಂಟೆಗಳ ಕಾಲ ನೀರಾವರಿ ಮಾಡಿ. ಅಲ್ಲಿಯವರೆಗೆ ಯಾವುದೇ ಕ್ರಮ ಅಗತ್ಯವಿಲ್ಲ.`,
    rainDelay: (d) => `ಶೀಘ್ರದಲ್ಲೇ ಮಳೆ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ — ನೀರು ನಿಲ್ಲುವುದನ್ನು ತಪ್ಪಿಸಲು ನೀರಾವರಿಯನ್ನು ${d.nextIrrigationDate} ವರೆಗೆ ಮುಂದೂಡಲಾಗಿದೆ.`,
  },
  mr: {
    irrigateToday: (d) =>
      `आज ${d.irrigationDurationHours} तास सिंचन करा. मातीतील ओलावा ${d.soilMoisturePct}% आहे, जो या टप्प्यासाठी कमी आहे.`,
    irrigateFuture: (d) =>
      `${d.nextIrrigationDate} रोजी सुमारे ${d.irrigationDurationHours} तास सिंचन करा. तोपर्यंत काही करण्याची गरज नाही.`,
    rainDelay: (d) => `लवकरच पाऊस अपेक्षित आहे — पाणी साचू नये म्हणून सिंचन ${d.nextIrrigationDate} पर्यंत पुढे ढकलले आहे.`,
  },
};

function generate(advisory, lang = "en") {
  const t = TEMPLATES[lang] || TEMPLATES.en;
  if (advisory.rainfallNote) return t.rainDelay(advisory);
  if (advisory.nextIrrigationInDays <= 0) return t.irrigateToday(advisory);
  return t.irrigateFuture(advisory);
}

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "mr", label: "मराठी" },
];

module.exports = { generate, SUPPORTED_LANGUAGES };
