import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface MobileSearchContextType {
  /** Current page-scoped search query from global search */
  query: string;
  setQuery: (q: string) => void;
  /** Current page context for placeholder/filtering */
  pageContext: "assets" | "team" | "calendar" | "general";
  setPageContext: (ctx: "assets" | "team" | "calendar" | "general") => void;
}

const MobileSearchContext = createContext<MobileSearchContextType>({
  query: "",
  setQuery: () => {},
  pageContext: "general",
  setPageContext: () => {},
});

export const useMobileSearch = () => useContext(MobileSearchContext);

export const MobileSearchProvider = ({ children }: { children: ReactNode }) => {
  const [query, setQueryState] = useState("");
  const [pageContext, setPageContext] = useState<MobileSearchContextType["pageContext"]>("general");

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  return (
    <MobileSearchContext.Provider value={{ query, setQuery, pageContext, setPageContext }}>
      {children}
    </MobileSearchContext.Provider>
  );
};
