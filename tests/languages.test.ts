import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  INVITATION_TRANSLATIONS,
  getTranslations,
  buildLocalizedInviteText,
  type SupportedLanguage,
} from "@/lib/languages";

describe("Invitation Languages & Translations", () => {
  const languageCodes: SupportedLanguage[] = ["en", "hi", "ur", "te"];

  it("supports exactly 4 languages: English, Hindi, Urdu, and Telugu", () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(["en", "hi", "ur", "te"]);

    const nativeLabels = SUPPORTED_LANGUAGES.map((l) => l.nativeLabel);
    expect(nativeLabels).toContain("English");
    expect(nativeLabels).toContain("हिन्दी");
    expect(nativeLabels).toContain("اردو");
    expect(nativeLabels).toContain("తెలుగు");
  });

  it("sets correct text direction: rtl for Urdu, ltr for English, Hindi, and Telugu", () => {
    const urdu = SUPPORTED_LANGUAGES.find((l) => l.code === "ur");
    expect(urdu?.dir).toBe("rtl");

    const english = SUPPORTED_LANGUAGES.find((l) => l.code === "en");
    expect(english?.dir).toBe("ltr");

    const hindi = SUPPORTED_LANGUAGES.find((l) => l.code === "hi");
    expect(hindi?.dir).toBe("ltr");

    const telugu = SUPPORTED_LANGUAGES.find((l) => l.code === "te");
    expect(telugu?.dir).toBe("ltr");
  });

  it("has complete translations for all required fixed ceremonial phrases across all languages", () => {
    for (const code of languageCodes) {
      const phrases = INVITATION_TRANSLATIONS[code];
      expect(phrases).toBeDefined();

      // Core phrases required by user specification:
      expect(phrases.youreInvited).toBeTruthy();
      expect(phrases.invitesYouToCelebrate).toBeTruthy();
      expect(phrases.wouldLoveToHaveYou).toBeTruthy();

      // Additional UI & invite labels:
      expect(phrases.joinCelebration).toBeTruthy();
      expect(phrases.dateLabel).toBeTruthy();
      expect(phrases.venueLabel).toBeTruthy();
      expect(phrases.traditionsLabel).toBeTruthy();
      expect(phrases.themeLabel).toBeTruthy();
      expect(phrases.invitationHeader).toBeTruthy();
      expect(phrases.closingWish).toBeTruthy();
      expect(phrases.copyButton).toBeTruthy();
      expect(phrases.copiedButton).toBeTruthy();
    }
  });

  it("buildLocalizedInviteText translates fixed phrases while never translating user text", () => {
    const customUserInputs = {
      hostName: "Aarav & Meera",
      eventType: "wedding",
      eventDate: "2027-12-25",
      city: "Jaipur Palace",
      vibeOrTheme: "Royal Marigold & Velvet",
      cultureOrTradition: "Rajasthani Royal Wedding",
    };

    // English
    const enText = buildLocalizedInviteText(customUserInputs, "en");
    expect(enText).toContain("Aarav & Meera invites you to celebrate");
    expect(enText).toContain("We would love to have you with us");
    expect(enText).toContain("Jaipur Palace");
    expect(enText).toContain("Royal Marigold & Velvet");

    // Hindi
    const hiText = buildLocalizedInviteText(customUserInputs, "hi");
    expect(hiText).toContain(
      "Aarav & Meera आपको उत्सव में सम्मिलित होने के लिए आमंत्रित करते हैं"
    );
    expect(hiText).toContain(
      "आपकी गरिमामयी उपस्थिति हमारे लिए अत्यंत हर्ष का विषय होगी"
    );
    // User text preserved verbatim:
    expect(hiText).toContain("Jaipur Palace");
    expect(hiText).toContain("Royal Marigold & Velvet");

    // Urdu (RTL script)
    const urText = buildLocalizedInviteText(customUserInputs, "ur");
    expect(urText).toContain(
      "Aarav & Meera آپ کو تقریب میں شرکت کی دلی دعوت پیش کرتے ہیں"
    );
    expect(urText).toContain("ہمیں آپ کی پرخلوص شرکت پر بے حد خوشی ہوگی");
    // User text preserved verbatim:
    expect(urText).toContain("Jaipur Palace");
    expect(urText).toContain("Royal Marigold & Velvet");

    // Telugu
    const teText = buildLocalizedInviteText(customUserInputs, "te");
    expect(teText).toContain(
      "Aarav & Meera వేడుకలో పాల్గొనాల్సిందిగా మిమ్మల్ని ఆహ్వానిస్తున్నారు"
    );
    expect(teText).toContain(
      "మీరు మాతో కలిసి ఈ వేడుకను జరుపుకుంటే మాకెంతో సంతోషం"
    );
    // User text preserved verbatim:
    expect(teText).toContain("Jaipur Palace");
    expect(teText).toContain("Royal Marigold & Velvet");
  });

  it("builds fallback invite text gracefully when host name is omitted", () => {
    const noHostInputs = {
      eventType: "birthday",
      eventDate: "2027-08-10",
      city: "Bengaluru",
    };

    const enText = buildLocalizedInviteText(noHostInputs, "en");
    expect(enText).toContain("You're invited to join the celebration of");

    const hiText = buildLocalizedInviteText(noHostInputs, "hi");
    expect(hiText).toContain("आप सादर आमंत्रित हैं");

    const urText = buildLocalizedInviteText(noHostInputs, "ur");
    expect(urText).toContain("آپ کو دلی دعوت ہے");

    const teText = buildLocalizedInviteText(noHostInputs, "te");
    expect(teText).toContain("మీకు సాదర ఆహ్వానం");
  });
});
