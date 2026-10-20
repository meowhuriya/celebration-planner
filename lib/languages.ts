/**
 * Multilingual Invitation Translations
 * NOTE: These translations of fixed ceremonial phrases should be reviewed by a native speaker for cultural nuance.
 */

import type { InviteCardData } from "./invitation";
import { formatInviteDate, formatEventHeadline } from "./invitation";

export type SupportedLanguage = "en" | "hi" | "ur" | "te";

export interface LanguageConfig {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
  fontClass: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    dir: "ltr",
    fontClass: "",
  },
  {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    dir: "ltr",
    fontClass: "font-devanagari",
  },
  {
    code: "ur",
    label: "Urdu",
    nativeLabel: "اردو",
    dir: "rtl",
    fontClass: "font-urdu",
  },
  {
    code: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    dir: "ltr",
    fontClass: "font-telugu",
  },
];

export interface FixedPhrases {
  youreInvited: string;
  invitesYouToCelebrate: string;
  wouldLoveToHaveYou: string;
  joinCelebration: string;
  badgeWedding: string;
  badgeBirthday: string;
  badgeCommunity: string;
  badgeOther: string;
  dateLabel: string;
  venueLabel: string;
  traditionsLabel: string;
  themeLabel: string;
  selectDateHint: string;
  invitationHeader: string;
  closingWish: string;
  copyButton: string;
  copiedButton: string;
  whatsAppButton: string;
  printButton: string;
}

/**
 * Static map translating ONLY fixed ceremonial phrases.
 * User-entered strings (hostName, city, vibe, culture) are strictly preserved as-is.
 * NOTE: These translations should be reviewed by a native speaker for cultural nuance.
 */
export const INVITATION_TRANSLATIONS: Record<SupportedLanguage, FixedPhrases> =
  {
    en: {
      youreInvited: "You're invited",
      invitesYouToCelebrate: "invites you to celebrate",
      wouldLoveToHaveYou: "We would love to have you with us",
      joinCelebration: "to join the celebration of",
      badgeWedding: "✨ Cordially Invited ✨",
      badgeBirthday: "🎈 Celebration Invite 🎈",
      badgeCommunity: "🤝 Community Gathering 🤝",
      badgeOther: "🌟 Special Invitation 🌟",
      dateLabel: "Date",
      venueLabel: "Venue / City",
      traditionsLabel: "Traditions",
      themeLabel: "Theme",
      selectDateHint: "Select a date in the form",
      invitationHeader: "✨ INVITATION ✨",
      closingWish: "Please join us to make this day truly memorable! 💫",
      copyButton: "Copy Invite Text",
      copiedButton: "Copied!",
      whatsAppButton: "WhatsApp",
      printButton: "Print / PDF",
    },
    hi: {
      youreInvited: "आप सादर आमंत्रित हैं",
      invitesYouToCelebrate:
        "आपको उत्सव में सम्मिलित होने के लिए आमंत्रित करते हैं",
      wouldLoveToHaveYou:
        "आपकी गरिमामयी उपस्थिति हमारे लिए अत्यंत हर्ष का विषय होगी",
      joinCelebration: "उत्सव के पावन अवसर पर सम्मिलित होने के लिए",
      badgeWedding: "✨ सादर आमंत्रण ✨",
      badgeBirthday: "🎈 जन्मोत्सव आमंत्रण 🎈",
      badgeCommunity: "🤝 समुदाय सम्मेलन 🤝",
      badgeOther: "🌟 विशेष आमंत्रण 🌟",
      dateLabel: "दिनांक",
      venueLabel: "स्थान / शहर",
      traditionsLabel: "परंपराएं",
      themeLabel: "थीम",
      selectDateHint: "फ़ॉर्म में दिनांक चुनें",
      invitationHeader: "✨ निमंत्रण पत्र ✨",
      closingWish:
        "कृपया हमारे साथ सम्मिलित होकर इस दिन को अविस्मरणीय बनाएं! 💫",
      copyButton: "निमंत्रण कॉपी करें",
      copiedButton: "कॉपी हो गया!",
      whatsAppButton: "व्हाट्सएप",
      printButton: "प्रिंट / PDF",
    },
    ur: {
      youreInvited: "آپ کو دلی دعوت ہے",
      invitesYouToCelebrate: "آپ کو تقریب میں شرکت کی دلی دعوت پیش کرتے ہیں",
      wouldLoveToHaveYou: "ہمیں آپ کی پرخلوص شرکت پر بے حد خوشی ہوگی",
      joinCelebration: "جشن کی پُرمسرت تقریب میں شرکت کے لیے",
      badgeWedding: "✨ پُرخلوص دعوت نامہ ✨",
      badgeBirthday: "🎈 جشن سالگرہ کی دعوت 🎈",
      badgeCommunity: "🤝 باہمی اجتماع 🤝",
      badgeOther: "🌟 خصوصی دعوت نامہ 🌟",
      dateLabel: "تاریخ",
      venueLabel: "مقام / شہر",
      traditionsLabel: "روایات",
      themeLabel: "تھیم",
      selectDateHint: "فارم میں تاریخ کا انتخاب کریں",
      invitationHeader: "✨ دعوت نامہ ✨",
      closingWish: "براہ کرم تشریف لا کر اس تقریب کو یادگار بنائیں! 💫",
      copyButton: "دعوت نامہ کاپی کریں",
      copiedButton: "کاپی ہو گیا!",
      whatsAppButton: "واٹس ایپ",
      printButton: "پرنٹ / PDF",
    },
    te: {
      youreInvited: "మీకు సాదర ఆహ్వానం",
      invitesYouToCelebrate:
        "వేడుకలో పాల్గొనాల్సిందిగా మిమ్మల్ని ఆహ్వానిస్తున్నారు",
      wouldLoveToHaveYou: "మీరు మాతో కలిసి ఈ వేడుకను జరుపుకుంటే మాకెంతో సంతోషం",
      joinCelebration: "వేడుకలో ఆనందంగా పాలుపంచుకోవడానికి",
      badgeWedding: "✨ శుభ ఆహ్వానం ✨",
      badgeBirthday: "🎈 పుట్టినరోజు వేడుక ఆహ్వానం 🎈",
      badgeCommunity: "🤝 సామూహిక కలయిక 🤝",
      badgeOther: "🌟 ప్రత్యేక ఆహ్వానం 🌟",
      dateLabel: "తేదీ",
      venueLabel: "వేదిక / నగరం",
      traditionsLabel: "సంప్రదాయాలు",
      themeLabel: "థీమ్",
      selectDateHint: "ఫారమ్‌లో తేదీని ఎంచుకోండి",
      invitationHeader: "✨ ఆహ్వాన పత్రిక ✨",
      closingWish: "దయచేసి హాజరై ఈ రోజును మరింత చిరస్మరణీయంగా మార్చండి! 💫",
      copyButton: "ఆహ్వానాన్ని కాపీ చేయండి",
      copiedButton: "కాపీ అయ్యింది!",
      whatsAppButton: "వాట్సాప్",
      printButton: "ప్రింట్ / PDF",
    },
  };

