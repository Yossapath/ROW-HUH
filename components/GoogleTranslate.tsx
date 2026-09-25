"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export default function GoogleTranslate() {
  const [currentLang, setCurrentLang] = useState("th");

  useEffect(() => {
    // Check current language from Google's cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };
    
    const googtrans = getCookie("googtrans");
    if (googtrans && typeof googtrans === "string") {
      if (googtrans.endsWith("/en")) setCurrentLang("en");
      else setCurrentLang("th");
    }

    // Inject the init function
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "th",
          includedLanguages: "th,en",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    // Inject script if not already there
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      window.googleTranslateElementInit?.();
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = currentLang === "th" ? "en" : "th";
    
    // Find Google's hidden select and trigger change
    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (select) {
      select.value = newLang;
      select.dispatchEvent(new Event("change"));
      setCurrentLang(newLang);
    } else {
      // Fallback: set cookie and reload
      document.cookie = `googtrans=/th/${newLang}; path=/`;
      window.location.reload();
    }
  };

  return (
    <>
      <style>{`
        /* Hide ALL Google Translate branding and widget */
        #google_translate_element { display: none !important; }
        .goog-te-banner-frame { display: none !important; }
        .skiptranslate > iframe.goog-te-banner-frame { display: none !important; }
        body { top: 0px !important; position: relative !important; }
        
        /* Hide tooltips */
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        #goog-gt-tt { display: none !important; }
      `}</style>
      
      {/* Hidden container for Google to inject its dropdown */}
      <div id="google_translate_element" />

      {/* Our Custom Toggle Button */}
      <button 
        onClick={toggleLanguage}
        className="flex items-center justify-center font-bold text-[11px] rounded-lg px-2.5 py-1.5 transition-all bg-slate-100 dark:bg-[#272C38] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2D3342] border border-slate-200 dark:border-slate-700 shadow-sm"
      >
        <span className={currentLang === "th" ? "text-[#0b3d63] dark:text-[#3B66D1] font-black scale-110 transition-transform" : "opacity-60"}>TH</span>
        <span className="mx-1.5 text-slate-300 dark:text-slate-600">|</span>
        <span className={currentLang === "en" ? "text-[#0b3d63] dark:text-[#3B66D1] font-black scale-110 transition-transform" : "opacity-60"}>EN</span>
      </button>
    </>
  );
}
