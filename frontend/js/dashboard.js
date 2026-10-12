Auth.requireLogin();

const state = {
  user: null,
  plots: [],
  currentPlotId: null,
  lang: localStorage.getItem("khet_lang") || "en",
  charts: {},
  leafletMap: null,
};

const CHART_COLORS = {
  green: "#1f4d3d",
  gold: "#c98a2c",
  blue: "#2f6f8f",
  grid: "rgba(22,33,28,0.08)",
};

const UI_TRANSLATIONS = {
  en: {
    "nav.overview": "Overview", "nav.plots": "My Plots", "nav.advisory": "Irrigation Advisory",
    "nav.weather": "Weather Forecast", "nav.sensors": "Soil & Sensors", "nav.fertigation": "Fertigation",
    "nav.yield": "Yield Prediction", "nav.alerts": "Alerts", "nav.settings": "Profile & Settings", "nav.logout": "Log out",
    "actions.addPlot": "+ Add plot", "status.today": "Today", "status.noAlerts": "All clear",
    "overview.recommendation": "Today's recommendation", "overview.soilMoisture": "Soil moisture — last 14 days", "overview.sensorPerDay": "30cm depth sensor, per day", "overview.yourPlots": "Your plots", "overview.quickStatus": "Quick status across everything you manage",
    "advisory.recommendation": "AI Irrigation Recommendation", "advisory.modelBreakdown": "Model breakdown", "advisory.calculated": "How this recommendation was calculated", "advisory.logEvent": "Log an irrigation event", "advisory.confirmPump": "Confirm a pump run so future advisories account for it", "advisory.whyThisRecommendation": "WHY THIS RECOMMENDATION?", "advisory.whyThisRecommendationSub": "Derived directly from FAO-56 crop physics and localized telemetry", "advisory.loadingExplanation": "Loading explanation reasoning…", "advisory.recentHistory": "Recent irrigation history", "advisory.logIrrigation": "Log irrigation", "advisory.trustSensorData": "Sensor data", "advisory.trustSimulatedDemo": "Simulated demo data", "advisory.trustPhysicalSensor": "Physical sensor", "advisory.trustWeather": "Weather", "advisory.trustDecisionEngine": "Decision engine", "advisory.engineAgronomic": "Agronomic calculation",
    "labels.nextIrrigation": "Next irrigation", "labels.duration": "Duration", "labels.waterStress": "Water stress", "labels.predictedYield": "Predicted yield", "labels.cropStage": "Crop stage", "labels.waterRequirement": "Water requirement", "labels.volumeNeeded": "Volume needed", "labels.yieldLossRisk": "Yield-loss risk", "labels.durationHours": "Duration (hours)", "labels.waterApplied": "Water applied (m³)", "common.date": "Date", "common.waterM3": "Water (m³)",
    "settings.profile": "Profile", "settings.profileTitle": "Profile details", "settings.profileSubtitle": "Your registered account details", "settings.statusActive": "Active", "settings.nameLabel": "Name", "settings.mobileLabel": "Mobile", "settings.accountSecurity": "Account & security", "settings.advisoryPreferences": "Advisory preferences", "settings.language": "Advisory language", "settings.units": "Measurement units", "settings.plainLanguage": "Plain-language recommendations", "settings.plainLanguageHint": "Keep advice short and farmer-friendly", "settings.notifications": "Notifications", "settings.notificationsHint": "Stay ahead of irrigation and weather changes", "settings.irrigationReminders": "Irrigation reminders", "settings.irrigationRemindersHint": "Get notified before the next recommended event", "settings.rainfallAlerts": "Rainfall alerts", "settings.rainfallAlertsHint": "Know when rain may change your schedule", "settings.sensorHealthAlerts": "Sensor health alerts", "settings.sensorHealthAlertsHint": "Be alerted when readings look unusual", "settings.changePassword": "Change password", "settings.changePasswordHint": "Update your login password", "settings.signOutEverywhere": "Sign out everywhere", "settings.signOutEverywhereHint": "Clear this account from all saved sessions", "settings.deleteAccount": "Delete account", "settings.deleteAccountHint": "Permanently remove your profile and plots", "settings.editProfile": "Edit profile", "settings.downloadData": "Download my data", "settings.memberSince": "Member since", "settings.village": "Village", "settings.taluk": "Taluk", "settings.district": "District", "settings.mobile": "Mobile", "settings.metric": "Metric — acres, m³, mm", "settings.imperial": "Imperial — acres, gallons, inches",
    "settings.table.village": "Village", "settings.table.taluk": "Taluk", "settings.table.district": "District", "settings.table.memberSince": "Member since", "settings.buttons.editProfile": "Edit profile", "settings.buttons.downloadData": "Download my data", "settings.prefs.title": "Advisory preferences", "settings.prefs.subtitle": "Choose how KhetAI presents recommendations", "settings.notifications.title": "Notifications", "settings.notifications.subtitle": "Stay ahead of irrigation and weather changes", "settings.security.title": "Account & security", "settings.security.subtitle": "Manage access to your farmer account", "settings.actions.changePassword": "Change password", "settings.actions.signOutEverywhere": "Sign out everywhere", "settings.actions.deleteAccount": "Delete account", "settings.actions.changePasswordHint": "Update your login password", "settings.actions.signOutEverywhereHint": "Clear this account from all saved sessions", "settings.actions.deleteAccountHint": "Permanently remove your profile and plots",
    "common.noPlotsYet": "No plots yet", "common.viewAdvisory": "View advisory", "common.remove": "Remove", "common.welcomeAddPlot": "Welcome! Add your first plot to see live AI advisories.", "common.noAlerts": "No alerts across your plots right now.", "common.allClear": "All clear", "common.plotRemoved": "Plot removed.", "common.irrigationLogged": "Irrigation logged.", "common.contactAdmin": "Please contact an administrator to delete your account.", "common.mlUnavailable": "ML: Unavailable", "common.unavailable": "Unavailable", "common.plotName": "Plot name", "common.areaAcres": "Area (acres)", "common.soilType": "Soil type", "common.variety": "Variety", "common.plantingDate": "Planting date", "common.lat": "Latitude", "common.lng": "Longitude", "common.loading": "Loading…", "common.today": "Today", "common.tomorrow": "Tomorrow", "common.todayImmediately": "Today / Immediately", "common.loadingAdvisory": "Loading advisory…", "common.locationOptional": "Location (optional)", "common.locationHint": "Leave blank to auto-place near Sameerwadi, Northern Karnataka.", "common.savePlot": "Save plot", "common.addPlotModalTitle": "Add a new plot", "common.noPlotsSelect": "No plots yet", "common.info": "Information",
    "alerts.markRead": "Mark read", "alerts.title": "Alerts & Notifications", "alerts.subtitle": "Generated live from current sensor and weather conditions",
    "plots.emptyMessage": "Add your first sugarcane plot to start receiving AI advisories.", "plot.deleteConfirmPrefix": "Remove", "plot.deleteConfirmSuffix": "This deletes its sensor and irrigation history.", "plot.addedSuccess": "added — generating its first advisory.", "plot.card.areaAcres": "acres", "plot.card.planted": "Planted",
    "sensors.moisture30": "Soil moisture (30cm)", "sensors.moisture60": "Soil moisture (60cm)", "sensors.temperature": "Soil temperature", "sensors.ndvi": "NDVI (crop health)", "sensors.trendTitle": "Soil & environmental trend — last 14 days",
    "fertigation.planTitle": "Fertigation Plan", "fertigation.totalFor": "total for", "fertigation.urea": "Urea", "fertigation.dap": "DAP", "fertigation.mop": "MOP (Potash)", "fertigation.perAcreTitle": "Per-acre guideline", "fertigation.perAcreSubtitle": "Standard dose before scaling to your plot area", "fertigation.nutrient": "Nutrient", "fertigation.kgPerAcre": "kg / acre", "fertigation.applyWithIrrigation": "Apply with irrigation scheduled for",
    "weather.liveData": "Live data from Open-Meteo", "weather.simulatedForecast": "Simulated forecast (offline fallback)", "weather.rain": "rain", "weather.fiveDayForecast": "5-day forecast", "weather.plotLocation": "Plot location", "weather.plotLocationSubtitle": "Used to fetch localized weather data",
    "yield.lowEstimate": "Low estimate", "yield.predicted": "Predicted", "yield.highEstimate": "High estimate", "yield.predictedYieldTitle": "Predicted yield", "yield.tonnesPerHectare": "tonnes / hectare", "yield.rangeLabel": "Range:", "yield.tHa": "t/ha", "yield.drivingPredictionTitle": "What's driving this prediction", "yield.drivingPredictionSubtitle": "Average water-stress exposure over the last 14 days", "yield.stressExplanation": "Lower stress exposure → closer to the top of the predicted range.",
    "scenario.demoControlTitle": "SIMULATED SCENARIO DEMO CONTROL", "scenario.demoControlSubtitle": "Simulate field conditions and execute real backend decision logic", "scenario.demoControlBadge": "DEMO CONTROL",
    "ml.title": "Experimental ML Analysis", "ml.subtitle": "Secondary analytical model for research comparison — does not override Agronomic Baseline", "ml.badge": "EXPERIMENTAL MODEL", "ml.trainingDataLabel": "ML Training Data:", "ml.trainingDataValue": "External research dataset (Sugarcane Irrigation Dataset for SIDSS Framework, Zenodo DOI: 10.5281/zenodo.19725692)", "ml.currentSensorLabel": "Current Sensor:", "ml.currentWeatherLabel": "Current Weather:", "ml.primaryEngineLabel": "Primary Irrigation Engine:", "ml.primaryEngineValue": "FAO-56 agronomic baseline", "ml.disclaimerTitle": "Scientific Disclaimer:", "ml.disclaimerBody": "This experimental model was trained on an external model-simulated sugarcane research dataset. Its test metrics describe performance on that dataset and do not establish real-world field accuracy.",
    "technical.detailsToggle": "View Technical Details & Provenance", "technical.engineModelType": "Engine Model Type", "technical.featureVersion": "Feature Version", "technical.weatherProvenance": "Weather Provenance", "technical.sensorProvenance": "Sensor Provenance", "technical.dataQualityStatus": "Data Quality Status", "technical.calculationTimestamp": "Calculation Timestamp", "technical.mlLayerStatus": "ML Layer Status", "technical.mlModelVersion": "ML Model Version", "technical.mlTrainingRequirement": "ML Training Requirement",
  },
  hi: {
    "nav.overview": "अवलोकन", "nav.plots": "मेरे खेत", "nav.advisory": "सिंचाई सलाह",
    "nav.weather": "मौसम पूर्वानुमान", "nav.sensors": "मिट्टी और सेंसर", "nav.fertigation": "उर्वरक सिंचाई",
    "nav.yield": "उपज अनुमान", "nav.alerts": "सूचनाएं", "nav.settings": "प्रोफ़ाइल और सेटिंग्स", "nav.logout": "लॉग आउट",
    "actions.addPlot": "+ खेत जोड़ें", "status.today": "आज", "status.noAlerts": "सब ठीक है",
    "overview.recommendation": "आज की सलाह", "overview.soilMoisture": "मिट्टी की नमी — पिछले 14 दिन", "overview.sensorPerDay": "30 सेमी सेंसर, प्रतिदिन", "overview.yourPlots": "आपके खेत", "overview.quickStatus": "आपके सभी खेतों की स्थिति",
    "advisory.recommendation": "एआई सिंचाई सलाह", "advisory.modelBreakdown": "मॉडल विवरण", "advisory.calculated": "यह सलाह कैसे तैयार की गई", "advisory.logEvent": "सिंचाई दर्ज करें", "advisory.confirmPump": "भविष्य की सलाह के लिए पंप चलने की पुष्टि करें", "advisory.whyThisRecommendation": "यह सलाह क्यों?", "advisory.whyThisRecommendationSub": "FAO-56 फसल भौतिकी और स्थानीय टेलीमेट्री के आधार पर तैयार किया गया", "advisory.loadingExplanation": "स्पष्टीकरण लोड हो रहा है…", "advisory.recentHistory": "हाल की सिंचाई इतिहास", "advisory.logIrrigation": "सिंचाई दर्ज करें", "advisory.trustSensorData": "सेंसर डेटा", "advisory.trustSimulatedDemo": "सिम्युलेटेड डेमो डेटा", "advisory.trustPhysicalSensor": "भौतिक सेंसर", "advisory.trustWeather": "मौसम", "advisory.trustDecisionEngine": "निर्णय इंजन", "advisory.engineAgronomic": "कृषि गणना",
    "labels.nextIrrigation": "अगली सिंचाई", "labels.duration": "अवधि", "labels.waterStress": "जल तनाव", "labels.predictedYield": "अनुमानित उपज", "labels.cropStage": "फसल अवस्था", "labels.waterRequirement": "पानी की आवश्यकता", "labels.volumeNeeded": "आवश्यक मात्रा", "labels.yieldLossRisk": "उपज हानि का जोखिम", "labels.durationHours": "अवधि (घंटे)", "labels.waterApplied": "प्रयुक्त पानी (m³)", "common.date": "तारीख", "common.waterM3": "पानी (m³)",
    "settings.profile": "प्रोफ़ाइल", "settings.profileTitle": "प्रोफ़ाइल विवरण", "settings.profileSubtitle": "आपका पंजीकृत खाता विवरण", "settings.statusActive": "सक्रिय", "settings.nameLabel": "नाम", "settings.mobileLabel": "मोबाइल", "settings.accountSecurity": "खाता और सुरक्षा", "settings.advisoryPreferences": "सिंचाई प्राथमिकताएँ", "settings.language": "सिंचाई भाषा", "settings.units": "माप की इकाइयाँ", "settings.plainLanguage": "सरल भाषा की सिफारिशें", "settings.plainLanguageHint": "सलाह को छोटा और किसान-अनुकूल रखें", "settings.notifications": "सूचनाएँ", "settings.notificationsHint": "सिंचाई और मौसम में बदलाव से पहले जानें", "settings.irrigationReminders": "सिंचाई अनुस्मारक", "settings.irrigationRemindersHint": "अगली अनुशंसित घटना से पहले नोटिफिकेशन प्राप्त करें", "settings.rainfallAlerts": "बारिश की चेतावनी", "settings.rainfallAlertsHint": "जानें कब बारिश आपके समय को बदल सकती है", "settings.sensorHealthAlerts": "सेंसर स्वास्थ्य अलर्ट", "settings.sensorHealthAlertsHint": "जब रीडिंग असामान्य हो तो चेतावनी प्राप्त करें", "settings.changePassword": "पासवर्ड बदलें", "settings.changePasswordHint": "अपने लॉगिन पासवर्ड को अपडेट करें", "settings.signOutEverywhere": "हर जगह से साइन आउट करें", "settings.signOutEverywhereHint": "इस खाते को सभी सेव्ड सत्रों से साफ़ करें", "settings.deleteAccount": "खाता हटाएँ", "settings.deleteAccountHint": "अपना प्रोफ़ाइल और खेत स्थायी रूप से हटाएँ", "settings.editProfile": "प्रोफ़ाइल संपादित करें", "settings.downloadData": "अपना डेटा डाउनलोड करें", "settings.memberSince": "सदस्य sejak", "settings.village": "गाँव", "settings.taluk": "तहसील", "settings.district": "जिला", "settings.mobile": "मोबाइल", "settings.metric": "मैट्रिक — एकड़, m³, mm", "settings.imperial": "इंपीरियल — एकड़, गैलन, इंच",
    "settings.table.village": "गाँव", "settings.table.taluk": "तहसील", "settings.table.district": "जिला", "settings.table.memberSince": "सदस्य sejak", "settings.buttons.editProfile": "प्रोफ़ाइल संपादित करें", "settings.buttons.downloadData": "अपना डेटा डाउनलोड करें", "settings.prefs.title": "सिंचाई प्राथमिकताएँ", "settings.prefs.subtitle": "कृपया चुनें कि KhetAI सुझाव कैसे प्रस्तुत करता है", "settings.notifications.title": "सूचनाएँ", "settings.notifications.subtitle": "सिंचाई और मौसम परिवर्तनों से पहले बने रहें", "settings.security.title": "खाता और सुरक्षा", "settings.security.subtitle": "अपने किसान खाते की पहुंच प्रबंधित करें", "settings.actions.changePassword": "पासवर्ड बदलें", "settings.actions.signOutEverywhere": "हर जगह से साइन आउट करें", "settings.actions.deleteAccount": "खाता हटाएँ", "settings.actions.changePasswordHint": "अपने लॉगिन पासवर्ड को अपडेट करें", "settings.actions.signOutEverywhereHint": "इस खाते को सभी सेव्ड सत्रों से साफ़ करें", "settings.actions.deleteAccountHint": "अपना प्रोफ़ाइल और खेत स्थायी रूप से हटाएँ",
    "common.noPlotsYet": "अभी कोई खेत नहीं", "common.viewAdvisory": "सलाह देखें", "common.remove": "हटाएं", "common.welcomeAddPlot": "स्वागत है! लाइव एआई सलाह देखने के लिए अपना पहला खेत जोड़ें।", "common.noAlerts": "आपके खेतों में अभी कोई अलर्ट नहीं है।", "common.allClear": "सब ठीक है", "common.plotRemoved": "खेती हटाई गई।", "common.irrigationLogged": "सिंचाई दर्ज की गई।", "common.contactAdmin": "कृपया खाते को हटाने के लिए प्रशासक से संपर्क करें।", "common.mlUnavailable": "एमएल: उपलब्ध नहीं है", "common.unavailable": "उपलब्ध नहीं", "common.plotName": "खेती का नाम", "common.areaAcres": "क्षेत्रफल (एकड़)", "common.soilType": "मिट्टी का प्रकार", "common.variety": "प्रजाति", "common.plantingDate": "रोपण तिथि", "common.lat": "अक्षांश", "common.lng": "देशांतर", "common.loading": "लोड हो रहा है…", "common.today": "आज", "common.tomorrow": "कल", "common.todayImmediately": "आज / तुरंत", "common.loadingAdvisory": "सलाह लोड हो रही है…", "common.locationOptional": "स्थान (वैकल्पिक)", "common.locationHint": "स्वचालित रूप से Sameerwadi, उत्तरी कर्नाटक के पास रखने के लिए खाली छोड़ें।", "common.savePlot": "खेती सेव करें", "common.addPlotModalTitle": "नया खेत जोड़ें", "common.noPlotsSelect": "अभी कोई खेत नहीं", "common.info": "जानकारी",
    "alerts.markRead": "पढ़ा हुआ चिह्नित करें", "alerts.title": "अलर्ट और नोटिफिकेशन", "alerts.subtitle": "वर्तमान सेंसर और मौसम की स्थिति से लाइव उत्पन्न",
    "plots.emptyMessage": "एआई सलाह शुरू करने के लिए अपना पहला गन्ने का खेत जोड़ें।", "plot.deleteConfirmPrefix": "हटाएँ", "plot.deleteConfirmSuffix": "यह उसके सेंसर और सिंचाई इतिहास को भी हटा देता है।", "plot.addedSuccess": "जोड़ा गया — पहली सलाह तैयार की जा रही है।", "plot.card.areaAcres": "एकड़", "plot.card.planted": "लगाया गया",
    "sensors.moisture30": "मिट्टी की नमी (30 सेमी)", "sensors.moisture60": "मिट्टी की नमी (60 सेमी)", "sensors.temperature": "मिट्टी का तापमान", "sensors.ndvi": "NDVI (फसल स्वास्थ्य)", "sensors.trendTitle": "मिट्टी और पर्यावरणीय प्रवृत्ति — पिछले 14 दिन",
    "fertigation.planTitle": "उर्वरक सिंचाई योजना", "fertigation.totalFor": "कुल", "fertigation.urea": "यूरिया", "fertigation.dap": "डीएपी", "fertigation.mop": "एमओपी (पोटाश)", "fertigation.perAcreTitle": "प्रति एकड़ दिशा-निर्देश", "fertigation.perAcreSubtitle": "अपने खेत के क्षेत्रफल के अनुसार स्केलिंग से पहले मानक मात्रा", "fertigation.nutrient": "पोषक तत्व", "fertigation.kgPerAcre": "kg / एकड़", "fertigation.applyWithIrrigation": "सिंचाई के साथ लागू करें",
    "weather.liveData": "Open-Meteo से लाइव डेटा", "weather.simulatedForecast": "सिम्युलेटेड पूर्वानुमान (ऑफलाइन फॉलबैक)", "weather.rain": "बारिश", "weather.fiveDayForecast": "5-दिवसीय पूर्वानुमान", "weather.plotLocation": "खेत का स्थान", "weather.plotLocationSubtitle": "स्थानीय मौसम डेटा प्राप्त करने के लिए उपयोग किया जाता है",
    "yield.lowEstimate": "कम अनुमान", "yield.predicted": "अनुमानित", "yield.highEstimate": "उच्च अनुमान", "yield.predictedYieldTitle": "अनुमानित उपज", "yield.tonnesPerHectare": "टन / हेक्टेयर", "yield.rangeLabel": "सीमा:", "yield.tHa": "t/ha", "yield.drivingPredictionTitle": "इस पूर्वानुमान का कारण", "yield.drivingPredictionSubtitle": "पिछले 14 दिनों की औसत जल-तनाव एक्सपोज़र", "yield.stressExplanation": "कम जल-तनाव → अनुमानित रेंज के शीर्ष के करीब।",
    "scenario.demoControlTitle": "सिम्युलेटेड परिदृश्य डेमो कंट्रोल", "scenario.demoControlSubtitle": "फील्ड की स्थिति का अनुकरण करें और वास्तविक बैकएंड निर्णय तर्क चलाएँ", "scenario.demoControlBadge": "डेमो कंट्रोल",
    "ml.title": "प्रयोगात्मक एमएल विश्लेषण", "ml.subtitle": "अनुसंधान तुलना के लिए माध्यमिक विश्लेषणात्मक मॉडल — एग्रोनॉमिक बेसलाइन को ओवरराइड नहीं करता", "ml.badge": "प्रयोगात्मक मॉडल", "ml.trainingDataLabel": "एमएल प्रशिक्षण डेटा:", "ml.trainingDataValue": "बाहरी अनुसंधान डेटासेट (Sugarcane Irrigation Dataset for SIDSS Framework, Zenodo DOI: 10.5281/zenodo.19725692)", "ml.currentSensorLabel": "वर्तमान सेंसर:", "ml.currentWeatherLabel": "वर्तमान मौसम:", "ml.primaryEngineLabel": "प्राथमिक सिंचाई इंजन:", "ml.primaryEngineValue": "FAO-56 कृषि आधार", "ml.disclaimerTitle": "वैज्ञानिक अस्वीकरण:", "ml.disclaimerBody": "यह प्रयोगात्मक मॉडल बाहरी मॉडल-सिम्युलेटेड गन्ने के रिसर्च डेटासेट पर प्रशिक्षित किया गया है। इसके परीक्षण मैट्रिक्स उस डेटासेट पर प्रदर्शन का वर्णन करते हैं और वास्तविक खेत सटीकता स्थापित नहीं करते।",
    "technical.detailsToggle": "तकनीकी विवरण और स्रोत देखें", "technical.engineModelType": "इंजन मॉडल प्रकार", "technical.featureVersion": "फीचर संस्करण", "technical.weatherProvenance": "मौसम स्रोत", "technical.sensorProvenance": "सेंसर स्रोत", "technical.dataQualityStatus": "डेटा गुणवत्ता स्थिति", "technical.calculationTimestamp": "गणना समय", "technical.mlLayerStatus": "एमएल लेयर स्थिति", "technical.mlModelVersion": "एमएल मॉडल संस्करण", "technical.mlTrainingRequirement": "एमएल प्रशिक्षण आवश्यकता",
  },
  kn: {
    "nav.overview": "ಅವಲೋಕನ", "nav.plots": "ನನ್ನ ಹೊಲಗಳು", "nav.advisory": "ನೀರಾವರಿ ಸಲಹೆ",
    "nav.weather": "ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ", "nav.sensors": "ಮಣ್ಣು ಮತ್ತು ಸೆನ್ಸರ್‌ಗಳು", "nav.fertigation": "ಫರ್ಟಿಗೇಶನ್",
    "nav.yield": "ಇಳುವರಿ ಮುನ್ಸೂಚನೆ", "nav.alerts": "ಎಚ್ಚರಿಕೆಗಳು", "nav.settings": "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು", "nav.logout": "ಲಾಗ್ ಔಟ್",
    "actions.addPlot": "+ ಹೊಲ ಸೇರಿಸಿ", "status.today": "ಇಂದು", "status.noAlerts": "ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ",
    "overview.recommendation": "ಇಂದಿನ ಸಲಹೆ", "overview.soilMoisture": "ಮಣ್ಣಿನ ತೇವಾಂಶ — ಕಳೆದ 14 ದಿನಗಳು", "overview.sensorPerDay": "30 ಸೆಂ.ಮೀ ಸೆನ್ಸರ್, ಪ್ರತಿದಿನ", "overview.yourPlots": "ನಿಮ್ಮ ಹೊಲಗಳು", "overview.quickStatus": "ನೀವು ನಿರ್ವಹಿಸುವ ಎಲ್ಲಾ ಹೊಲಗಳ ಸ್ಥಿತಿ",
    "advisory.recommendation": "AI ನೀರಾವರಿ ಸಲಹೆ", "advisory.modelBreakdown": "ಮಾದರಿ ವಿವರ", "advisory.calculated": "ಈ ಸಲಹೆಯನ್ನು ಹೇಗೆ ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ", "advisory.logEvent": "ನೀರಾವರಿ ದಾಖಲಿಸಿ", "advisory.confirmPump": "ಮುಂದಿನ ಸಲಹೆಗಳಿಗೆ ಪಂಪ್ ಚಾಲನೆಯನ್ನು ದೃಢೀಕರಿಸಿ", "advisory.whyThisRecommendation": "ಈ ಸಲಹೆ ಏಕೆ?", "advisory.whyThisRecommendationSub": "FAO-56 ಬೆಳೆ ಭೌತಶಾಸ್ತ್ರ ಮತ್ತು ಸ್ಥಳೀಯ ಟೆಲಿಮೆಟ್ರಿ ಆಧಾರದ ಮೇಲೆ ರಚಿಸಲಾಗಿದೆ", "advisory.loadingExplanation": "ವಿವರಣೆಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…", "advisory.recentHistory": "ಇತ್ತೀಚಿನ ನೀರಾವರಿ ಇತಿಹಾಸ", "advisory.logIrrigation": "ನೀರಾವರಿ ದಾಖಲು", "advisory.trustSensorData": "ಸೆನ್ಸರ್‌ ಡೇಟಾ", "advisory.trustSimulatedDemo": "ಸಿಮ್ಯುಲೇಟೆಡ್ ಡೆಮೋ ಡೇಟಾ", "advisory.trustPhysicalSensor": "ಭೌತಿಕ ಸೆನ್ಸರ್", "advisory.trustWeather": "ಹವಾಮಾನ", "advisory.trustDecisionEngine": "ನೀತಿ ಎಂಜಿನ್", "advisory.engineAgronomic": "ಕೃಷಿ ಲೆಕ್ಕಾಚರಣೆ",
    "labels.nextIrrigation": "ಮುಂದಿನ ನೀರಾವರಿ", "labels.duration": "ಅವಧಿ", "labels.waterStress": "ನೀರಿನ ಒತ್ತಡ", "labels.predictedYield": "ಅಂದಾಜು ಇಳುವರಿ", "labels.cropStage": "ಬೆಳೆಯ ಹಂತ", "labels.waterRequirement": "ನೀರಿನ ಅವಶ್ಯಕತೆ", "labels.volumeNeeded": "ಅಗತ್ಯ ಪ್ರಮಾಣ", "labels.yieldLossRisk": "ಇಳುವರಿ ನಷ್ಟದ ಅಪಾಯ", "labels.durationHours": "ಅವಧಿ (ಗಂಟೆಗಳು)", "labels.waterApplied": "ಪ್ರಯೋಗಿಸಿದ ನೀರು (m³)", "common.date": "ದಿನಾಂಕ", "common.waterM3": "ನೀರು (m³)",
    "settings.profile": "ಪ್ರೊಫೈಲ್", "settings.profileTitle": "ಪ್ರೊಫೈಲ್ ವಿವರಗಳು", "settings.profileSubtitle": "ನಿಮ್ಮ ನೋಂದಾಯಿತ ಖಾತೆ ವಿವರಗಳು", "settings.statusActive": "ಸಕ್ರಿಯ", "settings.nameLabel": "ಹೆಸರು", "settings.mobileLabel": "ಮೊಬೈಲ್", "settings.accountSecurity": "ಖಾತೆ ಮತ್ತು ಭದ್ರತೆ", "settings.advisoryPreferences": "ನೀರಾವರಿ ಆಯ್ಕೆಗಳು", "settings.language": "ನೀರಾವರಿ ಭಾಷೆ", "settings.units": "ಮಾಪನ ಘಟಕಗಳು", "settings.plainLanguage": "ಸರಳ-ಭಾಷೆಯ ಸಲಹೆಗಳು", "settings.plainLanguageHint": "ಸಲಹೆಗಳನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಮತ್ತು ರೈತನ ಸ್ನೇಹಿಯನ್ನಾಗಿ ಇರಿಸಿ", "settings.notifications": "ಅಧಿಸೂಚನೆಗಳು", "settings.notificationsHint": "ನೀರಾವರಿ ಮತ್ತು ಹವಾಮಾನ ಬದಲಾವಣೆಗಳು ಬಂದ ಮೊದಲು ತಿಳಿಯಿರಿ", "settings.irrigationReminders": "ನೀರಾವರಿ ನೆನಪುಗಳು", "settings.irrigationRemindersHint": "ಮುಂದಿನ ಶಿಫಾರಸು ಮಾಡುವ Mika", "settings.rainfallAlerts": "ಮಳೆ ಎಚ್ಚರಿಕೆ", "settings.rainfallAlertsHint": "ಮಳೆ ನಿಮ್ಮ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಹೇಗೆ ಬದಲಾಯಿಸಬಹುದು ಎಂದು ತಿಳಿಯಿರಿ", "settings.sensorHealthAlerts": "ಸೆನ್ಸರ್ ಆರೋಗ್ಯ ಎಚ್ಚರಿಕೆ", "settings.sensorHealthAlertsHint": "ಮೌಲ್ಯಗಳು ಅಸಾಮಾನ್ಯವಾಗಿದ್ದಾಗ ತಿಳಿಯಿರಿ", "settings.changePassword": "ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ", "settings.changePasswordHint": "ನಿಮ್ಮ ಲಾಗಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ನವೀಕರಿಸಿ", "settings.signOutEverywhere": "ಎಲ್ಲೆಡೆ ಲಾಗ್ ಔಟ್", "settings.signOutEverywhereHint": "ಈ ಖಾತೆಯನ್ನು ಎಲ್ಲಾ ಉಳಿಸಿದ ಸೆಷನ್ಗಳಿಂದ ತೆರವುಗೊಳಿಸಿ", "settings.deleteAccount": "ಖಾತೆಯನ್ನು ಅಳಿಸಿ", "settings.deleteAccountHint": "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಹೊಲಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ತೆಗೆದುಹಾಕಿ", "settings.editProfile": "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ", "settings.downloadData": "ನನ್ನ ಡೇಟಾವನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ", "settings.memberSince": "ಸದಸ್ಯರಾದ ದಿನಾಂಕ", "settings.village": "ಗ್ರಾಮ", "settings.taluk": "ತಾಲೂಕು", "settings.district": "ಜಿಲ್ಲೆ", "settings.mobile": "ಮೊಬೈಲ್", "settings.metric": "ಮೆಟ್ರಿಕ್ — ಎಕರೆ, m³, mm", "settings.imperial": "ಇಂಪೀರಿಯಲ್ — ಎಕರೆ, ಗ್ಯಾಲನ್, ಇಂಚು",
    "settings.table.village": "ಗ್ರಾಮ", "settings.table.taluk": "ತಾಲೂಕು", "settings.table.district": "ಜಿಲ್ಲೆ", "settings.table.memberSince": "ಸದಸ್ಯರಾದ ದಿನಾಂಕ", "settings.buttons.editProfile": "ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ", "settings.buttons.downloadData": "ನನ್ನ ಡೇಟಾವನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ", "settings.prefs.title": "ನೀರಾವರಿ ಆಯ್ಕೆಗಳು", "settings.prefs.subtitle": "KhetAI ಸಲಹೆಗಳನ್ನು ಹೇಗೆ ತೋರಿಸಬೇಕೆಂದು ಆಯ್ಕೆ ಮಾಡಿ", "settings.notifications.title": "ಅಧಿಸೂಚನೆಗಳು", "settings.notifications.subtitle": "ನೀರಾವರಿ ಮತ್ತು ಹವಾಮಾನ ಬದಲಾವಣೆಗಳ 앞ರಿಯಲಿ", "settings.security.title": "ಖಾತೆ ಮತ್ತು ಭದ್ರತೆ", "settings.security.subtitle": "ನಿಮ್ಮ ರೈತ ಖಾತೆಯನ್ನು ನಿರ್ವಹಿಸಿ", "settings.actions.changePassword": "ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ", "settings.actions.signOutEverywhere": "ಎಲ್ಲೆಡೆ ಲಾಗ್ ಔಟ್", "settings.actions.deleteAccount": "ಖಾತೆಯನ್ನು ಅಳಿಸಿ", "settings.actions.changePasswordHint": "ನಿಮ್ಮ ಲಾಗಿನ್ ಪಾಸ್‌ವರ್ಡ್ ಅನ್ನು ನವೀಕರಿಸಿ", "settings.actions.signOutEverywhereHint": "ಈ ಖಾತೆಯನ್ನು ಎಲ್ಲಾ ಉಳಿಸಿದ ಸೆಷನ್ಗಳಿಂದ ತೆರವುಗೊಳಿಸಿ", "settings.actions.deleteAccountHint": "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಮತ್ತು ಹೊಲಗಳನ್ನು ಶಾಶ್ವತವಾಗಿ ತೆಗೆದುಹಾಕಿ",
    "common.noPlotsYet": "ಇನ್ನೂ ಹೊಲಗಳಿಲ್ಲ", "common.viewAdvisory": "ಸಲಹೆ ನೋಡಿ", "common.remove": "ತೆಗೆಯಿರಿ", "common.welcomeAddPlot": "ಸ್ವಾಗತ! ಲೈವ AI ಸಲಹೆಗಳನ್ನು ನೋಡಲು ನಿಮ್ಮ ಮೊದಲ ಹೊಲವನ್ನು ಸೇರಿಸಿ.", "common.noAlerts": "ನಿಮ್ಮ ಹೊಲಗಳಲ್ಲಿ ಯಾವುದೇ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ.", "common.allClear": "ಎಲ್ಲವೂ ಸರಿಯಾಗಿದೆ", "common.plotRemoved": "ಹೊಲ ತೆಗೆಯಲಾಗಿದೆ.", "common.irrigationLogged": "ನೀರಾವರಿ ದಾಖಲಾಗಿಸಿದೆ.", "common.contactAdmin": "ಖಾತೆಯನ್ನು ಅಳಿಸಲು ನಿರ್ವಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ.", "common.mlUnavailable": "ML: ಲಭ್ಯವಿಲ್ಲ", "common.unavailable": "ಲಭ್ಯವಿಲ್ಲ", "common.plotName": "ಹೊಲದ ಹೆಸರು", "common.areaAcres": "ಕ್ಷೇತ್ರ (ಎಕರೆ)", "common.soilType": "ಮಣ್ಣಿನ ವಿಧ", "common.variety": "ಜಾತಿ", "common.plantingDate": "ರೋಪಣ ದಿನಾಂಕ", "common.lat": "ಅಕ್ಷಾಂಶ", "common.lng": "ರೇಖಾಂಶ", "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ…", "common.today": "ಇಂದು", "common.tomorrow": "ನಾಳೆ", "common.todayImmediately": "ಇಂದು / ತಕ್ಷಣ", "common.loadingAdvisory": "ಸಲಹೆಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ…", "common.locationOptional": "ಸ್ಥಳ (ಐಚ್ಛಿಕ)", "common.locationHint": "Sameerwadi, ಉತ್ತರ ಕರ್ನಾಟಕದ ಬಳಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಇರಿಸಲು ಖಾಲಿ ಬಿಡಿ.", "common.savePlot": "ಹೊಲ ಉಳಿಸಿ", "common.addPlotModalTitle": "ಹೊಸ ಹೊಲವನ್ನು ಸೇರಿಸಿ", "common.noPlotsSelect": "ಇನ್ನೂ ಹೊಲಗಳಿಲ್ಲ", "common.info": "ಮಾಹಿತಿ",
    "alerts.markRead": "ಓದಿದಂತೆ ಗುರುತಿಸಿ", "alerts.title": "ಎಚ್ಚರಿಕೆಗಳು ಮತ್ತು ಅಧಿಸೂಚನೆಗಳು", "alerts.subtitle": "ಪ್ರಸ್ತುತ ಸೆನ್ಸರ್ ಮತ್ತು ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳಿಂದ ನೇರವಾಗಿ ಉತ್ಪತ್ತಿಯಾಗುತ್ತದೆ",
    "plots.emptyMessage": "AI ಸಲಹೆಗಳನ್ನು ಪಡೆಯಲು ನಿಮ್ಮ ಮೊದಲ ಇಂಗುವಿನ ಹೊಲವನ್ನು ಸೇರಿಸಿ.", "plot.deleteConfirmPrefix": "ತೆಗೆಯಿರಿ", "plot.deleteConfirmSuffix": "ಇದರಿಂದ ಅದರ ಸೆನ್ಸರ್ ಮತ್ತು ನೀರಾವರಿ ಇತಿಹಾಸವೂ ಅಳಿಸುತ್ತದೆ.", "plot.addedSuccess": "ಸೇರಿಸಲಾಗಿದೆ — ಮೊದಲ ಸಲಹೆಯನ್ನು ರಚಿಸಲಾಗುತ್ತಿದೆ.", "plot.card.areaAcres": "ಎಕರೆ", "plot.card.planted": "ನಾಟಿದ",
    "sensors.moisture30": "ಮಣ್ಣಿನ ತೇವಾಂಶ (30 ಸೆಂ.ಮೀ)", "sensors.moisture60": "ಮಣ್ಣಿನ ತೇವಾಂಶ (60 ಸೆಂ.ಮೀ)", "sensors.temperature": "ಮಣ್ಣಿನ ತಾಪಮಾನ", "sensors.ndvi": "NDVI (ಬೆಳೆ ಆರೋಗ್ಯ)", "sensors.trendTitle": "ಮಣ್ಣು ಮತ್ತು ಪರಿಸರ ಪ್ರವೃತ್ತಿ — ಕಳೆದ 14 ದಿನಗಳು",
    "fertigation.planTitle": "ಫರ್ಟಿಗೇಶನ್ ಯೋಜನೆ", "fertigation.totalFor": "ಮೊತ್ತ", "fertigation.urea": "ಯೂರಿಯಾ", "fertigation.dap": "DAP", "fertigation.mop": "MOP (ಪೊಟ್ಯಾಶ್)", "fertigation.perAcreTitle": "ಪ್ರತಿ ಎಕರೆ ಮಾರ್ಗದರ್ಶಿ", "fertigation.perAcreSubtitle": "ನಿಮ್ಮ ಹೊಲದ ಪ್ರದೇಶದ ತೂಕಕ್ಕೆ before scaling to your plot area", "fertigation.nutrient": "ಪೋಷಕಾಂಶ", "fertigation.kgPerAcre": "kg / ಎಕರೆ", "fertigation.applyWithIrrigation": "ನೀರಾವರಿ ವೇಳೆಗೆ ಅನ್ವಯಿಸಿ",
    "weather.liveData": "Open-Meteo ನಿಂದ ನೇರ ಡೇಟಾ", "weather.simulatedForecast": "ಸಿಮ್ಯುಲೇಟೆಡ್ ಮುನ್ಸೂಚನೆ (ಆಫ್‌ಲೈನ್ fallback)", "weather.rain": "ಮಳೆ", "weather.fiveDayForecast": "5-ದಿನದ ಮುನ್ಸೂಚನೆ", "weather.plotLocation": "ಹೊಲದ ಸ್ಥಳ", "weather.plotLocationSubtitle": "ಸ್ಥಳೀಯ ಹವಾಮಾನ ಡೇಟಾವನ್ನು ಪಡೆಯಲು ಬಳಸಲಾಗುತ್ತದೆ",
    "yield.lowEstimate": "ಕಡಿಮೆ ಅಂದಾಜು", "yield.predicted": "ಅಂದಾಜು", "yield.highEstimate": "ಅಧಿಕ ಅಂದಾಜು", "yield.predictedYieldTitle": "ಅಂದಾಜು ಇಳುವರಿ", "yield.tonnesPerHectare": "ಟನ್ / ಹೆಕ್ಟೇರ್", "yield.rangeLabel": "ಶ್ರೇಣಿ:", "yield.tHa": "t/ha", "yield.drivingPredictionTitle": "ಈ ಮುನ್ಸೂಚನೆಯನ್ನು ಯಾವಂಶಗಳು ಕಾರಣಮಾಡುತ್ತವೆ", "yield.drivingPredictionSubtitle": "ಕಳೆದ 14 ದಿನಗಳ ಸರಾಸರಿ ನೀರಿನ ಒತ್ತಡದ ಒಡ್ಡು exposure", "yield.stressExplanation": "ಕಡಿಮೆ ಒತ್ತಡ → ಅಂದಾಜು ರೇಂಜಿನ ಮೇಲ್ಭಾಗಕ್ಕೆ ಹತ್ತಿರ.",
    "scenario.demoControlTitle": "ಸಿಮ್ಯುಲೇಟೆಡ್ ಸ್ಕೆನರಿಯೋ ಡೆಮೋ ಕಂಟ್ರೋಲ್", "scenario.demoControlSubtitle": "ಕ್ಷೇತ್ರದ સ્થિતિಗಳನ್ನು ಸಿಮ್ಯುಲೇಟ್ ಮಾಡಿ ಮತ್ತು ನಿಜವಾದ ಬ್ಯಾಕ್‌ಎಂಡ್ ನಿರ್ಧಾರದ ತರ್ಕವನ್ನು ರನ್ ಮಾಡಿ", "scenario.demoControlBadge": "ಡೆಮೋ ಕಂಟ್ರೋಲ್",
    "ml.title": "ಪ್ರಾಯೋಗಿಕ ML ವಿಶ್ಲೇಷಣೆ", "ml.subtitle": "ಅಧ್ಯಯನ ಹೋಲಿಕೆಗಾಗಿ ದ್ವಿತೀಯ ವಿಶ್ಲೇಷಣಾತ್ಮಕ ಮಾದರಿ — ಕೃಷಿ ಆಧಾರವನ್ನು ಅತಿಕ್ರಮಿಸುವುದಿಲ್ಲ", "ml.badge": "ಪ್ರಾಯೋಗಿಕ ಮಾದರಿ", "ml.trainingDataLabel": "ML ತರಬೇತಿ ಡೇಟಾ:", "ml.trainingDataValue": "ಬಾಹ್ಯ ಸಂಶೋಧನಾ ಡೇಟಾಸೆಟ್ (Sugarcane Irrigation Dataset for SIDSS Framework, Zenodo DOI: 10.5281/zenodo.19725692)", "ml.currentSensorLabel": "ಪ್ರಸ್ತುತ ಸೆನ್ಸರ್:", "ml.currentWeatherLabel": "ಪ್ರಸ್ತುತ ಹವಾಮಾನ:", "ml.primaryEngineLabel": "ಪ್ರಾಥಮಿಕ ನೀರಾವರಿ ಎಂಜಿನ್:", "ml.primaryEngineValue": "FAO-56 ಕೃಷಿ ಆಧಾರ", "ml.disclaimerTitle": "ವೈಜ್ಞಾನಿಕ ನಿರಾಕರಣೆ:", "ml.disclaimerBody": "ಈ ಪ್ರಾಯೋಗಿಕ ಮಾದರಿಯನ್ನು ಬಾಹ್ಯ ಮಾದರಿ-ಸಿಮ್ಯುಲೇಟೆಡ್ ಗಂಜಿ ಸಂಶೋಧನಾ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ತರಬೇತಿ ನೀಡಲಾಗಿದೆ. ಇದರ ಪರೀಕ್ಷಾ ಮಾಪಕಗಳು ಆ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿನ ಕಾರ್ಯಶೀಲತೆಯನ್ನು ವಿವರಿಸುವುದಷ್ಟೆ ಮತ್ತು ನಿಜದ ತೋಟದ ನಿಖರತೆಯನ್ನು ಸ್ಥಾಪಿಸುವುದಿಲ್ಲ.",
    "technical.detailsToggle": "ತಾಂತ್ರಿಕ ವಿವರಗಳು ಮತ್ತು ಮೂಲವನ್ನು ವೀಕ್ಷಿಸಿ", "technical.engineModelType": "ಎಂಜಿನ್ મોડೆಲ್ ಪ್ರಕಾರ", "technical.featureVersion": "ಫೀಚರ್ ಆವೃತ್ತಿ", "technical.weatherProvenance": "ಹವಾಮಾನ ಮೂಲ", "technical.sensorProvenance": "ಸೆನ್ಸರ್ ಮೂಲ", "technical.dataQualityStatus": "ಡೇಟಾ ಗುಣಮಟ್ಟ ಸ್ಥಿತಿ", "technical.calculationTimestamp": "ಲೆಕ್ಕಾಚಾರದ ದಿನಾಂಕ", "technical.mlLayerStatus": "ML ಲೇಯರ್ ಸ್ಥಿತಿ", "technical.mlModelVersion": "ML ಮಾದರಿ ಆವೃತ್ತಿ", "technical.mlTrainingRequirement": "ML ತರಬೇತಿ ಅವಶ್ಯಕತೆ",
  },
  mr: {
    "nav.overview": "आढावा", "nav.plots": "माझी शेतजमीन", "nav.advisory": "सिंचन सल्ला",
    "nav.weather": "हवामान अंदाज", "nav.sensors": "माती आणि सेन्सर", "nav.fertigation": "फर्टिगेशन",
    "nav.yield": "उत्पादन अंदाज", "nav.alerts": "सूचना", "nav.settings": "प्रोफाइल आणि सेटिंग्ज", "nav.logout": "लॉग आउट",
    "actions.addPlot": "+ शेतजमीन जोडा", "status.today": "आज", "status.noAlerts": "सर्व ठीक आहे",
    "overview.recommendation": "आजची शिफारस", "overview.soilMoisture": "मातीतील ओलावा — मागील १४ दिवस", "overview.sensorPerDay": "३० सेमी सेन्सर, दररोज", "overview.yourPlots": "तुमची शेतजमीन", "overview.quickStatus": "तुम्ही व्यवस्थापित करत असलेल्या सर्व शेतांची स्थिती",
    "advisory.recommendation": "एआय सिंचन सल्ला", "advisory.modelBreakdown": "मॉडेल तपशील", "advisory.calculated": "ही शिफारस कशी मोजली गेली", "advisory.logEvent": "सिंचन नोंदवा", "advisory.confirmPump": "पुढील सल्ल्यासाठी पंप चालवल्याची पुष्टी करा", "advisory.whyThisRecommendation": "ही शिफारस का?", "advisory.whyThisRecommendationSub": "FAO-56 पीक भौतिकशास्त्र आणि स्थानिक टेलिमेट्रीवर आधारित", "advisory.loadingExplanation": "स्पष्टीकरण लोड होत आहे…", "advisory.recentHistory": "अलीकडील सिंचन इतिहास", "advisory.logIrrigation": "सिंचन नोंदवा", "advisory.trustSensorData": "सेन्सर डेटा", "advisory.trustSimulatedDemo": "सिम्युलेटेड डेमो डेटा", "advisory.trustPhysicalSensor": "भौतिक सेन्सर", "advisory.trustWeather": "हवामान", "advisory.trustDecisionEngine": "निर्णय इंजिन", "advisory.engineAgronomic": "कृषिविषयक गणना",
    "labels.nextIrrigation": "पुढील सिंचन", "labels.duration": "कालावधी", "labels.waterStress": "पाण्याचा ताण", "labels.predictedYield": "अंदाजे उत्पादन", "labels.cropStage": "पिकाची अवस्था", "labels.waterRequirement": "पाण्याची गरज", "labels.volumeNeeded": "आवश्यक मात्रा", "labels.yieldLossRisk": "उत्पादन घटण्याचा धोका", "labels.durationHours": "कालावधी (तास)", "labels.waterApplied": "प्रयुक्त पाणी (m³)", "common.date": "तारीख", "common.waterM3": "पाणी (m³)",
    "settings.profile": "प्रोफाइल", "settings.profileTitle": "प्रोफाइल तपशील", "settings.profileSubtitle": "तुमचे नोंदणीकृत खाते तपशील", "settings.statusActive": "सक्रिय", "settings.nameLabel": "नाव", "settings.mobileLabel": "मोबाइल", "settings.accountSecurity": "खाते आणि सुरक्षा", "settings.advisoryPreferences": "सिंचन प्राधान्ये", "settings.language": "सिंचन भाषा", "settings.units": "मापन युनिट्स", "settings.plainLanguage": "सोप्या भाषेतील शिफारसी", "settings.plainLanguageHint": "सल्ला लहान आणि शेतकरी-मैत्रीपूर्ण ठेवा", "settings.notifications": "सूचना", "settings.notificationsHint": "सिंचन आणि हवामान बदलांपूर्वी माहिती मिळवा", "settings.irrigationReminders": "सिंचन आठवण्या", "settings.irrigationRemindersHint": "पुढील शिफारस आलेल्या वेळी आधी सूचना मिळवा", "settings.rainfallAlerts": "पावसाची सूचना", "settings.rainfallAlertsHint": "पाऊस तुमच्या वेळापत्रकात काय बदल करेल हे जाणून घ्या", "settings.sensorHealthAlerts": "सेन्सर आरोग्य सूचना", "settings.sensorHealthAlertsHint": "वाचन असामान्य असल्यास सूचना मिळवा", "settings.changePassword": "पासवर्ड बदलवा", "settings.changePasswordHint": "तुमचा लॉगिन पासवर्ड अपडेट करा", "settings.signOutEverywhere": "सर्व ठिकाणी लॉग आउट", "settings.signOutEverywhereHint": "या खात्याला सर्व सेव्ह केलेल्या सत्रांमधून साफ करा", "settings.deleteAccount": "खाते हटवा", "settings.deleteAccountHint": "तुमचा प्रोफाइल आणि शेत कायमचे हटवा", "settings.editProfile": "प्रोफाइल संपादित करा", "settings.downloadData": "माझे डेटा डाउनलोड करा", "settings.memberSince": "सदस्य पासून", "settings.village": "गाव", "settings.taluk": "तालुका", "settings.district": "जिल्हा", "settings.mobile": "मोबाइल", "settings.metric": "मेट्रिक — एकर, m³, mm", "settings.imperial": "इम्पीरियल — एकर, गॅलन, इंच",
    "settings.table.village": "गाव", "settings.table.taluk": "तालुका", "settings.table.district": "जिल्हा", "settings.table.memberSince": "पासून सदस्य", "settings.buttons.editProfile": "प्रोफाइल संपादित करा", "settings.buttons.downloadData": "माझे डेटा डाउनलोड करा", "settings.prefs.title": "सिंचन प्राधान्ये", "settings.prefs.subtitle": "KhetAI सूचना कशी दाखवायची ते निवडा", "settings.notifications.title": "सूचना", "settings.notifications.subtitle": "सिंचन आणि हवामान बदलांपासून पुढे रहा", "settings.security.title": "खाते आणि सुरक्षा", "settings.security.subtitle": "तुमच्या शेतकरी खात्याचा प्रवेश व्यवस्थापित करा", "settings.actions.changePassword": "पासवर्ड बदलवा", "settings.actions.signOutEverywhere": "सर्व ठिकाणी लॉग आउट", "settings.actions.deleteAccount": "खाते हटवा", "settings.actions.changePasswordHint": "तुमचा लॉगिन पासवर्ड अपडेट करा", "settings.actions.signOutEverywhereHint": "या खात्याला सर्व सेव्ह केलेल्या सत्रांमधून साफ करा", "settings.actions.deleteAccountHint": "तुमचा प्रोफाइल आणि शेत कायमचे हटवा",
    "common.noPlotsYet": "अद्याप शेत नाहीत", "common.viewAdvisory": "सल्ला पहा", "common.remove": "काढा", "common.welcomeAddPlot": "स्वागत! तुमचे पहिले शेत जोडून लाइव्ह AI सल्ले पहा.", "common.noAlerts": "तुमच्या शेतांमध्ये सध्या कोणतीही सूचना नाही.", "common.allClear": "सर्व ठीक आहे", "common.plotRemoved": "शेत काढले गेले.", "common.irrigationLogged": "सिंचन नोंदवले गेले.", "common.contactAdmin": "खाते हटवण्यासाठी कृपया प्रशासकाशी संपर्क करा.", "common.mlUnavailable": "ML: उपलब्ध नाही", "common.unavailable": "उपलब्ध नाही", "common.plotName": "शेत नाव", "common.areaAcres": "क्षेत्र (एकर)", "common.soilType": "मातीचा प्रकार", "common.variety": "प्रजाती", "common.plantingDate": "लावणी तारीख", "common.lat": "अक्षांश", "common.lng": "रेखांश", "common.loading": "लोड होत आहे…", "common.today": "आज", "common.tomorrow": "काळी", "common.todayImmediately": "आज / तत्काळ", "common.loadingAdvisory": "सल्ला लोड होत आहे…", "common.locationOptional": "स्थान (पर्यायी)", "common.locationHint": "Sameerwadi, उत्तर कर्नाटकाच्या आसपास स्वयंचलित ठिकाणी ठेवण्यासाठी रिकामे सोडा.", "common.savePlot": "शेत जतन करा", "common.addPlotModalTitle": "नवीन शेत जोडा", "common.noPlotsSelect": "अद्याप शेत नाहीत", "common.info": "माहिती",
    "alerts.markRead": "वाचले म्हणून चिन्हांकित करा", "alerts.title": "अलर्ट आणि सूचना", "alerts.subtitle": "सध्याच्या सेंसर आणि हवामान परिस्थितीपासून थेट तयार केलेले",
    "plots.emptyMessage": "AI सल्ले मिळवण्यासाठी तुमचे पहिले गन्न्याच्या शेताचे शेत जोडा.", "plot.deleteConfirmPrefix": "काढा", "plot.deleteConfirmSuffix": "यामुळे त्याचे सेन्सर आणि सिंचन इतिहासही हटेल.", "plot.addedSuccess": "जोडले — पहिले सल्ले तयार होत आहे.", "plot.card.areaAcres": "एकर", "plot.card.planted": "लावले",
    "sensors.moisture30": "मातीची ओलावा (30 सेमी)", "sensors.moisture60": "मातीची ओलावा (60 सेमी)", "sensors.temperature": "मातीचे तापमान", "sensors.ndvi": "NDVI (फसल आरोग्य)", "sensors.trendTitle": "माती आणि पर्यावरणीय प्रवृत्ती — मागील 14 दिवस",
    "fertigation.planTitle": "फर्टिगेशन योजना", "fertigation.totalFor": "एकूण", "fertigation.urea": "युरिया", "fertigation.dap": "DAP", "fertigation.mop": "MOP (पोटॅश)", "fertigation.perAcreTitle": "प्रति एकर मार्गदर्शक", "fertigation.perAcreSubtitle": "तुमच्या शेताच्या क्षेत्रफळावर स्केल करण्यापूर्वी मानक डोस", "fertigation.nutrient": "पोषक घटक", "fertigation.kgPerAcre": "kg / एकर", "fertigation.applyWithIrrigation": "सिंचन वेळेनुसार लागू करा",
    "weather.liveData": "Open-Meteo वरून थेट डेटा", "weather.simulatedForecast": "सिम्युलेशन अंदाज (ऑफलाइन फॉलबॅक)", "weather.rain": "पाऊस", "weather.fiveDayForecast": "5-दिवसीय अंदाज", "weather.plotLocation": "शेताचे स्थान", "weather.plotLocationSubtitle": "स्थानिक हवामान डेटा मिळवण्यासाठी वापरले जाते",
    "yield.lowEstimate": "कमी अंदाज", "yield.predicted": "अंदाजे", "yield.highEstimate": "उच्च अंदाज", "yield.predictedYieldTitle": "अंदाजे उत्पादन", "yield.tonnesPerHectare": "टन / हेक्टेअर", "yield.rangeLabel": "रेंज:", "yield.tHa": "t/ha", "yield.drivingPredictionTitle": "ही अंदाजणी का बनत आहे", "yield.drivingPredictionSubtitle": "मागील 14 दिवसांची सरासरी पाण्याचा ताण", "yield.stressExplanation": "कमी ताण → अंदाजित श्रेणीच्या वरच्या टोकाजवळ.",
    "scenario.demoControlTitle": "सिम्युलेटेड scénारिओ डेमो कंट्रोल", "scenario.demoControlSubtitle": "फील्ड स्थितीचे सिम्युलेशन करा आणि वास्तविक बॅकएंड निर्णय तर्क चालवा", "scenario.demoControlBadge": "डेमो कंट्रोल",
    "ml.title": "प्रयोगात्मक ML विश्लेषण", "ml.subtitle": "संशोधन तुलना साठी दुय्यम विश्लेषणात्मक मॉडेल — कृषी बेसलाइन ओव्हरराइड करत नाही", "ml.badge": "प्रयोगात्मक मॉडेल", "ml.trainingDataLabel": "ML प्रशिक्षण डेटा:", "ml.trainingDataValue": "बाह्य संशोधन डेटासेट (Sugarcane Irrigation Dataset for SIDSS Framework, Zenodo DOI: 10.5281/zenodo.19725692)", "ml.currentSensorLabel": "सध्याचा सेन्सर:", "ml.currentWeatherLabel": "सध्याचे हवामान:", "ml.primaryEngineLabel": "मुख्य सिंचन इंजिन:", "ml.primaryEngineValue": "FAO-56 कृषिकीय बेसलाइन", "ml.disclaimerTitle": "वैज्ञानिक अंदाज:", "ml.disclaimerBody": "हा प्रयोगात्मक मॉडेल बाह्य मॉडल-सिम्युलेटेड गन्नेच्या संशोधन डेटासेटवर प्रशिक्षित आहे. हे चाचणी मेट्रिक्स त्या डेटासेटवरील कामगिरीचे वर्णन करतात आणि वास्तविक शेतातील अचूकतेची पुष्टी करत नाहीत.",
    "technical.detailsToggle": "तांत्रिक तपशील आणि प्रामाणिकता पाहा", "technical.engineModelType": "इंजिन मॉडेल प्रकार", "technical.featureVersion": "फिचर आवृत्ती", "technical.weatherProvenance": "हवामान स्रोत", "technical.sensorProvenance": "सेन्सर स्रोत", "technical.dataQualityStatus": "डेटा गुणवत्ता स्थिती", "technical.calculationTimestamp": "गणना वेळ", "technical.mlLayerStatus": "ML लेयर स्थिती", "technical.mlModelVersion": "ML मॉडेल आवृत्ती", "technical.mlTrainingRequirement": "ML प्रशिक्षण आवश्यकता",
  },
};

