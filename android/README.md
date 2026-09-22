# অভ্যাস — Android Native Shell (Capacitor)

এই ফোল্ডারটি অভ্যাসের **হাইব্রিড আর্কিটেকচারের** native অংশ। ওয়েব অ্যাপ (Next.js)
একমাত্র UI কোডবেস থেকে যায় এবং Coolify-তে ডিপ্লয় হয় — Android shell সেই লাইভ
সাইটটাই WebView-এ লোড করে। ফলে:

- ওয়েবে রিলিজ গেলে অ্যাপে **সাথে সাথে** নতুন ফিচার চলে আসে (অ্যাপ-আপডেট লাগে না),
- আর একই সাথে native plugin-গুলো ব্রাউজারে অসম্ভব যে **OS-লেভেল ক্ষমতা** দেয় —
  যেমন ফোকাস মোডের ফোন-জুড়ে Do Not Disturb — সেগুলো Android-এ কাজ করে।

## ফোকাস মোড কীভাবে কাজ কর (ফোনের সব নোটিফিকেশন বন্ধ)

অ্যাপের ডানদিকে সবসময় একটি **ভাসমান বাটন** থাকে। চাপ দিলে:

1. প্রথমবার Android একটি সিস্টেম স্ক্রিন খোলে — *"Do Not Disturb access"* —
   সেখানে **অভ্যাস** অ্যাপটি খুঁজে অনুমতি দিতে হয় (একবারই)।
2. এরপর বাটনে চাপ দিলেই Android-এর `INTERRUPTION_FILTER_NONE` (total silence)
   চালু হয় — **সব অ্যাপের** নোটিফিকেশন (WhatsApp, Messenger, Facebook…),
   কলের রিং, স্ক্রিন-জ্বলা — সব বন্ধ।
3. আবার চাপ দিলে ফোন ঠিক আগের অবস্থায় ফিরে যায়।

**গোপনীয়তা:** এই অনুমতি দিয়ে অ্যাপ কখনোই নোটিফিকেশনের বিষয়বস্তু পড়তে
পারে না — শুধু বন্ধ/চালু করার সুইচ হিসেবে কাজ করে। নোটিফিকেশন কখনো অ্যাপে
আসেই না।

সংশ্লিষ্ট কোড: `app/src/main/java/bd/abhyas/app/FocusModePlugin.java`
(JS সাইড: `src/lib/native/focus-plugin.ts`, বাটন: `src/components/focus/floating-focus-button.tsx`)

## বিল্ড করা (একবারই দরকার)

### দরকারি সফটওয়্যার

| টুল | ভার্সন |
|---|---|
| Android Studio | Hedgehog বা নতুন (Ladybug+ ভালো) |
| JDK | 21 |
| Android SDK | API 36 (compileSdk/targetSdk), minSdk 24 |
| Node/Bun | রিপো রুটে `bun install` চালানোর জন্য |

### ধাপ

```bash
# ১. রিপো রুট থেকে
bun install

# ২. (যদি ডোমেইন ডিফল্টটির থেকে আলাদা হয়) — capacitor.config.ts-এর
#    SERVER_URL ওভাররাইড করে সিঙ্ক করুন:
CAP_SERVER_URL=https://your-domain.com bunx cap sync android

# ৩. Android প্রজেক্ট ওপেন করে বিল্ড/রান:
bunx cap open android
# Android Studio-তে: Run ▶ (বা Build > Build Bundle(s)/APK(s) > Build APK(s))
```

> **গুরুত্বপূর্ণ:** `server.url` APK-র ভেতরে বেকড হয়ে যায়। ডোমেইন বদলালে
> `bunx cap sync android` চালিয়ে নতুন APK বিল্ড করতে হবে। ওয়েব কোড বদলালে
> কিছুই করতে হয় না — শুধু Coolify-তে push করলেই হয়।

### ডিফল্ট সার্ভার URL

`https://abhyas.ailearnersbd.com` (Coolify ডিপ্লয়মেন্ট)। ভুল থাকলে
`capacitor.config.ts` ঠিক করে `bunx cap sync android` চালান।

## আইকন / স্প্ল্যাশ রি-জেনারেট

ব্র্যান্ড বদলালে রিপো রুট থেকে:

```bash
bun scripts/generate-native-assets.mjs
```

## রোডম্যাপ (পরবর্তী native ফিচার — একই প্যাটার্নে)

- **সোশ্যাল অ্যাপের দৈনিক সময়-বাজেট**: `UsageStatsManager` +
  `PACKAGE_USAGE_STATS` অনুমতি — ইউজার নির্ধারিত সময়ের বেশি Facebook/YouTube
  ব্যবহার করলে অভ্যাসে ফিরিয়ে আনা + অনুপ্রেরণামূলক মেসেজ।
- **অ্যাপ-ব্লকিং / ফোর্সড সুইচ-ব্যাক**: ফোকাস সেশন চলাকালীন ডিস্ট্রাক্টিং
  অ্যাপ থেকে বের করে আনা (AccessibilityService / Device Owner মোড)।

প্রতিটি ফিচারই একই নীতি মানবে: **স্পষ্ট ইউজার-অনুমতি, সৎ স্ট্যাটাস, নম্র
ডিগ্রেডেশন।**

## iOS?

Capacitor থাকায় iOS পরে যোগ করা সহজ (`bunx cap add ios` + Xcode) — ওয়েব কোডে
কোনো পরিবর্তন লাগবে না। তবে বর্তমান টার্গেট Android (বাংলাদেশের বাজার)।
