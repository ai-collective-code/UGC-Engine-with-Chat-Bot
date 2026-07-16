# -*- coding: utf-8 -*-
"""
Message templates, one per supported language. Kept short (DM/WhatsApp
length), informal-respectful register, one clear CTA.

{name}, {niche}, {brand}, {offer} are filled in per creator/client.
{offer} comes from the client config -- do NOT hardcode compensation
details here, they change per client/campaign.

IMPORTANT: Templates for Odia, Assamese and Bengali are best-effort.
Have a native speaker skim a sample before a real mass send -- cheap
insurance against a tone-deaf message going to hundreds of people.
"""

TEMPLATES = {
    "Hindi": (
        "Namaste {name} ji! 👋 Aapke {niche} wale posts Instagram par dekhe, "
        "kaam bahut solid hai. Hum {brand} ke saath ek creator program chala rahe hain — "
        "aap jaise mistri/mason bhaiyon ke real site videos chahiye. {offer} "
        "Agar interested hain to reply kar dein, hum details bhej dete hain."
    ),
    "Gujarati": (
        "Namaste {name} ji! 👋 Tamara {niche} na posts Instagram par joya, kaam khoob saras che. "
        "Ame {brand} sathe ek creator program chalavi rahiya chhiye — tamara jeva mistri/mason "
        "bhaiona real site video joie che. {offer} Interested ho to reply karo, ame details mokli dishu."
    ),
    "Marathi": (
        "Namaskar {name} ji! 👋 Tumche {niche} chi posts Instagram var pahili, kaam kharach chaan aahe. "
        "Aamhi {brand} sobat ek creator program chalvat aahot — tumhi sarkhya mistri/mason bandhavanche "
        "khare site video havet. {offer} Interested asal tar reply kara, aamhi details pathavto."
    ),
    "Telugu": (
        "Namaskaram {name} garu! 👋 Mee {niche} posts Instagram lo chusanu, pani chala bagunnadi. "
        "Memu {brand} tho కలిసి ఒక creator program chesthunnamu — mee lanti mistri/mason bandhuvula "
        "real site videos kavali. {offer} Interested unte reply cheyandi, details pampistham."
    ),
    "Odia": (
        "Namaskar {name} ji! 👋 Apananka {niche} posts Instagram re dekhili, kaam khub bhala achhi. "
        "Amemane {brand} sathire ekta creator program chalauchhu — apananka bhali mistri/mason "
        "bhai manankara asali site video darkar. {offer} Interested hele reply karantu, amme details deba."
    ),
    "Assamese": (
        "Namaskar {name} ji! 👋 Apunar {niche} r post Instagram-t dekhisilu, kaam bhal hoise. "
        "Ami {brand} r sathe ekta creator program chalai asu — apunar dore mistri/mason bhai-eskolar "
        "asol site video lagе. {offer} Interested hole reply koribo, ami details pathai dim."
    ),
    "Bengali": (
        "Namaskar {name} ji! 👋 Apnar {niche} er post Instagram-e dekhlam, kaj khub bhalo hoyeche. "
        "Amra {brand} er sathe ekta creator program chalachhi — apnar moto mistri/mason bhaiyeder "
        "asol site video lagbe. {offer} Interested hole reply korun, amra details pathiye dibo."
    ),
}

# Fallback for anything unmapped or where regional confidence is low --
# Hindi is understood across almost all of this creator base regardless
# of home state (confirmed by the raw captions in this exact dataset).
DEFAULT_LANGUAGE = "Hindi"

# Source-hashtag -> friendly niche phrase used inside the message.
# This map IS vertical-specific (construction/mistri) -- swap this file
# per client when the creator niche changes (e.g. food, fashion, fitness).
NICHE_PHRASE = {
    "tilesfitting": "tiles fitting",
    "tilesmistri": "tiles mistri",
    "civilcontractor": "civil construction",
    "masonwork": "mason/mistri",
    "gharkakaam": "ghar ka construction",
    "rajmistri": "raj mistri",
    "mistrikam": "mistri kaam",
}
DEFAULT_NICHE_PHRASE = "construction/mistri"


def render_message(language, name, niche_key, brand, offer):
    lang = language if language in TEMPLATES else DEFAULT_LANGUAGE
    niche = NICHE_PHRASE.get(niche_key, DEFAULT_NICHE_PHRASE)
    first_name = (name or "").split()[0] if name else "Bhai"
    return TEMPLATES[lang].format(name=first_name, niche=niche, brand=brand, offer=offer)