function applyLanguage() {
  const lang = UI_TRANSLATIONS[state.lang] ? state.lang : "en";
  state.lang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = UI_TRANSLATIONS[lang][element.dataset.i18n] || UI_TRANSLATIONS.en[element.dataset.i18n];
    if (value) element.textContent = value;
  });
}

// ---------------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------------
async function init() {
  applyLanguage();
  state.user = Auth.getUser();
  renderSidebarUser();

  try {
    const { plots } = await api.listPlots();
    state.plots = plots;
  } catch (err) {
    showToast(err.message, "error");
  }

  populatePlotSelect();

  if (state.plots.length === 0) {
    openPlotModal();
    showToast("Welcome! Add your first plot to see live AI advisories.", "success");
  } else {
    state.currentPlotId = state.plots[0].id;
  }

  document.getElementById("lang-select").value = state.lang;

  bindNav();
  bindTopbar();
  bindPlotModal();
  bindForms();
  bindSettings();
  bindAdvisoryControls();

  await loadView("overview");
}

function renderSidebarUser() {
  if (!state.user) return;
  document.getElementById("sidebar-name").textContent = state.user.name;
  document.getElementById("sidebar-village").textContent = [state.user.village, state.user.district].filter(Boolean).join(", ") || "—";
  document.getElementById("sidebar-avatar").textContent = state.user.name.charAt(0).toUpperCase();
}

