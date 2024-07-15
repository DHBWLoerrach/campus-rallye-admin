import { mergeTranslations } from "ra-core";
import polyglotI18nProvider from "ra-i18n-polyglot";
import de from "./ra-language-german";
import { raSupabaseGermanMessages } from "./ra-supabase-language-german";

const allGermanMessages = mergeTranslations(de, raSupabaseGermanMessages);

export const i18nProvider = polyglotI18nProvider(() => allGermanMessages, "de");
