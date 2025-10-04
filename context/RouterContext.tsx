import React, { createContext, useContext, useEffect, useState } from "react";
import type { Page } from "../App";

interface RouterContextType {
  currentPage: Page;
  navigateTo: (page: Page, state?: any) => void;
  goBack: () => void;
  getPageFromURL: () => Page;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentPage, setCurrentPage] = useState<Page>(() => getPageFromURL());

  function getPageFromURL(): Page {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // Handle specific routes
    switch (path) {
      case "/":
      case "/home":
        return "home";
      case "/menu":
        return "menu";
      case "/checkout":
        return "checkout";
      case "/profile":
        return "profile";
      case "/login":
        return "login";
      case "/otp":
        return "otp";
      case "/confirmation":
        return "confirmation";
      default:
        // Handle payment confirmation URLs
        if (searchParams.has("Authority") || searchParams.has("success")) {
          return "confirmation";
        }
        return "home";
    }
  }

  const navigateTo = (page: Page, state?: any) => {
    const url = page === "home" ? "/" : `/${page}`;

    // Update browser history
    if (window.location.pathname !== url) {
      window.history.pushState(state, "", url);
    }

    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    window.history.back();
  };

  // Handle browser back/forward buttons and initial load
  useEffect(() => {
    const handlePopState = () => {
      const pageFromURL = getPageFromURL();
      setCurrentPage(pageFromURL);
    };

    // Handle initial page load
    const initialPage = getPageFromURL();
    if (initialPage !== currentPage) {
      setCurrentPage(initialPage);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const value = {
    currentPage,
    navigateTo,
    goBack,
    getPageFromURL,
  };

  return (
    <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (context === undefined) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
};