function populatePlotSelect() {
  const select = document.getElementById("plot-select");
  select.innerHTML = state.plots
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join("") || `<option value="">No plots yet</option>`;
  if (state.currentPlotId) select.value = state.currentPlotId;
}

function currentPlot() {
  return state.plots.find((p) => p.id === state.currentPlotId) || null;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
const VIEW_TITLES = {
  overview: "Overview",
  plots: "My Plots",
  advisory: "Irrigation Advisory",
  weather: "Weather Forecast",
  sensors: "Soil & Sensors",
  fertigation: "Fertigation",
  yield: "Yield Prediction",
  alerts: "Alerts & Notifications",
  settings: "Profile & Settings",
};

function bindNav() {
  document.querySelectorAll(".side-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      loadView(view);
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("sidebar-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    Auth.clear();
    window.location.href = "index.html";
  });
}

async function loadView(view) {
  document.querySelectorAll(".side-link").forEach((l) => l.classList.toggle("active", l.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.getElementById("topbar-title").textContent = UI_TRANSLATIONS[state.lang][`nav.${view}`] || VIEW_TITLES[view];

  if (!currentPlot() && view !== "settings" && view !== "plots") {
    return; // wait until a plot exists
  }

  try {
    if (view === "overview") await renderOverview();
    if (view === "plots") renderPlotsGrid();
    if (view === "advisory") await renderAdvisory();
    if (view === "weather") await renderWeather();
    if (view === "sensors") await renderSensors();
    if (view === "fertigation") await renderFertigation();
    if (view === "yield") await renderYieldView();
    if (view === "alerts") await renderAlerts();
    if (view === "settings") renderSettings();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function bindTopbar() {
  document.getElementById("plot-select").addEventListener("change", (e) => {
    state.currentPlotId = e.target.value;
    const active = document.querySelector(".side-link.active").dataset.view;
    loadView(active);
  });

  document.getElementById("lang-select").addEventListener("change", (e) => {
    state.lang = UI_TRANSLATIONS[e.target.value] ? e.target.value : "en";
    applyLanguage();
    localStorage.setItem("khet_lang", state.lang);
    const active = document.querySelector(".side-link.active").dataset.view;
    loadView(active);
  });

  document.getElementById("add-plot-btn").addEventListener("click", openPlotModal);
  document.getElementById("add-plot-btn-2").addEventListener("click", openPlotModal);
}

// ---------------------------------------------------------------------------
// Plot modal
// ---------------------------------------------------------------------------
function openPlotModal() {
  document.getElementById("plot-modal-backdrop").classList.add("show");
}
function closePlotModal() {
  document.getElementById("plot-modal-backdrop").classList.remove("show");
}
function bindPlotModal() {
  document.getElementById("modal-close").addEventListener("click", closePlotModal);
  document.getElementById("plot-modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "plot-modal-backdrop") closePlotModal();
  });

  document.getElementById("plot-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("plot-form-error");
    errorBox.classList.remove("show");

    const payload = {
      name: document.getElementById("plot-name").value.trim(),
      area: document.getElementById("plot-area").value,
      soilType: document.getElementById("plot-soil").value,
      variety: document.getElementById("plot-variety").value.trim(),
      plantingDate: document.getElementById("plot-planting").value,
      lat: document.getElementById("plot-lat").value || undefined,
      lng: document.getElementById("plot-lng").value || undefined,
    };

    try {
      const { plot } = await api.createPlot(payload);
      state.plots.push(plot);
      state.currentPlotId = plot.id;
      populatePlotSelect();
      closePlotModal();
      document.getElementById("plot-form").reset();
      showToast(`${plot.name} added — generating its first advisory.`, "success");
      loadView("overview");
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
    }
  });
}

// ---------------------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------------------
async function renderOverview() {
  const plot = currentPlot();
  const [summary, advisoryRes, yieldRes, sensorsRes] = await Promise.all([
    api.getDashboardSummary(),
    api.getAdvisory(plot.id, state.lang),
    api.getYield(plot.id),
    api.getSensors(plot.id),
  ]);

  const kpiHtml = [
    { label: "Total area managed", value: `${summary.totalAreaAcres} ac`, delta: `${summary.plotCount} plot(s)`, cls: "flat" },
    { label: "Avg. water stress", value: `${summary.avgWaterStressPct}%`, delta: summary.avgWaterStressPct >= 60 ? "Needs attention" : "Within range", cls: summary.avgWaterStressPct >= 60 ? "down" : "up" },
    { label: "Water needed now", value: `${summary.estimatedWaterNeedM3} m³`, delta: "Across all plots", cls: "flat" },
    { label: "Irrigation events (30d)", value: summary.irrigationEventsLast30Days, delta: `${summary.totalWaterAppliedLast30DaysM3} m³ applied`, cls: "flat" },
  ];
  document.getElementById("overview-kpis").innerHTML = kpiHtml
    .map(
      (k) => `<div class="card kpi"><span class="label">${k.label}</span><b>${k.value}</b><span class="delta ${k.cls}">${k.delta}</span></div>`
    )
    .join("");

  const advisory = advisoryRes.advisory;
  document.getElementById("overview-plot-name").textContent = plot.name;
  document.getElementById("overview-advisory-text").textContent = advisoryRes.farmerMessage;
  document.getElementById("overview-next-date").textContent = advisory.nextIrrigationInDays <= 0 ? "Today" : advisory.nextIrrigationDate;
  document.getElementById("overview-duration").textContent = `${advisory.irrigationDurationHours} hrs`;
  document.getElementById("overview-stress").textContent = `${advisory.waterStressLevel} (${advisory.waterStressProbability}%)`;
  document.getElementById("overview-yield").textContent = `${yieldRes.prediction.predictedYieldTPerHa} t/ha`;
  document.getElementById("overview-gauge").innerHTML = renderGauge({
    pct: advisory.soilMoisturePct, size: 130, stroke: 12, zones: [
      { upTo: 33, color: "#e2b673" }, { upTo: 66, color: "#f0d9a6" }, { upTo: 100, color: "#f5efdd" },
    ]
  });

  // Moisture trend chart
  const history = sensorsRes.history;
  drawLineChart("overview-moisture-chart", {
    labels: history.map((h) => h.date.slice(5)),
    datasets: [{ label: "Soil moisture (30cm) %", data: history.map((h) => h.soilMoisture30), color: CHART_COLORS.green }],
  });

  // Plots table
  const tbody = document.querySelector("#overview-plots-table tbody");
  tbody.innerHTML = summary.plots
    .map(
      (p) => `<tr><td>${p.name}</td><td>${p.cropStage}</td><td>${badgeForStress(p.waterStressLevel)}</td></tr>`
    )
    .join("");
}

function badgeForStress(level) {
  const cls = level === "High" ? "badge-high" : level === "Medium" ? "badge-medium" : "badge-low";
  return `<span class="badge ${cls}">${level}</span>`;
}

// ---------------------------------------------------------------------------
// MY PLOTS
// ---------------------------------------------------------------------------
function renderPlotsGrid() {
  const grid = document.getElementById("plots-grid");
  if (state.plots.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><h3>No plots yet</h3><p>Add your first sugarcane plot to start receiving AI advisories.</p></div>`;
    return;
  }
  grid.innerHTML = state.plots
    .map(
      (p) => `
    <div class="plot-card">
      <div class="plot-card-head">
        <h4>${p.name}</h4>
        <span class="badge badge-info">${p.crop}</span>
      </div>
      <div class="plot-meta">
        <span>${p.area} acres</span>
        <span>${p.variety}</span>
        <span>${p.soilType} soil</span>
        <span>Planted ${p.plantingDate}</span>
      </div>
      <div class="plot-actions">
        <button class="btn btn-outline btn-sm" onclick="selectPlotAndGo('${p.id}','advisory')">View advisory</button>
        <button class="btn btn-ghost btn-sm" onclick="deletePlotConfirm('${p.id}')">Remove</button>
      </div>
    </div>`
    )
    .join("");
}

function selectPlotAndGo(id, view) {
  state.currentPlotId = id;
  document.getElementById("plot-select").value = id;
  loadView(view);
}

async function deletePlotConfirm(id) {
  const plot = state.plots.find((p) => p.id === id);
  if (!confirm(`Remove ${plot.name}? This deletes its sensor and irrigation history.`)) return;
  try {
    await api.deletePlot(id);
    state.plots = state.plots.filter((p) => p.id !== id);
    if (state.currentPlotId === id) state.currentPlotId = state.plots[0]?.id || null;
    populatePlotSelect();
    renderPlotsGrid();
    showToast("Plot removed.", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---------------------------------------------------------------------------
// IRRIGATION ADVISORY
// ---------------------------------------------------------------------------
async function renderAdvisory() {
  const plot = currentPlot();
  const [advisoryRes, { logs }, langs] = await Promise.all([
    api.getAdvisory(plot.id, state.lang),
    api.getIrrigationHistory(plot.id),
    api.getAdvisoryLanguages(),
  ]);

  const { advisory, farmerMessage, decisionBadge, trustIndicators, technicalDetails, explanationBullets } = advisoryRes;

  // Decision badge
  const badgeEl = document.getElementById("advisory-decision-badge");
  if (badgeEl && decisionBadge) {
    badgeEl.textContent = decisionBadge.label || decisionBadge.code;
    badgeEl.className = `decision-badge ${decisionBadge.code}`;
  }

  // Warning banner
  const warnBanner = document.getElementById("advisory-warning-banner");
  if (warnBanner) {
    const warnings = [];
    if (technicalDetails && technicalDetails.dataQualityStatus !== "VALID") {
      warnings.push(`Data Quality Notice: Telemetry data quality is flagged as ${technicalDetails.dataQualityStatus}. Recommendations may be restricted or default to fallback monitoring.`);
    }
    if (decisionBadge && decisionBadge.code === "INSUFFICIENT_DATA") {
      warnings.push(`Insufficient Data: Unable to calculate advisory safely due to missing or suspect sensor telemetry.`);
    }
    if (warnings.length > 0) {
      warnBanner.style.display = "block";
      warnBanner.innerHTML = warnings.map((w) => `<div><strong>Warning:</strong> ${w}</div>`).join("");
    } else {
      warnBanner.style.display = "none";
    }
  }

  document.getElementById("advisory-plot-name").textContent = plot.name;
  document.getElementById("advisory-farmer-text").textContent = farmerMessage;

  const shouldEl = document.getElementById("advisory-should");
  if (shouldEl) shouldEl.textContent = decisionBadge ? (decisionBadge.label || decisionBadge.code) : "MONITOR";

  const whenEl = document.getElementById("advisory-when");
  if (whenEl) {
    if (advisory.nextIrrigationInDays <= 0) whenEl.textContent = "Today / Immediately";
    else if (advisory.nextIrrigationInDays === 1) whenEl.textContent = "Tomorrow";
    else whenEl.textContent = `In ${advisory.nextIrrigationInDays} days (${advisory.nextIrrigationDate})`;
  }

  const volEl = document.getElementById("advisory-volume");
  if (volEl) volEl.textContent = `${advisory.waterVolumeM3} m³`;

  const durEl = document.getElementById("advisory-duration");
  if (durEl) durEl.textContent = `${advisory.recommendedDurationHours} hours`;

  if (document.getElementById("advisory-stage")) document.getElementById("advisory-stage").textContent = advisory.cropStage;
  if (document.getElementById("advisory-etc")) document.getElementById("advisory-etc").textContent = `${advisory.cropWaterRequirementMmPerDay} mm/day`;
  if (document.getElementById("advisory-riskloss")) document.getElementById("advisory-riskloss").textContent = `${advisory.yieldLossRiskPct}%`;

  document.getElementById("advisory-gauge").innerHTML = renderGauge({ pct: advisory.soilMoisturePct, size: 150, stroke: 14 });

  // Trust indicators bar
  const trustBar = document.getElementById("advisory-trust-bar");
  if (trustBar && trustIndicators) {
    const isLiveWeather = trustIndicators.weatherProvenance === "LIVE_API";
    trustBar.innerHTML = `
      <span class="trust-badge">Sensor data: ${trustIndicators.sensorProvenance === "SIMULATED" ? "Simulated demo data" : "Physical sensor"}</span>
      <span class="trust-badge ${isLiveWeather ? "weather-live" : ""}">Weather: ${isLiveWeather ? "Live weather forecast" : "Cached / Fallback weather"}</span>
      <span class="trust-badge">Decision engine: ${trustIndicators.engineLabel || "Agronomic calculation"}</span>
    `;
  }

  // Explanation bullets
  const expList = document.getElementById("advisory-explanation-list");
  if (expList && explanationBullets && explanationBullets.length > 0) {
    expList.innerHTML = explanationBullets.map((b) => `<li>${b}</li>`).join("");
  }

  // Technical details panel
  if (technicalDetails) {
    if (document.getElementById("tech-model-type")) document.getElementById("tech-model-type").textContent = technicalDetails.modelType || "AGRONOMIC_BASELINE";
    if (document.getElementById("tech-feature-version")) document.getElementById("tech-feature-version").textContent = technicalDetails.featureVersion || "v1.0-fao56";
    if (document.getElementById("tech-weather-provenance")) document.getElementById("tech-weather-provenance").textContent = technicalDetails.weatherProvenance || "LIVE_API";
    if (document.getElementById("tech-sensor-provenance")) document.getElementById("tech-sensor-provenance").textContent = technicalDetails.sensorProvenance || "SIMULATED";
    if (document.getElementById("tech-data-quality")) document.getElementById("tech-data-quality").textContent = technicalDetails.dataQualityStatus || "VALID";
    if (document.getElementById("tech-timestamp")) document.getElementById("tech-timestamp").textContent = technicalDetails.calculatedAt ? new Date(technicalDetails.calculatedAt).toLocaleString() : "—";
  }

  // Populate ML status & Experimental ML Analysis panel dynamically
  try {
    const [mlRes, mlPredRes] = await Promise.all([
      api.getMlStatus().catch(() => null),
      api.getMlPrediction(plot.id).catch(() => null),
    ]);

    if (mlRes && mlRes.data) {
      if (document.getElementById("tech-ml-status")) document.getElementById("tech-ml-status").textContent = mlRes.data.status || "INSUFFICIENT_HISTORICAL_DATA";
      if (document.getElementById("tech-ml-version")) document.getElementById("tech-ml-version").textContent = mlRes.data.modelVersion || "experimental-v1";
      if (document.getElementById("tech-ml-reason")) document.getElementById("tech-ml-reason").textContent = mlRes.data.reason || "Requires physical IoT hardware dataset.";
    }

    if (mlPredRes && mlPredRes.data && mlPredRes.data.mlExperimentation) {
      const mlExp = mlPredRes.data.mlExperimentation;
      const prov = mlPredRes.data.provenance || {};
      const pred = mlExp.prediction || {};

      if (document.getElementById("ml-status-badge")) {
        document.getElementById("ml-status-badge").textContent = mlExp.mlStatus || "EXPERIMENTAL_MODEL_TRAINED";
      }
      if (document.getElementById("ml-algorithm")) {
        document.getElementById("ml-algorithm").textContent = mlExp.algorithm || (mlExp.model && mlExp.model.algorithm) || "Linear Regression";
      }
      if (document.getElementById("ml-version")) {
        document.getElementById("ml-version").textContent = mlExp.modelVersion || (mlExp.model && mlExp.model.version) || "sugarcane-irrigation-v1";
      }
      if (document.getElementById("ml-prediction-val")) {
        const numVal = pred.value ?? pred.predictedWaterLitersPerDay;
        document.getElementById("ml-prediction-val").textContent = numVal
          ? `Experimental ML estimate: ${numVal.toLocaleString()} L/day (external dataset scale)`
          : "ML: Unavailable";
      }
      if (document.getElementById("ml-unit-scale")) {
        document.getElementById("ml-unit-scale").textContent = `${mlExp.unit || "LITERS_PER_DAY_DATASET_SCALE"} (Not directly comparable to KhetAI plot water volume)`;
      }
      if (document.getElementById("ml-comparability")) {
        document.getElementById("ml-comparability").textContent = mlExp.comparability || "NOT_DIRECTLY_COMPARABLE";
      }
      if (document.getElementById("ml-dataset-source")) {
        document.getElementById("ml-dataset-source").textContent = (mlExp.dataset && mlExp.dataset.source) || "External Sugarcane Research Dataset (Zenodo DOI: 10.5281/zenodo.19725692)";
      }
      if (document.getElementById("ml-dataset-origin")) {
        document.getElementById("ml-dataset-origin").textContent = (mlExp.dataset && mlExp.dataset.origin) || "MODEL_SIMULATED (CatBoost pipeline)";
      }
      if (document.getElementById("ml-r2-original")) {
        const origR2 = mlExp.metrics ? mlExp.metrics.originalScaleR2 : 0.8507;
        document.getElementById("ml-r2-original").textContent = `${origR2} (held-out test set R²)`;
      }
      if (document.getElementById("ml-r2-log")) {
        const logR2 = mlExp.metrics ? mlExp.metrics.logScaleR2 : 0.9421;
        document.getElementById("ml-r2-log").textContent = `${logR2} (held-out test set R²)`;
      }
      if (document.getElementById("ml-prov-sensor")) {
        document.getElementById("ml-prov-sensor").textContent = prov.sensor === "SIMULATED" ? "Simulated demo telemetry" : prov.sensor;
      }
      if (document.getElementById("ml-prov-weather")) {
        document.getElementById("ml-prov-weather").textContent = prov.weather === "LIVE_API" ? "Live Open-Meteo API" : "Cached / Fallback weather";
      }
    } else {
      if (document.getElementById("ml-prediction-val")) document.getElementById("ml-prediction-val").textContent = "ML: Unavailable";
      if (document.getElementById("ml-status-badge")) document.getElementById("ml-status-badge").textContent = "UNAVAILABLE";
    }
  } catch (e) {
    if (document.getElementById("ml-prediction-val")) document.getElementById("ml-prediction-val").textContent = "ML: Unavailable";
    if (document.getElementById("ml-status-badge")) document.getElementById("ml-status-badge").textContent = "UNAVAILABLE";
  }

  document.getElementById("advisory-lang-strip").innerHTML = langs.languages
    .map((l) => `<span class="lang-chip ${l.code === state.lang ? "active" : ""}" onclick="setLangAndReload('${l.code}')">${l.label}</span>`)
    .join("");

  const rows = [
    ["Crop age", `${advisory.cropAgeMonths} months`],
    ["Crop coefficient (Kc)", advisory.kc],
    ["Reference ET₀", `${advisory.et0MmPerDay} mm/day`],
    ["Field capacity", `${advisory.fieldCapacityPct}%`],
    ["Current soil moisture", `${advisory.soilMoisturePct}%`],
    ["Depletion vs. field capacity", `${advisory.depletionPct}%`],
    ["Net irrigation requirement", `${advisory.netIrrigationRequirementMm} mm`],
  ];
  document.querySelector("#advisory-breakdown-table tbody").innerHTML = rows
    .map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right; font-family:var(--font-mono);">${v}</td></tr>`)
    .join("");

  document.querySelector("#irrigation-history-table tbody").innerHTML = logs.length
    ? logs.slice(0, 8).map((l) => `<tr><td>${l.date}</td><td>${l.durationHours} hrs</td><td>${l.waterAppliedM3}</td></tr>`).join("")
    : `<tr><td colspan="3" style="color:var(--ink-soft)">No irrigation logged yet.</td></tr>`;
}

function bindAdvisoryControls() {
  document.querySelectorAll(".btn-scenario").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const scenario = btn.dataset.scenario;
      const plot = currentPlot();
      if (!plot) return;

      document.querySelectorAll(".btn-scenario").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      try {
        const res = await api.triggerScenario(plot.id, scenario);
        showToast(`Scenario triggered: ${res.scenarioLabel}`, "success");
        await renderAdvisory();
      } catch (err) {
        showToast(`Failed to trigger scenario: ${err.message}`, "error");
      }
    });
  });

  const toggleBtn = document.getElementById("technical-panel-toggle");
  const panel = document.getElementById("advisory-technical-panel");
  const arrow = document.getElementById("technical-panel-arrow");
  if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (arrow) arrow.textContent = panel.classList.contains("open") ? "▲" : "▼";
    });
  }
}


