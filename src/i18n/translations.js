/**
 * Translation strings for the Khmer TTS app.
 * Languages: Khmer (km), English (en), Chinese (zh), French (fr).
 *
 * Keep keys flat for easy lookup with t(key).
 * If a key is missing in a language, the English value is used as a fallback.
 */

const translations = {
  en: {
    // Topbar menu items
    "menu.research": "Research",
    "menu.feedback": "Feedback",
    "menu.about": "About",
    "menu.language": "Language",

    // Language names
    "lang.km": "Khmer",
    "lang.en": "English",
    "lang.zh": "Chinese",
    "lang.fr": "French",

    // Theme
    "theme.toLight": "Switch to light mode",
    "theme.toDark": "Switch to dark mode",
    "theme.toggle": "Toggle dark/light theme",

    // Landing header + examples
    "home.tryExample": "Try an example",

    // Controls
    "controls.aiModel": "AI Model",
    "controls.voice": "Voice",

    // Voice options
    "voice.shortAudio": "Short Audio",
    "voice.audioBook": "AudioBook",
    "voice.storyTelling": "Story Telling",

    // Text input
    "input.label": "Text to Speech",
    "input.placeholder": "Type Khmer text here…",

    // Actions
    "action.clear": "Clear",
    "action.clearTitle": "Clear text and audio",
    "action.generate": "Generate Speech",
    "action.generating": "Synthesizing Speech…",

    // Errors
    "error.empty": "Please enter text to generate speech",
    "error.noUrl": "No audio URL received from server",
    "error.backendFailed": "Audio generation failed on backend",
    "error.timeout": "Audio generation timed out (5+ minutes)",
    "error.generic": "Failed to generate audio. Please try again.",

    // Audio player
    "player.label": "Generated Speech",
    "player.download": "Download audio",
    "player.play": "Play",
    "player.pause": "Pause",
    "player.audioError": "Error loading audio file",
    "player.invalidUrl": "Invalid audio URL",
    "player.controlError": "Error controlling playback",
    "player.downloadFailed": "Download failed",
  },

  km: {
    "menu.research": "ស្រាវជ្រាវ",
    "menu.feedback": "មតិយោបល់",
    "menu.about": "អំពី​យើង",
    "menu.language": "ភាសា",

    "lang.km": "ភាសាខ្មែរ",
    "lang.en": "ភាសាអង់គ្លេស",
    "lang.zh": "ភាសាចិន",
    "lang.fr": "ភាសាបារាំង",

    "theme.toLight": "ប្តូរទៅផ្ទៃភ្លឺ",
    "theme.toDark": "ប្តូរទៅផ្ទៃងងឹត",
    "theme.toggle": "ប្តូរផ្ទៃងងឹត / ភ្លឺ",

    "home.tryExample": "សាកល្បងជាមួយឧទាហរណ៍",

    "controls.aiModel": "ម៉ូដែល AI",
    "controls.voice": "សំឡេង",

    "voice.shortAudio": "សំឡេងខ្លី",
    "voice.audioBook": "សៀវភៅសំឡេង",
    "voice.storyTelling": "ការនិទានរឿង",

    "input.label": "បំប្លែងអក្សរទៅជាសំឡេង",
    "input.placeholder": "សូមវាយអក្សរខ្មែរនៅទីនេះ…",

    "action.clear": "សម្អាត",
    "action.clearTitle": "សម្អាតអក្សរ និងសំឡេង",
    "action.generate": "បង្កើតសំឡេង",
    "action.generating": "កំពុងបង្កើតសំឡេង…",

    "error.empty": "សូមវាយអក្សរ ដើម្បីបង្កើតសំឡេង",
    "error.noUrl": "មិនអាចទទួលបាន URL សំឡេងពីម៉ាស៊ីនមេឡើយ",
    "error.backendFailed": "ការបង្កើតសំឡេងបានបរាជ័យ",
    "error.timeout": "ការបង្កើតសំឡេងលើសពេលកំណត់ (លើស ៥ នាទី)",
    "error.generic": "មិនអាចបង្កើតសំឡេងបានទេ ​សូមព្យាយាមម្តងទៀត",

    "player.label": "សំឡេងដែលបានបង្កើត",
    "player.download": "ទាញយកសំឡេង",
    "player.play": "ចាក់",
    "player.pause": "ផ្អាក",
    "player.audioError": "មានបញ្ហាក្នុងការផ្ទុកឯកសារសំឡេង",
    "player.invalidUrl": "URL សំឡេងមិនត្រឹមត្រូវ",
    "player.controlError": "មានបញ្ហាក្នុងការគ្រប់គ្រងការចាក់",
    "player.downloadFailed": "ការទាញយកបានបរាជ័យ",
  },

  zh: {
    "menu.research": "研究",
    "menu.feedback": "反馈",
    "menu.about": "关于",
    "menu.language": "语言",

    "lang.km": "高棉语",
    "lang.en": "英语",
    "lang.zh": "中文",
    "lang.fr": "法语",

    "theme.toLight": "切换到浅色模式",
    "theme.toDark": "切换到深色模式",
    "theme.toggle": "切换深色／浅色主题",

    "home.tryExample": "试试示例",

    "controls.aiModel": "AI 模型",
    "controls.voice": "声音",

    "voice.shortAudio": "短音频",
    "voice.audioBook": "有声书",
    "voice.storyTelling": "故事朗读",

    "input.label": "文字转语音",
    "input.placeholder": "请在此输入高棉语文本…",

    "action.clear": "清除",
    "action.clearTitle": "清除文本和音频",
    "action.generate": "生成语音",
    "action.generating": "正在合成语音…",

    "error.empty": "请输入要生成语音的文本",
    "error.noUrl": "未从服务器收到音频地址",
    "error.backendFailed": "后端语音生成失败",
    "error.timeout": "语音生成超时（超过 5 分钟）",
    "error.generic": "语音生成失败，请重试。",

    "player.label": "生成的语音",
    "player.download": "下载音频",
    "player.play": "播放",
    "player.pause": "暂停",
    "player.audioError": "加载音频文件出错",
    "player.invalidUrl": "无效的音频地址",
    "player.controlError": "播放控制出错",
    "player.downloadFailed": "下载失败",
  },

  fr: {
    "menu.research": "Recherche",
    "menu.feedback": "Commentaires",
    "menu.about": "À propos",
    "menu.language": "Langue",

    "lang.km": "Khmer",
    "lang.en": "Anglais",
    "lang.zh": "Chinois",
    "lang.fr": "Français",

    "theme.toLight": "Passer en mode clair",
    "theme.toDark": "Passer en mode sombre",
    "theme.toggle": "Basculer le thème clair / sombre",

    "home.tryExample": "Essayer un exemple",

    "controls.aiModel": "Modèle IA",
    "controls.voice": "Voix",

    "voice.shortAudio": "Audio court",
    "voice.audioBook": "Livre audio",
    "voice.storyTelling": "Narration",

    "input.label": "Texte à synthétiser",
    "input.placeholder": "Saisissez le texte khmer ici…",

    "action.clear": "Effacer",
    "action.clearTitle": "Effacer le texte et l’audio",
    "action.generate": "Générer la voix",
    "action.generating": "Synthèse en cours…",

    "error.empty": "Veuillez saisir un texte à synthétiser",
    "error.noUrl": "Aucune URL audio reçue du serveur",
    "error.backendFailed": "La génération audio a échoué côté serveur",
    "error.timeout": "Génération audio expirée (plus de 5 minutes)",
    "error.generic": "Échec de la génération audio. Veuillez réessayer.",

    "player.label": "Voix générée",
    "player.download": "Télécharger l’audio",
    "player.play": "Lire",
    "player.pause": "Pause",
    "player.audioError": "Erreur de chargement du fichier audio",
    "player.invalidUrl": "URL audio invalide",
    "player.controlError": "Erreur de contrôle de la lecture",
    "player.downloadFailed": "Échec du téléchargement",
  },
};

export const SUPPORTED_LANGUAGES = [
  { value: "km", labelKey: "lang.km" },
  { value: "en", labelKey: "lang.en" },
  { value: "zh", labelKey: "lang.zh" },
  { value: "fr", labelKey: "lang.fr" },
];

export default translations;