/**
 * Helper to get phrases for a language with English fallback
 */
export function getTranslations(lang: SupportedLanguage = "en"): FixedPhrases {
  return INVITATION_TRANSLATIONS[lang] ?? INVITATION_TRANSLATIONS.en;
}

/**
 * Returns the badge label for the card theme variant in the selected language
 */
export function getBadgeLabel(
  variant: "wedding" | "birthday" | "community" | "other",
  lang: SupportedLanguage = "en"
): string {
  const t = getTranslations(lang);
  switch (variant) {
    case "wedding":
      return t.badgeWedding;
    case "birthday":
      return t.badgeBirthday;
    case "community":
      return t.badgeCommunity;
    default:
      return t.badgeOther;
  }
}

/**
 * Pure function that generates localized invite plain-text for clipboard and WhatsApp sharing.
 * Strictly translates only the fixed ceremonial boilerplate; preserves user text as entered.
 */
export function buildLocalizedInviteText(
  data: InviteCardData,
  lang: SupportedLanguage = "en"
): string {
  const t = getTranslations(lang);
  const host = data.hostName?.trim();
  const headline = formatEventHeadline(data.eventType, data.cultureOrTradition);
  const dateFormatted = formatInviteDate(data.eventDate);
  const city = data.city?.trim();
  const theme = data.vibeOrTheme?.trim();
  const tradition = data.cultureOrTradition?.trim();

  const lines: string[] = [t.invitationHeader, ""];

  if (host) {
    lines.push(`${host} ${t.invitesYouToCelebrate}`);
  } else {
    lines.push(`${t.youreInvited} ${t.joinCelebration}`);
  }

  lines.push(`🎉 ${headline.toUpperCase()} 🎉`, "");

  if (dateFormatted) {
    lines.push(`📅 ${t.dateLabel}: ${dateFormatted}`);
  }
  if (data.venueName?.trim()) {
    lines.push(`🏛️ ${data.venueName.trim()}`);
  }
  if (city) {
    lines.push(`📍 ${t.venueLabel}: ${city}`);
  }
  if (data.dressCode?.trim()) {
    lines.push(`👔 Dress code: ${data.dressCode.trim()}`);
  }
  if (tradition) {
    lines.push(`🪔 ${t.traditionsLabel}: ${tradition}`);
  }
  if (theme) {
    lines.push(`🎨 ${t.themeLabel}: ${theme}`);
  }

  lines.push("");
  lines.push(`"${t.wouldLoveToHaveYou}."`);
  lines.push(t.closingWish);

  return lines.join("\n");
}