function setLangAndReload(code) {
  state.lang = UI_TRANSLATIONS[code] ? code : "en";
  document.getElementById("lang-select").value = state.lang;
  applyLanguage();
  localStorage.setItem("khet_lang", state.lang);
  renderAdvisory();
}

function bindForms() {
  document.getElementById("log-irrigation-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const plot = currentPlot();
    const durationHours = document.getElementById("log-duration").value;
    const waterAppliedM3 = document.getElementById("log-water").value;
    try {
      await api.logIrrigation(plot.id, { durationHours, waterAppliedM3 });
      showToast("Irrigation logged.", "success");
      renderAdvisory();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// ---------------------------------------------------------------------------
// WEATHER
// ---------------------------------------------------------------------------
async function renderWeather() {
  const plot = currentPlot();
  const forecast = await api.getWeather(plot.id);
  const source = forecast.days[0]?.source === "open-meteo" ? "Live data from Open-Meteo" : "Simulated forecast (offline fallback)";
  document.getElementById("weather-source-note").textContent = source;

  document.getElementById("weather-cards").innerHTML = forecast.days
    .map(
      (d, i) => `
    <div class="card" style="padding:16px; text-align:center;">
      <div style="font-size:12px; color:var(--ink-soft); font-family:var(--font-mono);">${i === 0 ? "Today" : d.date.slice(5)}</div>
      <div style="font-size:22px; margin:10px 0 4px; font-family:var(--font-mono); color:var(--cane-green-dark);">${Math.round(d.tempMax)}°</div>
      <div style="font-size:12px; color:var(--ink-soft);">${Math.round(d.tempMin)}° min</div>
      <div style="margin-top:8px;"><span class="badge ${d.rainProbability > 55 ? "badge-info" : "badge-low"}">${d.rainProbability}% rain</span></div>
      <div style="margin-top:6px; font-size:11.5px; color:var(--ink-soft);">${d.condition}</div>
    </div>`
    )
    .join("");

  if (!state.leafletMap) {
    state.leafletMap = L.map("weather-map", { zoomControl: false, attributionControl: false }).setView([plot.lat, plot.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(state.leafletMap);
    state.leafletMarker = L.marker([plot.lat, plot.lng]).addTo(state.leafletMap).bindPopup(plot.name);
  } else {
    state.leafletMap.setView([plot.lat, plot.lng], 12);
    state.leafletMarker.setLatLng([plot.lat, plot.lng]).bindPopup(plot.name);
    setTimeout(() => state.leafletMap.invalidateSize(), 200);
  }
}

// ---------------------------------------------------------------------------
// SOIL & SENSORS
// ---------------------------------------------------------------------------
async function renderSensors() {
  const plot = currentPlot();
  const { latest, history } = await api.getSensors(plot.id);

  const kpis = [
    { label: "Soil moisture (30cm)", value: `${latest.soilMoisture30}%` },
    { label: "Soil moisture (60cm)", value: `${latest.soilMoisture60}%` },
    { label: "Soil temperature", value: `${latest.soilTempC}°C` },
    { label: "NDVI (crop health)", value: latest.ndvi },
  ];
  document.getElementById("sensor-kpis").innerHTML = kpis
    .map((k) => `<div class="card kpi"><span class="label">${k.label}</span><b>${k.value}</b></div>`)
    .join("");

  drawLineChart("sensor-chart", {
    labels: history.map((h) => h.date.slice(5)),
    datasets: [
      { label: "Soil moisture 30cm (%)", data: history.map((h) => h.soilMoisture30), color: CHART_COLORS.green },
      { label: "Soil moisture 60cm (%)", data: history.map((h) => h.soilMoisture60), color: CHART_COLORS.blue },
      { label: "Soil temperature (°C)", data: history.map((h) => h.soilTempC), color: CHART_COLORS.gold, dashed: true },
    ],
  });
}

// ---------------------------------------------------------------------------
// FERTIGATION
// ---------------------------------------------------------------------------
async function renderFertigation() {
  const plot = currentPlot();
  const { plan } = await api.getFertigation(plot.id);

  document.getElementById("fert-stage-title").textContent = `Fertigation Plan — ${plan.stage}`;
  document.getElementById("fert-note").textContent = plan.note;
  document.getElementById("fert-apply-date").textContent = plan.applyWithIrrigationOn;

  document.getElementById("fert-list").innerHTML = [
    ["Urea", plan.totalForPlot.ureaKg],
    ["DAP", plan.totalForPlot.dapKg],
    ["MOP (Potash)", plan.totalForPlot.mopKg],
  ]
    .map(([name, val]) => `<div class="fertigation-row"><span>${name} — total for ${plot.area} acres</span><b>${val} kg</b></div>`)
    .join("");

  document.querySelector("#fert-per-acre-table tbody").innerHTML = [
    ["Urea", plan.perAcre.ureaKg],
    ["DAP", plan.perAcre.dapKg],
    ["MOP (Potash)", plan.perAcre.mopKg],
  ]
    .map(([name, val]) => `<tr><td>${name}</td><td style="text-align:right; font-family:var(--font-mono);">${val}</td></tr>`)
    .join("");

  const warnBox = document.getElementById("fert-warning");
  if (plan.warning) {
    warnBox.textContent = plan.warning;
    warnBox.style.display = "block";
  } else {
    warnBox.style.display = "none";
  }
}

// ---------------------------------------------------------------------------
// YIELD PREDICTION
// ---------------------------------------------------------------------------
async function renderYieldView() {
  const plot = currentPlot();
  const { prediction, historicalStressAvg } = await api.getYield(plot.id);

  document.getElementById("yield-value").textContent = prediction.predictedYieldTPerHa;
  document.getElementById("yield-range").textContent = `${prediction.rangeLowTPerHa} – ${prediction.rangeHighTPerHa}`;
  document.getElementById("yield-confidence-note").textContent = prediction.confidenceNote;

  drawBarChart("yield-chart", {
    labels: ["Low estimate", "Predicted", "High estimate"],
    data: [prediction.rangeLowTPerHa, prediction.predictedYieldTPerHa, prediction.rangeHighTPerHa],
  });

  document.getElementById("yield-stress-gauge").innerHTML = renderGauge({
    pct: historicalStressAvg,
    size: 160,
    stroke: 14,
    zones: [{ upTo: 33, color: "#2f7d5a" }, { upTo: 66, color: "#c98a2c" }, { upTo: 100, color: "#b8442f" }],
  });
}

// ---------------------------------------------------------------------------
// ALERTS
// ---------------------------------------------------------------------------
async function renderAlerts() {
  const { alerts } = await api.getAlerts();
  const unread = alerts.filter((a) => !a.read).length;
  document.getElementById("alert-count-badge").textContent = unread > 0 ? unread : "";

  const list = document.getElementById("alerts-list");
  if (alerts.length === 0) {
    list.innerHTML = `<div class="empty-state"><h3>All clear</h3><p>No alerts across your plots right now.</p></div>`;
    return;
  }
  list.innerHTML = alerts
    .map(
      (a) => `
    <div class="alert-item ${a.read ? "is-read" : ""}">
      <span class="alert-dot ${a.severity}"></span>
      <div style="flex:1;">
        <div><b>${a.type}</b> — ${a.plotName}</div>
        <div>${a.message}</div>
        <div class="meta">${a.date}</div>
      </div>
      ${!a.read ? `<button class="btn btn-ghost btn-sm" onclick="markRead('${a.id}')">Mark read</button>` : ""}
    </div>`
    )
    .join("");
}

async function markRead(id) {
  await api.markAlertRead(id);
  renderAlerts();
}

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------
function renderSettings() {
  const u = state.user;
  document.getElementById("settings-name").textContent = u.name;
  document.getElementById("settings-mobile").textContent = u.mobile;
  document.getElementById("settings-village").textContent = u.village || "—";
  document.getElementById("settings-taluk").textContent = u.taluk || "—";
  document.getElementById("settings-district").textContent = u.district || "—";
  document.getElementById("settings-since").textContent = new Date(u.createdAt).toLocaleDateString();
  const units = localStorage.getItem("khet_units") || "metric";
  document.getElementById("settings-language").value = state.lang;
  document.getElementById("settings-units").value = units;
  ["plain-language-toggle", "irrigation-notifications", "rain-notifications", "sensor-notifications"].forEach((id) => {
    const saved = localStorage.getItem(`khet_${id}`);
    if (saved !== null) document.getElementById(id).checked = saved === "true";
  });
}

function bindSettings() {
  document.getElementById("settings-language").addEventListener("change", (e) => {
    state.lang = UI_TRANSLATIONS[e.target.value] ? e.target.value : "en";
    localStorage.setItem("khet_lang", state.lang);
    applyLanguage();
    loadView("settings");
  });
  document.getElementById("settings-units").addEventListener("change", (e) => localStorage.setItem("khet_units", e.target.value));
  ["plain-language-toggle", "irrigation-notifications", "rain-notifications", "sensor-notifications"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (e) => localStorage.setItem(`khet_${id}`, e.target.checked));
  });
  document.getElementById("edit-profile-btn").addEventListener("click", () => showToast("Profile editing will be available in a future update."));
  document.getElementById("download-data-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ user: state.user, plots: state.plots }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "khetai-my-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  document.getElementById("change-password-btn").addEventListener("click", () => showToast("Password reset is not connected yet."));
  document.getElementById("sign-out-all-btn").addEventListener("click", () => { Auth.clear(); window.location.href = "login.html"; });
  document.getElementById("delete-account-btn").addEventListener("click", () => showToast("Please contact an administrator to delete your account.", "error"));
}

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------
function drawLineChart(canvasId, { labels, datasets }) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: datasets.map((d) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color + "22",
        borderDash: d.dashed ? [5, 4] : [],
        tension: 0.35,
        fill: datasets.length === 1,
        pointRadius: 2,
      })),
    },
    options: {
      responsive: true,
      plugins: { legend: { display: datasets.length > 1, labels: { font: { family: "Inter", size: 11 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: CHART_COLORS.grid } },
      },
    },
  });
}

function drawBarChart(canvasId, { labels, data }) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (state.charts[canvasId]) state.charts[canvasId].destroy();
  state.charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data, backgroundColor: [CHART_COLORS.gold + "aa", CHART_COLORS.green, CHART_COLORS.blue + "aa"], borderRadius: 8 }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: CHART_COLORS.grid } } },
    },
  });
}

init();
