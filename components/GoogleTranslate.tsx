"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export default function GoogleTranslate() {
  useEffect(() => {
    // Inject the init function
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "th",
          includedLanguages: "th,en,zh-CN,ja,ko",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    // Inject script if not already there
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      // Script already loaded, just re-init
      window.googleTranslateElementInit?.();
    }
  }, []);

  return (
    <>
      <style>{`
        /* Hide Google branding bar at the top */
        .goog-te-banner-frame { display: none !important; }
        body { top: 0 !important; }
        
        /* Style the dropdown */
        #google_translate_element .goog-te-gadget-simple {
          background: transparent !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          font-size: 12px !important;
          cursor: pointer !important;
        }
        #google_translate_element .goog-te-gadget-simple .goog-te-menu-value {
          color: inherit !important;
        }
        #google_translate_element .goog-te-gadget-simple .goog-te-menu-value span {
          color: inherit !important;
        }
        #google_translate_element img {
          display: none !important;
        }
      `}</style>
      <div id="google_translate_element" />
    </>
  );
}
